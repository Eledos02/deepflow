"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AudioSettings } from "@/components/product/audio-settings";
import {
  PauseIcon,
  PlayIcon,
  VolumeIcon,
} from "@/components/ui/icons";
import { getBackgroundSound } from "@/features/timer/audio-catalog";
import {
  getActiveFloatingTimer,
  getFloatingTimerMeta,
  getFloatingTimerReturnPath,
  shouldNavigateFromMiniPlayerClick,
  shouldShowFloatingMiniPlayer,
  type FloatingTimerSnapshot,
} from "@/features/timer/floating-mini-player";
import {
  getLocalDateKey,
  inferFocusCategory,
} from "@/features/timer/session-journal";
import { shouldCountAsFocusSession } from "@/features/timer/timer-session";
import {
  readAllTimerStates,
  TIMER_STATE_UPDATED_EVENT,
  writeTimerState,
} from "@/features/timer/timer-storage";
import {
  requestTimerNotificationPermission,
  showTimerCompletionNotification,
} from "@/features/timer/timer-notifications";
import { useAudioPreferences } from "@/features/timer/use-audio-preferences";
import { useTimerAnalytics } from "@/features/timer/use-timer-analytics";
import { trackTimerEvent } from "@/lib/analytics";
import { formatDuration } from "@/lib/format";

type TimerPanelVisibility = {
  hasPanel: boolean;
  isVisible: boolean;
};

const MINI_PLAYER_EXIT_MS = 220;

function createFallbackSessionId(storageKey: string) {
  return `floating-${storageKey}-${Date.now()}`;
}

function getCurrentRemaining(timer: FloatingTimerSnapshot) {
  if (timer.status !== "running" || timer.deadlineMs === null) {
    return timer.remainingSeconds;
  }

  return Math.max(0, Math.ceil((timer.deadlineMs - Date.now()) / 1000));
}

export function FloatingMiniPlayer() {
  const router = useRouter();
  const pathname = usePathname();
  const [snapshots, setSnapshots] = useState(() => readAllTimerStates());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [dismissedSessionId, setDismissedSessionId] = useState<string | null>(
    null,
  );
  const [panelVisibility, setPanelVisibility] =
    useState<TimerPanelVisibility>({
      hasPanel: false,
      isVisible: false,
    });
  const [isRendered, setIsRendered] = useState(false);
  const completedSessionRef = useRef<string | null>(null);

  const {
    alarmSoundId,
    audioError,
    backgroundSoundId,
    pauseBackground,
    playAlarm,
    playBackground,
    previewing,
    selectAlarmSound,
    selectBackgroundSound,
    setVolume,
    stopBackground,
    stopPreview,
    togglePreview,
    volume,
  } = useAudioPreferences();
  const { recordSession } = useTimerAnalytics();

  const activeTimer = useMemo(
    () => getActiveFloatingTimer(snapshots, nowMs),
    [nowMs, snapshots],
  );
  const activeSessionId = activeTimer?.sessionId ?? null;
  const timerMeta = activeTimer
    ? getFloatingTimerMeta(activeTimer.storageKey, activeTimer.totalSeconds)
    : null;
  const remainingSeconds = activeTimer
    ? getCurrentRemaining(activeTimer)
    : 0;
  const durationMinutes = activeTimer
    ? Math.max(1, Math.round(activeTimer.totalSeconds / 60))
    : 0;
  const isRunning = activeTimer?.status === "running";
  const selectedAmbience = getBackgroundSound(backgroundSoundId);
  const shouldShow = shouldShowFloatingMiniPlayer({
    activeSessionId,
    dismissedSessionId,
    isMainTimerVisible: panelVisibility.isVisible,
  });

  const refreshTimers = useCallback(() => {
    setSnapshots(readAllTimerStates());
  }, []);

  const completeActiveTimer = useCallback(
    (timer: FloatingTimerSnapshot) => {
      const sessionId =
        timer.sessionId ?? createFallbackSessionId(timer.storageKey);
      if (completedSessionRef.current === sessionId) return;
      completedSessionRef.current = sessionId;

      const completedAtMs = timer.deadlineMs ?? Date.now();
      const meta = getFloatingTimerMeta(timer.storageKey, timer.totalSeconds);
      const countsAsFocus = shouldCountAsFocusSession(
        meta.timerKind,
        timer.totalSeconds,
      );
      const taskName = timer.taskName?.trim();
      const completedDurationMinutes = Math.max(
        1,
        Math.round(timer.totalSeconds / 60),
      );

      writeTimerState(
        timer.storageKey,
        {
          version: 1,
          totalSeconds: timer.totalSeconds,
          remainingSeconds: 0,
          status: "completed",
          deadlineMs: null,
          sessionId,
          sourcePath: timer.sourcePath ?? meta.path,
          taskName: timer.taskName,
          updatedAtMs: completedAtMs,
        },
        { source: "floating-mini-player" },
      );

      stopPreview();
      stopBackground();
      void playAlarm();
      showTimerCompletionNotification(timer.totalSeconds, taskName);
      trackTimerEvent("timer_complete", completedDurationMinutes);
      recordSession({
        id: sessionId,
        completedAtMs,
        completedDate: getLocalDateKey(completedAtMs),
        durationSeconds: timer.totalSeconds,
        timerKind: meta.timerKind,
        countsAsFocus,
        path: meta.path,
        taskName,
        timerType: meta.label,
        category: countsAsFocus ? inferFocusCategory(taskName) : undefined,
      });

      if (countsAsFocus) {
        trackTimerEvent("focus_session_complete", completedDurationMinutes);
      }

      refreshTimers();
    },
    [
      playAlarm,
      recordSession,
      refreshTimers,
      stopBackground,
      stopPreview,
    ],
  );

  useEffect(() => {
    const refreshTimerId = window.setTimeout(refreshTimers, 0);

    const handleTimerStateUpdated = () => refreshTimers();
    const handleStorage = (event: StorageEvent) => {
      if (!event.key?.startsWith("deepflow:timer-state:v1")) return;
      refreshTimers();
    };

    window.addEventListener(TIMER_STATE_UPDATED_EVENT, handleTimerStateUpdated);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearTimeout(refreshTimerId);
      window.removeEventListener(
        TIMER_STATE_UPDATED_EVENT,
        handleTimerStateUpdated,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshTimers]);

  useEffect(() => {
    const tickId = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(tickId);
  }, []);

  useEffect(() => {
    let intersectionObserver: IntersectionObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let frameId = 0;
    const visiblePanels = new Map<Element, boolean>();

    const updateVisibility = () => {
      const panels = Array.from(document.querySelectorAll(".timer-panel"));

      intersectionObserver?.disconnect();
      visiblePanels.clear();

      if (panels.length === 0) {
        setPanelVisibility({ hasPanel: false, isVisible: false });
        return;
      }

      setPanelVisibility((current) => ({
        hasPanel: true,
        isVisible: current.isVisible,
      }));

      intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            visiblePanels.set(
              entry.target,
              entry.isIntersecting && entry.intersectionRatio > 0.18,
            );
          }

          setPanelVisibility({
            hasPanel: true,
            isVisible: panels.some((panel) => visiblePanels.get(panel)),
          });
        },
        { threshold: [0, 0.18, 0.4, 0.75] },
      );

      for (const panel of panels) {
        visiblePanels.set(panel, false);
        intersectionObserver.observe(panel);
      }
    };

    frameId = window.requestAnimationFrame(updateVisibility);
    mutationObserver = new MutationObserver(() => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateVisibility);
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      intersectionObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    if (!panelVisibility.isVisible) return;

    const resetId = window.setTimeout(() => {
      setDismissedSessionId(null);
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [panelVisibility.isVisible]);

  useEffect(() => {
    if (!activeSessionId || activeSessionId === dismissedSessionId) return;

    const resetId = window.setTimeout(() => {
      setDismissedSessionId(null);
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [activeSessionId, dismissedSessionId]);

  useEffect(() => {
    if (!activeTimer || activeTimer.status !== "running") return;
    if (remainingSeconds > 0) return;
    completeActiveTimer(activeTimer);
  }, [activeTimer, completeActiveTimer, remainingSeconds]);

  useEffect(() => {
    if (!activeTimer || panelVisibility.hasPanel) return;

    if (activeTimer.status === "running") {
      void playBackground();
      return;
    }

    pauseBackground();
  }, [
    activeTimer,
    backgroundSoundId,
    panelVisibility.hasPanel,
    pauseBackground,
    playBackground,
  ]);

  useEffect(() => {
    if (shouldShow) {
      const showId = window.setTimeout(() => {
        setIsRendered(true);
      }, 0);
      return () => window.clearTimeout(showId);
    }

    const timeoutId = window.setTimeout(
      () => setIsRendered(false),
      MINI_PLAYER_EXIT_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [shouldShow]);

  if (!isRendered || !activeTimer || !timerMeta) return null;

  const handlePauseResume = () => {
    if (activeTimer.status === "running") {
      const nextRemaining = getCurrentRemaining(activeTimer);

      if (nextRemaining === 0) {
        completeActiveTimer(activeTimer);
        return;
      }

      trackTimerEvent("timer_pause", durationMinutes);
      pauseBackground();
      writeTimerState(
        activeTimer.storageKey,
        {
          ...activeTimer,
          remainingSeconds: nextRemaining,
          status: "paused",
          deadlineMs: null,
          updatedAtMs: Date.now(),
        },
        { source: "floating-mini-player" },
      );
      return;
    }

    void requestTimerNotificationPermission();
    stopPreview();
    void playBackground();
    writeTimerState(
      activeTimer.storageKey,
      {
        ...activeTimer,
        deadlineMs: Date.now() + activeTimer.remainingSeconds * 1000,
        status: "running",
        updatedAtMs: Date.now(),
      },
      { source: "floating-mini-player" },
    );
  };

  const returnPath = getFloatingTimerReturnPath(activeTimer);
  const handleReturnToSession = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!shouldNavigateFromMiniPlayerClick(event.target)) return;
    router.push(returnPath);
  };

  return (
    <aside
      aria-label="Active DeepFlow timer"
      className="floating-mini-player"
      data-visible={shouldShow}
    >
      <div
        aria-label={`Return to active session at ${returnPath}`}
        className="floating-mini-player__body"
        onClick={handleReturnToSession}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          router.push(returnPath);
        }}
        role="button"
        tabIndex={0}
      >
        <div>
          <p className="floating-mini-player__eyebrow">
            {isRunning ? "Session running" : "Session paused"}
          </p>
          <p className="floating-mini-player__time">
            {formatDuration(remainingSeconds)}
            <span> remaining</span>
          </p>
          <p className="floating-mini-player__meta">
            {timerMeta.label}
            <span aria-hidden="true"> • </span>
            <VolumeIcon width={14} height={14} />
            {selectedAmbience?.label ?? "No ambience"}
          </p>
          <p className="floating-mini-player__hint">Return to session</p>
        </div>
        <button
          aria-label="Dismiss mini player"
          className="floating-mini-player__close"
          onClick={() =>
            setDismissedSessionId(
              activeTimer.sessionId ?? activeTimer.storageKey,
            )
          }
          type="button"
        >
          ×
        </button>
      </div>

      <div className="floating-mini-player__controls">
        <button
          className="floating-mini-player__button floating-mini-player__button--primary"
          onClick={handlePauseResume}
          type="button"
        >
          {isRunning ? <PauseIcon /> : <PlayIcon />}
          {isRunning ? "Pause" : "Resume"}
        </button>
        <AudioSettings
          alarmSoundId={alarmSoundId}
          audioError={audioError}
          backgroundSoundId={backgroundSoundId}
          onAlarmChange={selectAlarmSound}
          onBackgroundChange={(id) => selectBackgroundSound(id, isRunning)}
          onPreview={(kind) => void togglePreview(kind)}
          onVolumeChange={setVolume}
          previewing={previewing}
          volume={volume}
        />
      </div>
    </aside>
  );
}

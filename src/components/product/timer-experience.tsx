"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { AudioSettings } from "@/components/product/audio-settings";
import {
  PauseIcon,
  PlayIcon,
  ResetIcon,
} from "@/components/ui/icons";
import { getTimerPath, isConfiguredTimer, timers } from "@/config/timers";
import type { TimerTool } from "@/content/timer-tools";
import {
  getLocalDateKey,
  inferFocusCategory,
} from "@/features/timer/session-journal";
import { getProgress } from "@/features/timer/timer-engine";
import {
  requestTimerNotificationPermission,
  showTimerCompletionNotification,
} from "@/features/timer/timer-notifications";
import { shouldCountAsFocusSession } from "@/features/timer/timer-session";
import type { TimerSessionHistoryEntry } from "@/features/timer/timer-stats";
import { useTimer } from "@/features/timer/use-timer";
import { useTimerAnalytics } from "@/features/timer/use-timer-analytics";
import { useTimerPreferences } from "@/features/timer/use-timer-preferences";
import { useAudioPreferences } from "@/features/timer/use-audio-preferences";
import { trackTimerEvent } from "@/lib/analytics";
import { formatCompactDuration, formatDuration } from "@/lib/format";

type TimerExperienceProps = {
  tool: TimerTool;
  initialMinutes?: number;
  compactHeading?: string;
  showIntention?: boolean;
  showUpgradePrompt?: boolean;
};

type TimerOption = {
  label: string;
  minutes: number;
};

type RecentSessionGroup = {
  label: string;
  entries: TimerSessionHistoryEntry[];
};

function getOptions(tool: TimerTool, initialMinutes?: number): TimerOption[] {
  if (tool.kind === "pomodoro") {
    return [
      { label: "Focus", minutes: 25 },
      { label: "Short break", minutes: 5 },
      { label: "Long break", minutes: 15 },
    ];
  }

  if (tool.kind === "countdown" && initialMinutes !== undefined) {
    return timers.map((minutes) => ({
      label: `${minutes} min`,
      minutes,
    }));
  }

  const presets =
    initialMinutes && !tool.presets.includes(initialMinutes)
      ? [initialMinutes, ...tool.presets]
      : tool.presets;

  return presets.map((minutes) => ({
    label: `${minutes} min`,
    minutes,
  }));
}

function getLocalDateKeyFromIso(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHistoryGroupLabel(dateKey: string, nowMs: number) {
  const todayKey = getLocalDateKeyFromIso(new Date(nowMs).toISOString());
  const yesterday = new Date(nowMs);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKeyFromIso(yesterday.toISOString());

  if (dateKey === todayKey) return "Today";
  if (dateKey === yesterdayKey) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function groupRecentSessions(
  sessionHistory: TimerSessionHistoryEntry[],
  nowMs: number,
): RecentSessionGroup[] {
  const groups = new Map<string, TimerSessionHistoryEntry[]>();

  for (const entry of sessionHistory.slice(0, 8)) {
    const dateKey = getLocalDateKeyFromIso(entry.completedAt);
    groups.set(dateKey, [...(groups.get(dateKey) ?? []), entry]);
  }

  return [...groups.entries()].map(([dateKey, entries]) => ({
    label: formatHistoryGroupLabel(dateKey, nowMs),
    entries,
  }));
}

function getTimerTypeLabel(
  timerKind: TimerTool["kind"],
  shortTitle: string,
  activeMinutes: number,
) {
  if (timerKind === "countdown") {
    if (activeMinutes >= 60) return "Deep Work Timer";
    return "Focus Timer";
  }
  if (timerKind === "pomodoro" && activeMinutes !== 25) {
    return "Pomodoro";
  }
  if (timerKind === "pomodoro") return "Pomodoro";

  if (shortTitle.toLowerCase().includes("study")) return "Study Timer";
  if (activeMinutes >= 60) return "Deep Work Timer";
  return "Focus Timer";
}

function getFriendlyTimerTypeLabel(entry: TimerSessionHistoryEntry) {
  const label = entry.timerType.trim().toLowerCase();

  if (label.includes("study")) return "Study Timer";
  if (label.includes("pomodoro") || label.includes("break")) return "Pomodoro";
  if (label.includes("deep work")) return "Deep Work Timer";
  if (entry.durationMinutes >= 60) return "Deep Work Timer";
  return "Focus Timer";
}

export function TimerExperience({
  tool,
  initialMinutes,
  compactHeading,
  showIntention = false,
  showUpgradePrompt = false,
}: TimerExperienceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [historyNowMs, setHistoryNowMs] = useState(() => Date.now());
  const [scrollIndicatorStyle, setScrollIndicatorStyle] =
    useState<CSSProperties>({});
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const activeOptionRef = useRef<HTMLButtonElement | null>(null);
  const options = useMemo(
    () => getOptions(tool, initialMinutes),
    [initialMinutes, tool],
  );
  const startingMinutes = initialMinutes ?? tool.defaultMinutes;
  const intentionId = useId();
  const storageKey = useMemo(
    () =>
      initialMinutes !== undefined
        ? `duration:${initialMinutes}`
        : `tool:${tool.slug}`,
    [initialMinutes, tool.slug],
  );
  const { intention, setIntention } = useTimerPreferences(storageKey);
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
  const {
    currentStreak,
    focusMinutesToday,
    recordSession,
    sessionHistory,
    sessionsToday,
    totalSessions,
  } = useTimerAnalytics();

  const handleComplete = useCallback((completion: {
    sessionId: string;
    durationSeconds: number;
    completedAtMs: number;
    taskName?: string;
  }) => {
    const countsAsFocus = shouldCountAsFocusSession(
      tool.kind,
      completion.durationSeconds,
    );
    const taskName = completion.taskName?.trim();
    const durationMinutes = Math.max(
      1,
      Math.round(completion.durationSeconds / 60),
    );

    stopPreview();
    stopBackground();
    void playAlarm();
    showTimerCompletionNotification(completion.durationSeconds, taskName);
    trackTimerEvent("timer_complete", durationMinutes);
    recordSession({
      id: completion.sessionId,
      completedAtMs: completion.completedAtMs,
      completedDate: getLocalDateKey(completion.completedAtMs),
      durationSeconds: completion.durationSeconds,
      timerKind: tool.kind,
      countsAsFocus,
      path: pathname,
      taskName,
      timerType: getTimerTypeLabel(
        tool.kind,
        tool.shortTitle,
        durationMinutes,
      ),
      category: countsAsFocus ? inferFocusCategory(taskName) : undefined,
    });

    if (countsAsFocus) {
      trackTimerEvent("focus_session_complete", durationMinutes);
      setIntention("");
    }
  }, [
    playAlarm,
    recordSession,
    setIntention,
    stopBackground,
    stopPreview,
    pathname,
    tool.kind,
    tool.shortTitle,
  ]);

  const timer = useTimer({
    initialSeconds: startingMinutes * 60,
    storageKey,
    sourcePath: pathname,
    onComplete: handleComplete,
  });

  const activeMinutes = timer.hydrated
    ? Math.max(1, Math.round(timer.totalSeconds / 60))
    : startingMinutes;
  const activeOptionIndex = Math.max(
    0,
    options.findIndex((option) => option.minutes === activeMinutes),
  );
  const recentSessionGroups = useMemo(
    () => groupRecentSessions(sessionHistory, historyNowMs),
    [historyNowMs, sessionHistory],
  );
  const progress = getProgress(timer.remainingSeconds, timer.totalSeconds);
  const isRunning = timer.status === "running";
  const isDurationLandingSelector =
    tool.kind === "countdown" && initialMinutes !== undefined;
  const defaultLabel =
    tool.kind === "pomodoro" && activeMinutes !== 25
      ? "Take a breath"
      : "Current session";
  const timerLabel = intention.trim() || compactHeading || defaultLabel;
  const startLabel = tool.kind === "countdown" ? "Start timer" : "Start focus";

  useEffect(() => {
    if (!isRunning) return;

    const pageTitle = document.title;
    document.title = `${formatDuration(timer.remainingSeconds)} - ${tool.shortTitle}`;

    return () => {
      document.title = pageTitle;
    };
  }, [compactHeading, isRunning, timer.remainingSeconds, tool.shortTitle]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setHistoryNowMs(Date.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isDurationLandingSelector) return;
    const activeOption = activeOptionRef.current;
    if (!activeOption) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    activeOption.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeMinutes, isDurationLandingSelector]);

  useEffect(() => {
    if (!isDurationLandingSelector) return;

    const updateIndicator = () => {
      const activeOption = activeOptionRef.current;
      if (!activeOption) return;

      setScrollIndicatorStyle({
        "--timer-indicator-width": `${activeOption.offsetWidth}px`,
        "--timer-indicator-x": `${activeOption.offsetLeft}px`,
      } as CSSProperties);
    };

    const animationFrameId = window.requestAnimationFrame(updateIndicator);
    window.addEventListener("resize", updateIndicator);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeMinutes, isDurationLandingSelector]);

  useEffect(() => {
    if (!isDurationLandingSelector) return;
    const optionsElement = optionsRef.current;
    if (!optionsElement) return;

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      optionsElement.scrollLeft += event.deltaY;
    };

    optionsElement.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      optionsElement.removeEventListener("wheel", handleWheel);
    };
  }, [isDurationLandingSelector]);

  const selectDuration = (minutes: number) => {
    if (
      initialMinutes !== undefined &&
      isConfiguredTimer(minutes)
    ) {
      if (minutes === initialMinutes) return;

      stopPreview();
      stopBackground();
      router.push(getTimerPath(minutes), { scroll: false });
      return;
    }

    timer.configure(minutes * 60);
  };

  const handlePrimaryAction = () => {
    if (isRunning) {
      trackTimerEvent("timer_pause", activeMinutes);
      pauseBackground();
      timer.pause();
      return;
    }

    void requestTimerNotificationPermission();
    if (timer.status !== "paused") {
      trackTimerEvent("timer_start", activeMinutes);
    }
    stopPreview();
    void playBackground();
    timer.start(intention);
  };

  const handleReset = () => {
    trackTimerEvent("timer_reset", activeMinutes);
    stopBackground();
    timer.reset();
  };

  const ringStyle = {
    "--timer-progress": `${progress * 360}deg`,
  } as CSSProperties;
  const optionsStyle = {
    "--timer-option-count": options.length,
    "--timer-option-index": activeOptionIndex,
    ...scrollIndicatorStyle,
  } as CSSProperties;

  return (
    <section
      aria-label={`${tool.shortTitle} timer`}
      className="timer-panel"
      data-has-intention={Boolean(intention.trim())}
      data-status={timer.status}
    >
      <div className="timer-panel__topline">
        <span className="live-indicator" role="status" aria-live="polite">
          <span className="live-indicator__dot" />
          {timer.status === "completed"
            ? "Session complete"
            : isRunning
              ? "Session in progress"
              : "Ready when you are"}
        </span>
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

      <div
        className={
          isDurationLandingSelector
            ? "timer-options timer-options--scroll"
            : "timer-options"
        }
        aria-label="Timer duration"
        ref={optionsRef}
        style={optionsStyle}
      >
        <span className="timer-options__indicator" aria-hidden="true" />
        {options.map((option) => (
          <button
            className="timer-option"
            data-active={activeMinutes === option.minutes}
            disabled={isRunning}
            key={option.label}
            ref={
              activeMinutes === option.minutes
                ? activeOptionRef
                : undefined
            }
            onClick={() => selectDuration(option.minutes)}
            aria-current={
              activeMinutes === option.minutes ? "page" : undefined
            }
            aria-pressed={activeMinutes === option.minutes}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      {showIntention ? (
        <div className="timer-intention">
          <label htmlFor={intentionId}>What will you focus on?</label>
          <input
            disabled={
              timer.status === "running" || timer.status === "paused"
            }
            id={intentionId}
            maxLength={80}
            onChange={(event) => setIntention(event.target.value)}
            placeholder="e.g. Write, study, plan, create..."
            type="text"
            value={intention}
          />
          <small>Saved to your private journal when the session is complete.</small>
        </div>
      ) : null}

      <div
        aria-label="Session progress"
        aria-valuemax={timer.totalSeconds}
        aria-valuemin={0}
        aria-valuenow={timer.totalSeconds - timer.remainingSeconds}
        aria-valuetext={`${formatDuration(timer.remainingSeconds)} remaining`}
        className="timer-ring"
        role="progressbar"
        style={ringStyle}
      >
        <div className="timer-ring__inner">
          <span className="timer-ring__label">{timerLabel}</span>
          <output
            className="timer-display"
            aria-atomic="true"
            aria-live={timer.status === "completed" ? "polite" : "off"}
          >
            {formatDuration(timer.remainingSeconds)}
          </output>
          <span className="timer-ring__status">
            {timer.status === "completed"
              ? "Nicely done"
              : `${activeMinutes} minute block`}
          </span>
        </div>
      </div>

      <div className="timer-controls">
        <button
          className="timer-button timer-button--primary"
          onClick={handlePrimaryAction}
          type="button"
        >
          {isRunning ? <PauseIcon /> : <PlayIcon />}
          {isRunning
            ? "Pause"
            : timer.status === "paused"
              ? "Resume"
              : timer.status === "completed"
                ? "Start again"
                : startLabel}
        </button>
        <button
          className="timer-button timer-button--secondary"
          onClick={handleReset}
          type="button"
        >
          <ResetIcon />
          Reset
        </button>
      </div>

      <div className="timer-metrics" aria-label="Focus statistics">
        <span
          title={`${totalSessions} ${
            totalSessions === 1 ? "session" : "sessions"
          } completed all time`}
        >
          <strong>{sessionsToday}</strong>
          <small>Sessions today</small>
        </span>
        <span>
          <strong>{formatCompactDuration(focusMinutesToday * 60)}</strong>
          <small>Focus time today</small>
        </span>
        <span>
          <strong>{currentStreak}</strong>
          <small>Day streak</small>
        </span>
      </div>
      <div className="recent-sessions" aria-labelledby="recent-sessions-title">
        <h3 id="recent-sessions-title">Recent Sessions</h3>
        {recentSessionGroups.length === 0 ? (
          <p className="recent-sessions__empty">
            Completed timers will appear here.
          </p>
        ) : (
          <div className="recent-sessions__groups">
            {recentSessionGroups.map((group) => (
              <section className="recent-sessions__group" key={group.label}>
                <h4>{group.label}</h4>
                <ul>
                  {group.entries.map((entry) => (
                    <li key={`${entry.completedAt}-${entry.path}`}>
                      <span aria-hidden="true">✓</span>
                      <Link href={entry.path}>
                        {formatCompactDuration(entry.durationMinutes * 60)}
                        {" • "}
                        {getFriendlyTimerTypeLabel(entry)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
      {showUpgradePrompt ? (
        <div className="session-footer">
          <span className="session-storage-note">
            Saved locally on this device
          </span>
          <Link className="session-upgrade-link" href="/pricing">
            Sync with Pro
          </Link>
        </div>
      ) : null}
    </section>
  );
}

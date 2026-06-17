"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useId, useMemo } from "react";

import { AudioSettings } from "@/components/product/audio-settings";
import {
  PauseIcon,
  PlayIcon,
  ResetIcon,
} from "@/components/ui/icons";
import { getTimerPath, isConfiguredTimer } from "@/config/timers";
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

function getOptions(tool: TimerTool, initialMinutes?: number): TimerOption[] {
  if (tool.kind === "pomodoro") {
    return [
      { label: "Focus", minutes: 25 },
      { label: "Short break", minutes: 5 },
      { label: "Long break", minutes: 15 },
    ];
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

export function TimerExperience({
  tool,
  initialMinutes,
  compactHeading,
  showIntention = false,
  showUpgradePrompt = false,
}: TimerExperienceProps) {
  const router = useRouter();
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
    sessionsToday,
    totalSessions,
  } = useTimerAnalytics();

  const handleComplete = useCallback((completion: {
    sessionId: string;
    durationSeconds: number;
    completedAtMs: number;
    taskName?: string;
  }) => {
    const countsAsFocus =
      tool.kind === "focus" ||
      (tool.kind === "pomodoro" &&
        completion.durationSeconds === 25 * 60);
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
      taskName,
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
    tool.kind,
  ]);

  const timer = useTimer({
    initialSeconds: startingMinutes * 60,
    storageKey,
    onComplete: handleComplete,
  });

  const activeMinutes = timer.hydrated
    ? Math.max(1, Math.round(timer.totalSeconds / 60))
    : startingMinutes;
  const progress = getProgress(timer.remainingSeconds, timer.totalSeconds);
  const isRunning = timer.status === "running";
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
          onBackgroundChange={selectBackgroundSound}
          onPreview={(kind) => void togglePreview(kind)}
          onVolumeChange={setVolume}
          previewing={previewing}
          volume={volume}
        />
      </div>

      <div className="timer-options" aria-label="Timer duration">
        {options.map((option) => (
          <button
            className="timer-option"
            data-active={activeMinutes === option.minutes}
            disabled={isRunning}
            key={option.label}
            onClick={() => selectDuration(option.minutes)}
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

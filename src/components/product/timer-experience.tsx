"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useId, useMemo } from "react";

import {
  PauseIcon,
  PlayIcon,
  ResetIcon,
  VolumeIcon,
  VolumeOffIcon,
} from "@/components/ui/icons";
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

function playCompletionTone() {
  const AudioContextClass =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;

  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(523.25, context.currentTime);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.7);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.72);
  oscillator.addEventListener("ended", () => void context.close());
}

export function TimerExperience({
  tool,
  initialMinutes,
  compactHeading,
  showIntention = false,
  showUpgradePrompt = false,
}: TimerExperienceProps) {
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
  const {
    intention,
    setIntention,
    setSoundEnabled,
    soundEnabled,
  } = useTimerPreferences(storageKey);
  const {
    currentStreak,
    focusSecondsToday,
    recordSession,
    sessionsThisWeek,
    sessionsToday,
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

    if (soundEnabled) playCompletionTone();
    showTimerCompletionNotification(completion.durationSeconds, taskName);
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

    if (countsAsFocus) setIntention("");
  }, [recordSession, setIntention, soundEnabled, tool.kind]);

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
    if (!isRunning) {
      document.title = compactHeading
        ? `${compactHeading} | DeepFlow`
        : `${tool.shortTitle} timer | DeepFlow`;
      return;
    }

    document.title = `${formatDuration(timer.remainingSeconds)} - ${tool.shortTitle}`;
  }, [compactHeading, isRunning, timer.remainingSeconds, tool.shortTitle]);

  const selectDuration = (minutes: number) => {
    timer.configure(minutes * 60);
  };

  const handlePrimaryAction = () => {
    if (isRunning) {
      timer.pause();
      return;
    }

    void requestTimerNotificationPermission();
    timer.start(intention);
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
        <button
          aria-pressed={soundEnabled}
          className="sound-toggle"
          onClick={() => setSoundEnabled((current) => !current)}
          type="button"
        >
          {soundEnabled ? (
            <VolumeIcon width={16} height={16} />
          ) : (
            <VolumeOffIcon width={16} height={16} />
          )}
          {soundEnabled ? "Alert on" : "Alert off"}
        </button>
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
            placeholder="e.g. Amazon supplier research"
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
          onClick={timer.reset}
          type="button"
        >
          <ResetIcon />
          Reset
        </button>
      </div>

      <div className="timer-metrics" aria-label="Focus statistics">
        <span
          title={`${sessionsThisWeek} ${
            sessionsThisWeek === 1 ? "session" : "sessions"
          } completed this week`}
        >
          <strong>{sessionsToday}</strong>
          <small>Sessions today</small>
        </span>
        <span>
          <strong>{formatCompactDuration(focusSecondsToday)}</strong>
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

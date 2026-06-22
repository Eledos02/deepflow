"use client";

import { useEffect, useMemo, useState } from "react";

import {
  FOCUS_JOURNAL_STORAGE_KEY,
  FOCUS_JOURNAL_UPDATED_EVENT,
  readFocusJournalEntries,
  type FocusJournalEntry,
} from "@/features/timer/focus-journal";
import {
  TIMER_STATS_UPDATED_EVENT,
  loadStats,
  type TimerStats,
} from "@/features/timer/timer-stats";
import {
  WORKSPACE_WEEKLY_GOAL_STORAGE_KEY,
  WORKSPACE_WEEKLY_GOAL_UPDATED_EVENT,
  calculateWorkspaceGoalProgress,
  readWorkspaceWeeklyGoal,
  saveWorkspaceWeeklyGoal,
  type WorkspaceWeeklyGoal,
} from "@/features/workspace/workspace-metrics";
import {
  calculateWorkspaceAnalytics,
  formatFocusDuration,
  type WeeklyFocusActivity,
} from "@/features/workspace/workspace-analytics";
import { buildWorkspaceFocusIntelligence } from "@/features/workspace/workspace-focus-intelligence";

import { splitReflectionNarrative } from "./reflection-presentation";

function metricValue(value: number, suffix = "") {
  return value > 0 ? `${value}${suffix}` : "0";
}

function normalizeGoalField(value: unknown, fallback: number) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? Math.max(1, Math.round(numericValue))
    : fallback;
}

function formatMomentum(percentChange: number) {
  return `${percentChange > 0 ? "+" : ""}${percentChange}%`;
}

function formatMomentumLabel(
  state: "rising" | "stable" | "slowing",
  hasBaseline: boolean,
) {
  if (!hasBaseline) return "Building baseline";
  if (state === "rising") return "Building Momentum";
  if (state === "slowing") return "Momentum Slowing";
  return "Steady Rhythm";
}

function getPatternValue(value: string | null, sessionCount: number) {
  if (sessionCount === 0) return "Not enough data yet";
  return value ?? "Still learning";
}

function getPatternDescription(value: string | null, sessionCount: number) {
  if (sessionCount < 3 || !value) {
    return "Complete a few more sessions to surface a useful pattern.";
  }

  return "A pattern supported by completed sessions from the current seven days.";
}

function getMomentumDescription(
  percentChange: number,
  hasBaseline: boolean,
) {
  if (!hasBaseline) {
    return "Complete sessions across another week to compare your momentum.";
  }

  return `${formatMomentum(percentChange)} compared with the previous seven days.`;
}

function getRecentAverageSessionValue(
  averageSessionLength: number,
  sessionCount: number,
) {
  return sessionCount === 0
    ? "Still learning"
    : formatFocusDuration(averageSessionLength);
}

function getRecentAverageSessionDescription(sessionCount: number) {
  if (sessionCount === 0) {
    return "Complete a session to begin shaping a recent average.";
  }

  if (sessionCount < 3) {
    return "Based on your first completed sessions.";
  }

  return "Your average session length suggests the kind of focus block that is easiest to repeat.";
}

function WeeklyActivityChart({ activity }: { activity: WeeklyFocusActivity[] }) {
  const highestMinutes = Math.max(...activity.map((day) => day.minutes), 1);
  const totalMinutes = activity.reduce((total, day) => total + day.minutes, 0);

  return (
    <section
      aria-labelledby="weekly-activity-title"
      className="workspace-weekly-activity"
    >
      <div className="workspace-weekly-activity__header">
        <div>
          <span className="eyebrow">Weekly activity</span>
          <h3 id="weekly-activity-title">Your focus rhythm this week.</h3>
        </div>
        <strong>{formatFocusDuration(totalMinutes)}</strong>
      </div>
      <div
        aria-label={`Focus minutes by day this week. ${activity
          .map((day) => `${day.label}: ${day.minutes} minutes`)
          .join(", ")}.`}
        className="workspace-weekly-activity__chart"
        role="img"
      >
        {activity.map((day) => (
          <div className="workspace-weekly-activity__day" key={day.dateKey}>
            <span className="workspace-weekly-activity__value">
              {day.minutes > 0 ? `${day.minutes}m` : "0"}
            </span>
            <div className="workspace-weekly-activity__track">
              <span
                aria-hidden="true"
                className="workspace-weekly-activity__bar"
                data-empty={day.minutes === 0}
                style={{
                  height: `${Math.max((day.minutes / highestMinutes) * 100, 4)}%`,
                }}
              />
            </div>
            <span className="workspace-weekly-activity__label">
              {day.label.slice(0, 3)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function useWorkspaceDashboardData() {
  const [entries, setEntries] = useState<FocusJournalEntry[]>([]);
  const [stats, setStats] = useState<TimerStats>(() => loadStats());
  const [goal, setGoal] = useState<WorkspaceWeeklyGoal>(() =>
    readWorkspaceWeeklyGoal(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => {
      setEntries(readFocusJournalEntries());
      setStats(loadStats());
      setGoal(readWorkspaceWeeklyGoal());
      setHydrated(true);
    };

    const refreshId = window.setTimeout(refresh, 0);
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key !== FOCUS_JOURNAL_STORAGE_KEY &&
        event.key !== WORKSPACE_WEEKLY_GOAL_STORAGE_KEY &&
        event.key !== "deepflow:timer-stats:v1"
      ) {
        return;
      }

      refresh();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(FOCUS_JOURNAL_UPDATED_EVENT, refresh);
    window.addEventListener(TIMER_STATS_UPDATED_EVENT, refresh);
    window.addEventListener(WORKSPACE_WEEKLY_GOAL_UPDATED_EVENT, refresh);

    return () => {
      window.clearTimeout(refreshId);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(FOCUS_JOURNAL_UPDATED_EVENT, refresh);
      window.removeEventListener(TIMER_STATS_UPDATED_EVENT, refresh);
      window.removeEventListener(WORKSPACE_WEEKLY_GOAL_UPDATED_EVENT, refresh);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const analytics = useMemo(
    () => calculateWorkspaceAnalytics(entries, stats, nowMs),
    [entries, nowMs, stats],
  );
  const goalProgress = useMemo(
    () => calculateWorkspaceGoalProgress(entries, goal, nowMs),
    [entries, goal, nowMs],
  );
  const intelligence = useMemo(
    () => buildWorkspaceFocusIntelligence(analytics),
    [analytics],
  );

  return {
    goal,
    goalProgress,
    hydrated,
    analytics,
    intelligence,
    setGoal,
  };
}

function WorkspaceEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="workspace-dashboard-empty">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function WorkspaceOverviewView() {
  const { analytics, hydrated } = useWorkspaceDashboardData();
  const hasData =
    analytics.totalSessions > 0 ||
    analytics.totalFocusMinutes > 0 ||
    analytics.sessionsToday > 0;

  return (
    <section className="workspace-dashboard-card" aria-labelledby="workspace-overview-title">
      <div className="workspace-dashboard-card__header">
        <div>
          <span className="eyebrow">Overview</span>
          <h2 id="workspace-overview-title">Your focus system, at a glance.</h2>
          <p>
            DeepFlow now turns completed sessions into a local picture of your
            attention, streaks, and weekly momentum.
          </p>
        </div>
      </div>

      {!hydrated || !hasData ? (
        <WorkspaceEmptyState
          title="Start your first focus session to build your focus profile."
          description="DeepFlow will turn your completed sessions into a calm, private view of your focus habits."
        />
      ) : (
        <div className="workspace-overview-dashboard">
          <div className="workspace-overview-primary-metrics">
            <article className="workspace-metric-tile">
              <span>Focused time</span>
              <strong>{formatFocusDuration(analytics.totalFocusMinutes)}</strong>
            </article>
            <article className="workspace-metric-tile">
              <span>Sessions completed</span>
              <strong>{metricValue(analytics.totalSessions)}</strong>
            </article>
            <article className="workspace-metric-tile">
              <span>Current streak</span>
              <strong>{metricValue(analytics.currentStreak, "d")}</strong>
            </article>
            <article className="workspace-metric-tile">
              <span>Best streak</span>
              <strong>{metricValue(analytics.bestStreak, "d")}</strong>
            </article>
            <article className="workspace-metric-tile">
              <span>Sessions today</span>
              <strong>{metricValue(analytics.sessionsToday)}</strong>
            </article>
          </div>

          <WeeklyActivityChart activity={analytics.weeklyActivity} />

          <div className="workspace-overview-secondary-metrics">
            <article className="workspace-metric-tile">
              <span>Focus momentum</span>
              <strong>
                {formatMomentumLabel(
                  analytics.momentum.state,
                  analytics.momentum.hasBaseline,
                )}
              </strong>
              <small>
                {analytics.momentum.hasBaseline
                  ? formatMomentum(analytics.momentum.percentChange)
                  : "Building baseline"}
              </small>
            </article>
            <article className="workspace-metric-tile">
              <span>Best day</span>
              <strong>
                {getPatternValue(
                  analytics.bestFocusDay,
                  analytics.focusEntryCount,
                )}
              </strong>
            </article>
            <article className="workspace-metric-tile">
              <span>Best hour</span>
              <strong>
                {getPatternValue(
                  analytics.bestFocusHour,
                  analytics.focusEntryCount,
                )}
              </strong>
            </article>
            <article className="workspace-metric-tile">
              <span>Lifetime average</span>
              <strong>{formatFocusDuration(analytics.averageSessionLength)}</strong>
            </article>
          </div>
        </div>
      )}
    </section>
  );
}

export function WorkspaceGoalsView() {
  const { goal, goalProgress, setGoal } = useWorkspaceDashboardData();
  const [draftGoal, setDraftGoal] = useState<WorkspaceWeeklyGoal>(goal);
  const [isSaved, setIsSaved] = useState(false);
  const isDirty =
    draftGoal.sessions !== goal.sessions || draftGoal.minutes !== goal.minutes;

  useEffect(() => {
    const refreshId = window.setTimeout(() => setDraftGoal(goal), 0);
    return () => window.clearTimeout(refreshId);
  }, [goal]);

  useEffect(() => {
    if (!isSaved) return;

    const resetId = window.setTimeout(() => setIsSaved(false), 1_800);
    return () => window.clearTimeout(resetId);
  }, [isSaved]);

  const saveGoal = () => {
    const nextGoal = {
      sessions: normalizeGoalField(draftGoal.sessions, goal.sessions),
      minutes: normalizeGoalField(draftGoal.minutes, goal.minutes),
    };

    setDraftGoal(nextGoal);
    setGoal(nextGoal);
    saveWorkspaceWeeklyGoal(nextGoal);
    setIsSaved(true);
  };

  return (
    <section className="workspace-dashboard-card" aria-labelledby="workspace-goals-title">
      <div className="workspace-dashboard-card__header workspace-dashboard-card__header--split">
        <div>
          <span className="eyebrow">Goals</span>
          <h2 id="workspace-goals-title">Set a weekly focus target.</h2>
          <p>
            Free local goals keep the week visible without adding pressure or
            account setup.
          </p>
        </div>
        <span className="workspace-dashboard-badge">Stored locally</span>
      </div>

      <div className="workspace-goal-layout">
        <div className="workspace-goal-progress-card">
          <div className="workspace-goal-progress-card__topline">
            <span>Weekly progress</span>
            <strong>{goalProgress.progressPercent}%</strong>
          </div>
          <div
            aria-label={`${goalProgress.progressPercent}% of weekly goal complete`}
            className="workspace-goal-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={goalProgress.progressPercent}
          >
            <span style={{ width: `${goalProgress.progressPercent}%` }} />
          </div>
          <div className="workspace-goal-stats">
            <span>
              {goalProgress.sessionsThisWeek} / {goalProgress.goal.sessions} sessions
            </span>
            <span>
              {formatFocusDuration(goalProgress.focusMinutesThisWeek)} /{" "}
              {formatFocusDuration(goalProgress.goal.minutes)}
            </span>
          </div>
          <p>
            Remaining this week: {goalProgress.remainingSessions} sessions or{" "}
            {formatFocusDuration(goalProgress.remainingMinutes)}.
          </p>
        </div>

        <form
          className="workspace-goal-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isDirty) return;
            saveGoal();
          }}
        >
          <label>
            Weekly sessions
            <input
              min={1}
              name="sessions"
              onChange={(event) => {
                setIsSaved(false);
                setDraftGoal((currentGoal) => ({
                  ...currentGoal,
                  sessions: Number(event.target.value),
                }));
              }}
              type="number"
              value={draftGoal.sessions}
            />
          </label>
          <label>
            Weekly minutes
            <input
              min={1}
              name="minutes"
              onChange={(event) => {
                setIsSaved(false);
                setDraftGoal((currentGoal) => ({
                  ...currentGoal,
                  minutes: Number(event.target.value),
                }));
              }}
              type="number"
              value={draftGoal.minutes}
            />
          </label>
          <button disabled={!isDirty} type="submit">
            {isSaved ? "✓ Saved" : "Save goal"}
          </button>
        </form>
      </div>
    </section>
  );
}

export function WorkspaceInsightsView() {
  const { analytics, hydrated, intelligence } = useWorkspaceDashboardData();
  const hasAnyFocus = hydrated && analytics.totalSessions > 0;

  return (
    <section className="workspace-dashboard-card" aria-labelledby="workspace-insights-title">
      <div className="workspace-dashboard-card__header workspace-dashboard-card__header--split">
        <div>
          <span className="eyebrow">Insights</span>
          <h2 id="workspace-insights-title">A clearer read on your focus rhythm.</h2>
          <p>
            Private, practical patterns from your most recent seven days of
            completed DeepFlow sessions.
          </p>
        </div>
        <span className="workspace-dashboard-badge">Last 7 days</span>
      </div>

      {!hasAnyFocus ? (
        <WorkspaceEmptyState
          title="Start your first focus session to build your focus profile."
          description="Finish a timer and DeepFlow will turn your local session history into useful, private patterns."
        />
      ) : !intelligence.hasRecentFocus ? (
        <WorkspaceEmptyState
          title="Your recent week is still open."
          description="Complete one focused session in the next seven days and DeepFlow will begin shaping a fresh reflection."
        />
      ) : (
        <div className="workspace-intelligence-grid">
          <article className="workspace-intelligence-card">
            <span>Best focus time</span>
            <strong>
              {getPatternValue(
                intelligence.bestFocusTime,
                analytics.recentFocusEntryCount,
              )}
            </strong>
            <p>
              {getPatternDescription(
                intelligence.bestFocusTime,
                analytics.recentFocusEntryCount,
              )}
            </p>
          </article>
          <article className="workspace-intelligence-card">
            <span>Most productive day</span>
            <strong>
              {getPatternValue(
                intelligence.mostProductiveDay,
                analytics.recentFocusEntryCount,
              )}
            </strong>
            <p>
              {getPatternDescription(
                intelligence.mostProductiveDay,
                analytics.recentFocusEntryCount,
              )}
            </p>
          </article>
          <article className="workspace-intelligence-card">
            <span>Focus momentum</span>
            <strong>
              {formatMomentumLabel(
                intelligence.momentum.state,
                intelligence.momentum.hasBaseline,
              )}
            </strong>
            <p>
              {getMomentumDescription(
                intelligence.momentum.percentChange,
                intelligence.momentum.hasBaseline,
              )}
            </p>
          </article>
          <article className="workspace-intelligence-card">
            <span>Session quality</span>
            <strong>{intelligence.sessionQuality?.label ?? "Still learning"}</strong>
            <p>
              {intelligence.sessionQuality?.description ??
                "Your recent sessions are starting to reveal a working rhythm."}
            </p>
          </article>
          <article className="workspace-intelligence-card">
            <span>Focus personality</span>
            <strong>{intelligence.personality?.label ?? "Still learning"}</strong>
            <p>
              {intelligence.personality?.description ??
                "Your focus personality will emerge from a few more completed sessions."}
            </p>
          </article>
          <article className="workspace-intelligence-card workspace-intelligence-card--reflection">
            <span>Weekly reflection</span>
            <strong>{intelligence.reflection?.title}</strong>
            <div className="workspace-reflection-copy">
              {intelligence.reflection
                ? splitReflectionNarrative(intelligence.reflection.description).map(
                    (paragraph) => <p key={paragraph}>{paragraph}</p>,
                  )
                : null}
            </div>
            <div className="workspace-reflection-details" aria-label="Supporting focus details">
              <div>
                <span>Best focus day</span>
                <strong>
                  {getPatternValue(
                    intelligence.mostProductiveDay,
                    analytics.recentFocusEntryCount,
                  )}
                </strong>
              </div>
              <div>
                <span>Best focus time</span>
                <strong>
                  {getPatternValue(
                    intelligence.bestFocusTime,
                    analytics.recentFocusEntryCount,
                  )}
                </strong>
              </div>
              <div>
                <span>Average session</span>
                <strong>
                  {getRecentAverageSessionValue(
                    analytics.averageSessionLengthLastSevenDays,
                    analytics.recentFocusEntryCount,
                  )}
                </strong>
                <small>
                  {getRecentAverageSessionDescription(
                    analytics.recentFocusEntryCount,
                  )}
                </small>
              </div>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

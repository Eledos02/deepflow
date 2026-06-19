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
  calculateWorkspaceMetrics,
  readWorkspaceWeeklyGoal,
  saveWorkspaceWeeklyGoal,
  type WorkspaceWeeklyGoal,
} from "@/features/workspace/workspace-metrics";

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

function metricValue(value: number, suffix = "") {
  return value > 0 ? `${value}${suffix}` : "0";
}

function normalizeGoalField(value: unknown, fallback: number) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? Math.max(1, Math.round(numericValue))
    : fallback;
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

  const metrics = useMemo(
    () => calculateWorkspaceMetrics(entries, stats, nowMs),
    [entries, nowMs, stats],
  );
  const goalProgress = useMemo(
    () => calculateWorkspaceGoalProgress(entries, goal, nowMs),
    [entries, goal, nowMs],
  );

  return {
    entries,
    goal,
    goalProgress,
    hydrated,
    metrics,
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
  const { hydrated, metrics } = useWorkspaceDashboardData();
  const hasData =
    metrics.totalFocusSessions > 0 ||
    metrics.totalFocusMinutes > 0 ||
    metrics.sessionsToday > 0;

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
          title="Your workspace metrics will appear here."
          description="Complete a focus session to start building your local dashboard."
        />
      ) : (
        <div className="workspace-metrics-grid">
          <article className="workspace-metric-tile">
            <span>Total focus sessions</span>
            <strong>{metricValue(metrics.totalFocusSessions)}</strong>
          </article>
          <article className="workspace-metric-tile">
            <span>Total focus time</span>
            <strong>{formatMinutes(metrics.totalFocusMinutes)}</strong>
          </article>
          <article className="workspace-metric-tile">
            <span>Sessions today</span>
            <strong>{metricValue(metrics.sessionsToday)}</strong>
          </article>
          <article className="workspace-metric-tile">
            <span>Current streak</span>
            <strong>{metricValue(metrics.currentStreak, "d")}</strong>
          </article>
          <article className="workspace-metric-tile">
            <span>Best streak</span>
            <strong>{metricValue(metrics.bestStreak, "d")}</strong>
          </article>
          <article className="workspace-metric-tile">
            <span>This week focus time</span>
            <strong>{formatMinutes(metrics.focusMinutesThisWeek)}</strong>
          </article>
          <article className="workspace-metric-tile">
            <span>Average session</span>
            <strong>{formatMinutes(metrics.averageSessionLength)}</strong>
          </article>
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
              {formatMinutes(goalProgress.focusMinutesThisWeek)} /{" "}
              {formatMinutes(goalProgress.goal.minutes)}
            </span>
          </div>
          <p>
            Remaining this week: {goalProgress.remainingSessions} sessions or{" "}
            {formatMinutes(goalProgress.remainingMinutes)}.
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
  const { entries, hydrated, metrics } = useWorkspaceDashboardData();
  const hasInsights = hydrated && entries.length > 0;

  return (
    <section className="workspace-dashboard-card" aria-labelledby="workspace-insights-title">
      <div className="workspace-dashboard-card__header">
        <div>
          <span className="eyebrow">Insights</span>
          <h2 id="workspace-insights-title">Simple signals from your focus history.</h2>
          <p>
            A lightweight read on when you focused, how long you stayed with
            the work, and how your streak is shaping up.
          </p>
        </div>
      </div>

      {!hasInsights ? (
        <WorkspaceEmptyState
          title="Insights need a few completed sessions."
          description="Finish a timer with an intention and DeepFlow will start finding useful patterns."
        />
      ) : (
        <div className="workspace-insights-grid">
          <article>
            <span>Most productive day this week</span>
            <strong>{metrics.mostProductiveDay ?? "No data yet"}</strong>
          </article>
          <article>
            <span>Longest session</span>
            <strong>{formatMinutes(metrics.longestSessionMinutes)}</strong>
          </article>
          <article>
            <span>Average session</span>
            <strong>{formatMinutes(metrics.averageSessionLength)}</strong>
          </article>
          <article>
            <span>Total focus time this week</span>
            <strong>{formatMinutes(metrics.focusMinutesThisWeek)}</strong>
          </article>
          <article>
            <span>Best streak</span>
            <strong>{metricValue(metrics.bestStreak, " days")}</strong>
          </article>
        </div>
      )}
    </section>
  );
}

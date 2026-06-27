"use client";

import { useCallback, useEffect, useState } from "react";

import {
  LOCAL_DATA_SCOPE_CHANGED_EVENT,
  isActiveScopedLocalDataStorageKey,
} from "@/features/sync/local-data-scope";
import {
  readCompletedSessions,
  saveCompletedSession,
  TIMER_ANALYTICS_UPDATED_EVENT,
  type CompletedTimerSession,
} from "@/features/timer/timer-storage";
import {
  completeSession,
  loadStats,
  TIMER_STATS_UPDATED_EVENT,
  type TimerStats,
} from "@/features/timer/timer-stats";
import {
  createFocusJournalEntry,
  saveFocusJournalEntry,
} from "@/features/timer/focus-journal";

const emptyStats: TimerStats = {
  version: 1,
  sessionsToday: 0,
  focusMinutesToday: 0,
  totalSessions: 0,
  totalFocusMinutes: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastCompletedDate: null,
  sessionHistory: [],
};

export function useTimerAnalytics() {
  const [stats, setStats] = useState<TimerStats>(emptyStats);

  const refresh = useCallback(() => {
    setStats(loadStats());
  }, []);

  useEffect(() => {
    const initialRefreshId = window.setTimeout(refresh, 0);

    const handleStorage = (event: StorageEvent) => {
      if (!isActiveScopedLocalDataStorageKey(event.key, [
        "focus_sessions",
        "timer_stats",
      ])) return;
      refresh();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(TIMER_ANALYTICS_UPDATED_EVENT, refresh);
    window.addEventListener(TIMER_STATS_UPDATED_EVENT, refresh);
    window.addEventListener(LOCAL_DATA_SCOPE_CHANGED_EVENT, refresh);
    const intervalId = window.setInterval(refresh, 60_000);

    return () => {
      window.clearTimeout(initialRefreshId);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(TIMER_ANALYTICS_UPDATED_EVENT, refresh);
      window.removeEventListener(TIMER_STATS_UPDATED_EVENT, refresh);
      window.removeEventListener(LOCAL_DATA_SCOPE_CHANGED_EVENT, refresh);
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  const recordSession = useCallback((session: CompletedTimerSession) => {
    const alreadyRecorded = readCompletedSessions().some(
      (existingSession) => existingSession.id === session.id,
    );

    saveCompletedSession(session);
    if (alreadyRecorded) return;

    completeSession({
      durationMinutes: Math.max(1, Math.round(session.durationSeconds / 60)),
      completedAtMs: session.completedAtMs,
      countsAsFocus: session.countsAsFocus,
      path: session.path,
      timerType: session.timerType,
    });

    if (!session.countsAsFocus) return;

    saveFocusJournalEntry(
      createFocusJournalEntry({
        id: session.id,
        intention: session.taskName ?? session.intention ?? "",
        durationMinutes: Math.max(1, Math.round(session.durationSeconds / 60)),
        timerType: session.timerType ?? "Focus Timer",
        completedAt: new Date(session.completedAtMs).toISOString(),
        sourcePath: session.path ?? "/",
        routineId: session.routineId,
        routineName: session.routineName,
      }),
    );
  }, []);

  return {
    ...stats,
    recordSession,
  };
}

"use client";

import { useCallback, useEffect, useState } from "react";

import {
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
      if (
        event.key?.startsWith("deepflow:completed-sessions") ||
        event.key?.startsWith("deepflow:timer-stats")
      ) {
        refresh();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(TIMER_ANALYTICS_UPDATED_EVENT, refresh);
    window.addEventListener(TIMER_STATS_UPDATED_EVENT, refresh);
    const intervalId = window.setInterval(refresh, 60_000);

    return () => {
      window.clearTimeout(initialRefreshId);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(TIMER_ANALYTICS_UPDATED_EVENT, refresh);
      window.removeEventListener(TIMER_STATS_UPDATED_EVENT, refresh);
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  const recordSession = useCallback((session: CompletedTimerSession) => {
    saveCompletedSession(session);
    completeSession({
      durationMinutes: Math.max(1, Math.round(session.durationSeconds / 60)),
      completedAtMs: session.completedAtMs,
      countsAsFocus: session.countsAsFocus,
      path: session.path,
      timerType: session.timerType,
    });
  }, []);

  return {
    ...stats,
    recordSession,
  };
}

"use client";

import { useCallback, useEffect, useState } from "react";

import {
  calculateTimerAnalytics,
  readCompletedSessions,
  saveCompletedSession,
  TIMER_ANALYTICS_UPDATED_EVENT,
  type CompletedTimerSession,
  type TimerAnalytics,
} from "@/features/timer/timer-storage";

const emptyAnalytics: TimerAnalytics = {
  sessionsToday: 0,
  sessionsThisWeek: 0,
  focusSecondsToday: 0,
  currentStreak: 0,
};

export function useTimerAnalytics() {
  const [analytics, setAnalytics] = useState<TimerAnalytics>(emptyAnalytics);

  const refresh = useCallback(() => {
    setAnalytics(calculateTimerAnalytics(readCompletedSessions()));
  }, []);

  useEffect(() => {
    const initialRefreshId = window.setTimeout(refresh, 0);

    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith("deepflow:completed-sessions")) refresh();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(TIMER_ANALYTICS_UPDATED_EVENT, refresh);
    const intervalId = window.setInterval(refresh, 60_000);

    return () => {
      window.clearTimeout(initialRefreshId);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(TIMER_ANALYTICS_UPDATED_EVENT, refresh);
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  const recordSession = useCallback((session: CompletedTimerSession) => {
    saveCompletedSession(session);
  }, []);

  return {
    ...analytics,
    recordSession,
  };
}

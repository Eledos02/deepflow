"use client";

import { useCallback, useEffect, useState } from "react";

import {
  readCompletedSessions,
  TIMER_ANALYTICS_UPDATED_EVENT,
  type CompletedTimerSession,
} from "./timer-storage";

export function useSessionJournal() {
  const [sessions, setSessions] = useState<CompletedTimerSession[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [nowMs, setNowMs] = useState(0);

  const refresh = useCallback(() => {
    setSessions(readCompletedSessions());
    setNowMs(Date.now());
    setHydrated(true);
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

  return { hydrated, nowMs, sessions };
}

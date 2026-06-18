"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getRemainingSeconds } from "@/features/timer/timer-engine";
import {
  getTimerStateStorageKey,
  readTimerState,
  TIMER_STATE_UPDATED_EVENT,
  writeTimerState,
  type PersistedTimerState,
} from "@/features/timer/timer-storage";

export type TimerStatus = "idle" | "running" | "paused" | "completed";

export type TimerCompletion = {
  sessionId: string;
  durationSeconds: number;
  completedAtMs: number;
  taskName?: string;
};

type UseTimerOptions = {
  initialSeconds: number;
  storageKey: string;
  onComplete?: (completion: TimerCompletion) => void;
  sourcePath: string;
};

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `timer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useTimer({
  initialSeconds,
  storageKey,
  onComplete,
  sourcePath,
}: UseTimerOptions) {
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [hydrated, setHydrated] = useState(false);
  const totalSecondsRef = useRef(initialSeconds);
  const remainingSecondsRef = useRef(initialSeconds);
  const statusRef = useRef<TimerStatus>("idle");
  const deadlineRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sourcePathRef = useRef(sourcePath);
  const taskNameRef = useRef<string | null>(null);
  const completedSessionRef = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    sourcePathRef.current = sourcePath;
  }, [sourcePath]);

  const applyState = useCallback(
    (nextState: PersistedTimerState) => {
      totalSecondsRef.current = nextState.totalSeconds;
      remainingSecondsRef.current = nextState.remainingSeconds;
      statusRef.current = nextState.status;
      deadlineRef.current = nextState.deadlineMs;
      sessionIdRef.current = nextState.sessionId;
      sourcePathRef.current = nextState.sourcePath ?? sourcePathRef.current;
      taskNameRef.current = nextState.taskName;

      setTotalSeconds(nextState.totalSeconds);
      setRemainingSeconds(nextState.remainingSeconds);
      setStatus(nextState.status);
      writeTimerState(storageKey, nextState, { source: "use-timer" });
    },
    [storageKey],
  );

  const syncFromStoredState = useCallback(
    (nextState: PersistedTimerState) => {
      totalSecondsRef.current = nextState.totalSeconds;
      remainingSecondsRef.current = nextState.remainingSeconds;
      statusRef.current = nextState.status;
      deadlineRef.current = nextState.deadlineMs;
      sessionIdRef.current = nextState.sessionId;
      sourcePathRef.current = nextState.sourcePath ?? sourcePathRef.current;
      taskNameRef.current = nextState.taskName;

      if (nextState.status !== "completed") {
        completedSessionRef.current = null;
      }

      setTotalSeconds(nextState.totalSeconds);
      setRemainingSeconds(nextState.remainingSeconds);
      setStatus(nextState.status);
    },
    [],
  );

  const completeSession = useCallback(
    (completedAtMs: number) => {
      const sessionId = sessionIdRef.current ?? createSessionId();
      const durationSeconds = totalSecondsRef.current;

      applyState({
        version: 1,
        totalSeconds: durationSeconds,
        remainingSeconds: 0,
        status: "completed",
        deadlineMs: null,
        sessionId,
        sourcePath: sourcePathRef.current,
        taskName: taskNameRef.current,
        updatedAtMs: completedAtMs,
      });

      if (completedSessionRef.current === sessionId) return;
      completedSessionRef.current = sessionId;
      onCompleteRef.current?.({
        sessionId,
        durationSeconds,
        completedAtMs,
        taskName: taskNameRef.current ?? undefined,
      });
    },
    [applyState],
  );

  useEffect(() => {
    const hydrationId = window.setTimeout(() => {
      const savedState = readTimerState(storageKey);

      if (!savedState) {
        const initialState: PersistedTimerState = {
          version: 1,
          totalSeconds: initialSeconds,
          remainingSeconds: initialSeconds,
          status: "idle",
          deadlineMs: null,
          sessionId: null,
          sourcePath,
          taskName: null,
          updatedAtMs: Date.now(),
        };
        applyState(initialState);
      } else {
        if (savedState.status === "running" && savedState.deadlineMs !== null) {
          const nowMs = Date.now();
          const restoredRemaining = getRemainingSeconds({
            deadlineMs: savedState.deadlineMs,
            nowMs,
          });

          if (restoredRemaining === 0) {
            totalSecondsRef.current = savedState.totalSeconds;
            sessionIdRef.current = savedState.sessionId;
            completeSession(savedState.deadlineMs);
          } else {
            applyState({
              ...savedState,
              remainingSeconds: restoredRemaining,
              updatedAtMs: nowMs,
            });
          }
        } else {
          applyState(savedState);
        }
      }

      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrationId);
  }, [applyState, completeSession, initialSeconds, sourcePath, storageKey]);

  useEffect(() => {
    if (!hydrated) return;

    const refreshFromStorage = () => {
      const savedState = readTimerState(storageKey);
      if (!savedState) return;

      if (savedState.status === "running" && savedState.deadlineMs !== null) {
        const remaining = getRemainingSeconds({
          deadlineMs: savedState.deadlineMs,
          nowMs: Date.now(),
        });

        syncFromStoredState({
          ...savedState,
          remainingSeconds: remaining,
        });
        return;
      }

      syncFromStoredState(savedState);
    };

    const handleTimerStateUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ storageKey?: string }>).detail;
      if (detail?.storageKey && detail.storageKey !== storageKey) return;
      refreshFromStorage();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== getTimerStateStorageKey(storageKey)) return;
      refreshFromStorage();
    };

    window.addEventListener(TIMER_STATE_UPDATED_EVENT, handleTimerStateUpdated);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        TIMER_STATE_UPDATED_EVENT,
        handleTimerStateUpdated,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, [hydrated, storageKey, syncFromStoredState]);

  useEffect(() => {
    if (
      !hydrated ||
      status !== "running" ||
      deadlineRef.current === null
    ) {
      return;
    }

    const tick = () => {
      if (deadlineRef.current === null) return;

      const nextRemaining = getRemainingSeconds({
        deadlineMs: deadlineRef.current,
        nowMs: Date.now(),
      });

      remainingSecondsRef.current = nextRemaining;
      setRemainingSeconds(nextRemaining);

      if (nextRemaining === 0) {
        completeSession(deadlineRef.current);
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [completeSession, hydrated, status]);

  const start = useCallback((taskName?: string) => {
    const nowMs = Date.now();
    const isResuming = statusRef.current === "paused";
    const nextRemaining =
      remainingSecondsRef.current === 0
        ? totalSecondsRef.current
        : remainingSecondsRef.current;
    const sessionId =
      isResuming && sessionIdRef.current
        ? sessionIdRef.current
        : createSessionId();
    const nextTaskName = isResuming
      ? taskNameRef.current
      : taskName?.trim().slice(0, 80) || null;

    completedSessionRef.current = null;
    applyState({
      version: 1,
      totalSeconds: totalSecondsRef.current,
      remainingSeconds: nextRemaining,
      status: "running",
      deadlineMs: nowMs + nextRemaining * 1000,
      sessionId,
      sourcePath: sourcePathRef.current,
      taskName: nextTaskName,
      updatedAtMs: nowMs,
    });
  }, [applyState]);

  const pause = useCallback(() => {
    if (statusRef.current !== "running" || deadlineRef.current === null) return;

    const nowMs = Date.now();
    const nextRemaining = getRemainingSeconds({
      deadlineMs: deadlineRef.current,
      nowMs,
    });

    if (nextRemaining === 0) {
      completeSession(deadlineRef.current);
      return;
    }

    applyState({
      version: 1,
      totalSeconds: totalSecondsRef.current,
      remainingSeconds: nextRemaining,
      status: "paused",
      deadlineMs: null,
      sessionId: sessionIdRef.current,
      sourcePath: sourcePathRef.current,
      taskName: taskNameRef.current,
      updatedAtMs: nowMs,
    });
  }, [applyState, completeSession]);

  const reset = useCallback(() => {
    completedSessionRef.current = null;
    applyState({
      version: 1,
      totalSeconds: totalSecondsRef.current,
      remainingSeconds: totalSecondsRef.current,
      status: "idle",
      deadlineMs: null,
      sessionId: null,
      sourcePath: sourcePathRef.current,
      taskName: null,
      updatedAtMs: Date.now(),
    });
  }, [applyState]);

  const configure = useCallback(
    (seconds: number) => {
      completedSessionRef.current = null;
      applyState({
        version: 1,
        totalSeconds: seconds,
        remainingSeconds: seconds,
        status: "idle",
        deadlineMs: null,
        sessionId: null,
        sourcePath: sourcePathRef.current,
        taskName: null,
        updatedAtMs: Date.now(),
      });
    },
    [applyState],
  );

  return {
    configure,
    hydrated,
    pause,
    remainingSeconds,
    reset,
    start,
    status,
    totalSeconds,
  };
}

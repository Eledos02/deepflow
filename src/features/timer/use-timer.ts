"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getRemainingSeconds } from "@/features/timer/timer-engine";
import {
  readTimerState,
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
  const taskNameRef = useRef<string | null>(null);
  const completedSessionRef = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const applyState = useCallback(
    (nextState: PersistedTimerState) => {
      totalSecondsRef.current = nextState.totalSeconds;
      remainingSecondsRef.current = nextState.remainingSeconds;
      statusRef.current = nextState.status;
      deadlineRef.current = nextState.deadlineMs;
      sessionIdRef.current = nextState.sessionId;
      taskNameRef.current = nextState.taskName;

      setTotalSeconds(nextState.totalSeconds);
      setRemainingSeconds(nextState.remainingSeconds);
      setStatus(nextState.status);
      writeTimerState(storageKey, nextState);
    },
    [storageKey],
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
  }, [applyState, completeSession, initialSeconds, storageKey]);

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

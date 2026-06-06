"use client";

import { useEffect, useState } from "react";

import {
  readTimerPreferences,
  writeTimerPreferences,
} from "@/features/timer/timer-storage";

export function useTimerPreferences(storageKey: string) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [intention, setIntention] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hydrationId = window.setTimeout(() => {
      const preferences = readTimerPreferences(storageKey);
      if (preferences) {
        setSoundEnabled(preferences.soundEnabled);
        setIntention(preferences.intention);
      }
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrationId);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;

    writeTimerPreferences(storageKey, {
      version: 1,
      soundEnabled,
      intention,
    });
  }, [hydrated, intention, soundEnabled, storageKey]);

  return {
    intention,
    setIntention,
    setSoundEnabled,
    soundEnabled,
  };
}

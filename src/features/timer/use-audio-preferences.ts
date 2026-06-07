"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getAlarmSound,
  getBackgroundSound,
  type AlarmSoundId,
  type BackgroundSoundId,
} from "./audio-catalog";
import {
  readAudioPreferences,
  writeAudioPreferences,
} from "./timer-storage";

type PreviewKind = "alarm" | "background";

const defaultPreferences = {
  alarmSoundId: "soft-bell" as AlarmSoundId,
  backgroundSoundId: null as BackgroundSoundId | null,
  volume: 0.55,
};

function stopAudio(audio: HTMLAudioElement | null, reset = true) {
  if (!audio) return;
  audio.pause();
  if (reset) audio.currentTime = 0;
}

export function useAudioPreferences() {
  const [alarmSoundId, setAlarmSoundId] = useState<AlarmSoundId>(
    defaultPreferences.alarmSoundId,
  );
  const [backgroundSoundId, setBackgroundSoundId] =
    useState<BackgroundSoundId | null>(
      defaultPreferences.backgroundSoundId,
    );
  const [volume, setVolume] = useState(defaultPreferences.volume);
  const [hydrated, setHydrated] = useState(false);
  const [previewing, setPreviewing] = useState<PreviewKind | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const backgroundRef = useRef<HTMLAudioElement | null>(null);
  const alarmRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const hydrationId = window.setTimeout(() => {
      const preferences = readAudioPreferences();
      if (preferences) {
        setAlarmSoundId(preferences.alarmSoundId);
        setBackgroundSoundId(preferences.backgroundSoundId);
        setVolume(preferences.volume);
      }
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrationId);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeAudioPreferences({
      version: 1,
      alarmSoundId,
      backgroundSoundId,
      volume,
    });
  }, [alarmSoundId, backgroundSoundId, hydrated, volume]);

  useEffect(() => {
    for (const audio of [
      previewRef.current,
      backgroundRef.current,
      alarmRef.current,
    ]) {
      if (audio) audio.volume = volume;
    }
  }, [volume]);

  useEffect(
    () => () => {
      stopAudio(previewRef.current);
      stopAudio(backgroundRef.current);
      stopAudio(alarmRef.current);
    },
    [],
  );

  const playAudio = useCallback(
    async (
      audio: HTMLAudioElement,
      unavailableMessage: string,
    ) => {
      audio.volume = volume;
      setAudioError(null);

      try {
        await audio.play();
        return true;
      } catch {
        setAudioError(unavailableMessage);
        return false;
      }
    },
    [volume],
  );

  const stopPreview = useCallback(() => {
    stopAudio(previewRef.current);
    previewRef.current = null;
    setPreviewing(null);
  }, []);

  const togglePreview = useCallback(
    async (kind: PreviewKind) => {
      if (previewing === kind) {
        stopPreview();
        return;
      }

      stopPreview();
      const sound =
        kind === "alarm"
          ? getAlarmSound(alarmSoundId)
          : getBackgroundSound(backgroundSoundId);
      if (!sound) return;

      const audio = new Audio(sound.src);
      audio.loop = kind === "background";
      previewRef.current = audio;
      audio.addEventListener(
        "ended",
        () => {
          previewRef.current = null;
          setPreviewing(null);
        },
        { once: true },
      );

      if (
        await playAudio(
          audio,
          `${sound.label} is unavailable. Choose another sound.`,
        )
      ) {
        setPreviewing(kind);
      }
    },
    [
      alarmSoundId,
      backgroundSoundId,
      playAudio,
      previewing,
      stopPreview,
    ],
  );

  const playBackground = useCallback(async () => {
    const sound = getBackgroundSound(backgroundSoundId);
    if (!sound) return;

    if (
      !backgroundRef.current ||
      backgroundRef.current.src !== new URL(sound.src, window.location.href).href
    ) {
      stopAudio(backgroundRef.current);
      backgroundRef.current = new Audio(sound.src);
      backgroundRef.current.loop = true;
    }

    await playAudio(
      backgroundRef.current,
      `${sound.label} is unavailable. The timer will continue silently.`,
    );
  }, [backgroundSoundId, playAudio]);

  const pauseBackground = useCallback(() => {
    stopAudio(backgroundRef.current, false);
  }, []);

  const stopBackground = useCallback(() => {
    stopAudio(backgroundRef.current);
  }, []);

  const playAlarm = useCallback(async () => {
    const sound = getAlarmSound(alarmSoundId);
    if (!sound) return;

    stopAudio(alarmRef.current);
    const audio = new Audio(sound.src);
    alarmRef.current = audio;
    await playAudio(
      audio,
      `${sound.label} is unavailable. Your session still completed.`,
    );
  }, [alarmSoundId, playAudio]);

  const selectAlarmSound = useCallback(
    (id: AlarmSoundId) => {
      stopPreview();
      setAlarmSoundId(id);
    },
    [stopPreview],
  );

  const selectBackgroundSound = useCallback(
    (id: BackgroundSoundId | null) => {
      stopPreview();
      stopBackground();
      setBackgroundSoundId(id);
    },
    [stopBackground, stopPreview],
  );

  return {
    alarmSoundId,
    audioError,
    backgroundSoundId,
    pauseBackground,
    playAlarm,
    playBackground,
    previewing,
    selectAlarmSound,
    selectBackgroundSound,
    setVolume,
    stopBackground,
    stopPreview,
    togglePreview,
    volume,
  };
}

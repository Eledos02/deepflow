"use client";

import { useCallback, useEffect, useState } from "react";

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
import { shouldStartSelectedBackground } from "./timer-audio-behavior";

type PreviewKind = "alarm" | "background";

const defaultPreferences = {
  alarmSoundId: "soft-bell" as AlarmSoundId,
  backgroundSoundId: null as BackgroundSoundId | null,
  volume: 0.55,
};

let sharedPreviewAudio: HTMLAudioElement | null = null;
let sharedBackgroundAudio: HTMLAudioElement | null = null;
let sharedAlarmAudio: HTMLAudioElement | null = null;
let sharedBackgroundPlaying = false;

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
      sharedPreviewAudio,
      sharedBackgroundAudio,
      sharedAlarmAudio,
    ]) {
      if (audio) audio.volume = volume;
    }
  }, [volume]);

  useEffect(
    () => () => {
      stopAudio(sharedPreviewAudio);
      stopAudio(sharedAlarmAudio);
      sharedPreviewAudio = null;
      sharedAlarmAudio = null;
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
    stopAudio(sharedPreviewAudio);
    sharedPreviewAudio = null;
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
      sharedPreviewAudio = audio;
      audio.addEventListener(
        "ended",
        () => {
          if (sharedPreviewAudio === audio) {
            sharedPreviewAudio = null;
          }
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

  const playBackgroundSound = useCallback(async (
    soundId: BackgroundSoundId | null,
  ) => {
    const sound = getBackgroundSound(soundId);
    sharedBackgroundPlaying = false;
    if (!sound) return;

    if (
      !sharedBackgroundAudio ||
      sharedBackgroundAudio.src !== new URL(sound.src, window.location.href).href
    ) {
      stopAudio(sharedBackgroundAudio);
      sharedBackgroundAudio = new Audio(sound.src);
      sharedBackgroundAudio.loop = true;
    }

    sharedBackgroundPlaying = await playAudio(
      sharedBackgroundAudio,
      `${sound.label} is unavailable. The timer will continue silently.`,
    );
  }, [playAudio]);

  const playBackground = useCallback(async () => {
    await playBackgroundSound(backgroundSoundId);
  }, [backgroundSoundId, playBackgroundSound]);

  const pauseBackground = useCallback(() => {
    stopAudio(sharedBackgroundAudio, false);
    sharedBackgroundPlaying = false;
  }, []);

  const stopBackground = useCallback(() => {
    stopAudio(sharedBackgroundAudio);
    sharedBackgroundPlaying = false;
  }, []);

  const playAlarm = useCallback(async () => {
    const sound = getAlarmSound(alarmSoundId);
    if (!sound) return;

    stopAudio(sharedAlarmAudio);
    const audio = new Audio(sound.src);
    sharedAlarmAudio = audio;
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
    (id: BackgroundSoundId | null, playWhenSelected = false) => {
      const shouldPlayNextBackground = shouldStartSelectedBackground({
        isTimerRunning: playWhenSelected,
        nextBackgroundSoundId: id,
        wasBackgroundPlaying: sharedBackgroundPlaying,
      });
      stopPreview();
      stopBackground();
      setBackgroundSoundId(id);

      if (shouldPlayNextBackground) {
        void playBackgroundSound(id);
      }
    },
    [playBackgroundSound, stopBackground, stopPreview],
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

export type AudioOption = {
  id: string;
  label: string;
  src: string;
};

export const alarmSounds = [
  {
    id: "soft-bell",
    label: "Soft Bell",
    src: "/audio/alarms/soft-bell.mp3",
  },
  {
    id: "zen-gong",
    label: "Zen Gong",
    src: "/audio/alarms/zen-gong.mp3",
  },
] as const satisfies readonly AudioOption[];

export const backgroundSounds = [
  {
    id: "rain-window",
    label: "Rain on Window",
    src: "/audio/ambience/rain-window.mp3",
  },
  {
    id: "fireplace",
    label: "Fireplace",
    src: "/audio/ambience/fireplace.mp3",
  },
  {
    id: "ocean-waves",
    label: "Ocean Waves",
    src: "/audio/ambience/ocean-waves.mp3",
  },
  {
    id: "white-noise",
    label: "White Noise",
    src: "/audio/noise/white-noise.mp3",
  },
] as const satisfies readonly AudioOption[];

export type AlarmSoundId = (typeof alarmSounds)[number]["id"];
export type BackgroundSoundId = (typeof backgroundSounds)[number]["id"];

export function getAlarmSound(id: AlarmSoundId) {
  return alarmSounds.find((sound) => sound.id === id);
}

export function getBackgroundSound(id: BackgroundSoundId | null) {
  if (!id) return undefined;
  return backgroundSounds.find((sound) => sound.id === id);
}

import type { BackgroundSoundId } from "./audio-catalog";

export type AudioSettingsInteraction =
  | "open"
  | "close"
  | "volume-change"
  | "alarm-change"
  | "ambience-change";

export function shouldTimerContinueAfterAudioSettingsInteraction(
  interaction: AudioSettingsInteraction,
) {
  void interaction;
  return true;
}

export function shouldStartSelectedBackground({
  isTimerRunning,
  nextBackgroundSoundId,
  wasBackgroundPlaying,
}: {
  isTimerRunning: boolean;
  nextBackgroundSoundId: BackgroundSoundId | null;
  wasBackgroundPlaying: boolean;
}) {
  return Boolean(nextBackgroundSoundId) && (isTimerRunning || wasBackgroundPlaying);
}

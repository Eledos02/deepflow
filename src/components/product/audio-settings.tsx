"use client";

import { useId } from "react";

import {
  PauseIcon,
  PlayIcon,
  VolumeIcon,
} from "@/components/ui/icons";
import {
  alarmSounds,
  backgroundSounds,
  type AlarmSoundId,
  type BackgroundSoundId,
} from "@/features/timer/audio-catalog";

type AudioSettingsProps = {
  alarmSoundId: AlarmSoundId;
  audioError: string | null;
  backgroundSoundId: BackgroundSoundId | null;
  onAlarmChange: (id: AlarmSoundId) => void;
  onBackgroundChange: (id: BackgroundSoundId | null) => void;
  onPreview: (kind: "alarm" | "background") => void;
  onVolumeChange: (volume: number) => void;
  previewing: "alarm" | "background" | null;
  volume: number;
};

export function AudioSettings({
  alarmSoundId,
  audioError,
  backgroundSoundId,
  onAlarmChange,
  onBackgroundChange,
  onPreview,
  onVolumeChange,
  previewing,
  volume,
}: AudioSettingsProps) {
  const fieldId = useId();
  const alarmId = `${fieldId}-alarm`;
  const backgroundId = `${fieldId}-background`;
  const volumeId = `${fieldId}-volume`;

  return (
    <details className="audio-settings">
      <summary>
        <VolumeIcon width={16} height={16} />
        Audio settings
      </summary>
      <div className="audio-settings__panel">
        <div className="audio-settings__field">
          <label htmlFor={alarmId}>End alarm</label>
          <div className="audio-settings__control">
            <select
              id={alarmId}
              onChange={(event) =>
                onAlarmChange(event.target.value as AlarmSoundId)
              }
              value={alarmSoundId}
            >
              {alarmSounds.map((sound) => (
                <option key={sound.id} value={sound.id}>
                  {sound.label}
                </option>
              ))}
            </select>
            <button
              aria-label={
                previewing === "alarm"
                  ? "Pause alarm preview"
                  : "Preview alarm sound"
              }
              onClick={() => onPreview("alarm")}
              type="button"
            >
              {previewing === "alarm" ? <PauseIcon /> : <PlayIcon />}
              {previewing === "alarm" ? "Pause" : "Preview"}
            </button>
          </div>
        </div>

        <div className="audio-settings__field">
          <label htmlFor={backgroundId}>Ambient sound</label>
          <div className="audio-settings__control">
            <select
              id={backgroundId}
              onChange={(event) =>
                onBackgroundChange(
                  event.target.value
                    ? (event.target.value as BackgroundSoundId)
                    : null,
                )
              }
              value={backgroundSoundId ?? ""}
            >
              <option value="">None</option>
              {backgroundSounds.map((sound) => (
                <option key={sound.id} value={sound.id}>
                  {sound.label}
                </option>
              ))}
            </select>
            <button
              aria-label={
                previewing === "background"
                  ? "Pause background sound preview"
                  : "Preview background sound"
              }
              disabled={!backgroundSoundId}
              onClick={() => onPreview("background")}
              type="button"
            >
              {previewing === "background" ? <PauseIcon /> : <PlayIcon />}
              {previewing === "background" ? "Pause" : "Preview"}
            </button>
          </div>
          <small>Loops while the timer is running.</small>
        </div>

        <div className="audio-settings__field">
          <label htmlFor={volumeId}>
            Volume <span>{Math.round(volume * 100)}%</span>
          </label>
          <input
            id={volumeId}
            max="1"
            min="0"
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            step="0.05"
            type="range"
            value={volume}
          />
        </div>

        {audioError ? (
          <p className="audio-settings__error" role="status">
            {audioError}
          </p>
        ) : null}
      </div>
    </details>
  );
}

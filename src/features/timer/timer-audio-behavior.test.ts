import { describe, expect, it } from "vitest";

import {
  shouldStartSelectedBackground,
  shouldTimerContinueAfterAudioSettingsInteraction,
} from "./timer-audio-behavior";

describe("timer audio settings behavior", () => {
  it("opening settings while running does not pause the timer", () => {
    expect(
      shouldTimerContinueAfterAudioSettingsInteraction("open"),
    ).toBe(true);
  });

  it("opening settings while running does not stop ambience", () => {
    expect(
      shouldStartSelectedBackground({
        isTimerRunning: true,
        nextBackgroundSoundId: "rain-window",
        wasBackgroundPlaying: true,
      }),
    ).toBe(true);
  });

  it("changing ambience while running starts the selected ambience", () => {
    expect(
      shouldStartSelectedBackground({
        isTimerRunning: true,
        nextBackgroundSoundId: "fireplace",
        wasBackgroundPlaying: false,
      }),
    ).toBe(true);
  });

  it("turning ambience off does not start another background sound", () => {
    expect(
      shouldStartSelectedBackground({
        isTimerRunning: true,
        nextBackgroundSoundId: null,
        wasBackgroundPlaying: true,
      }),
    ).toBe(false);
  });

  it("volume change while running keeps the timer active", () => {
    expect(
      shouldTimerContinueAfterAudioSettingsInteraction("volume-change"),
    ).toBe(true);
  });

  it("alarm change while running keeps the timer active", () => {
    expect(
      shouldTimerContinueAfterAudioSettingsInteraction("alarm-change"),
    ).toBe(true);
  });
});

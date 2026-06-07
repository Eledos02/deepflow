import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { alarmSounds, backgroundSounds } from "./audio-catalog";

describe("timer audio catalog", () => {
  it("uses unique IDs and available public MP3 files", () => {
    const sounds = [...alarmSounds, ...backgroundSounds];
    const ids = sounds.map((sound) => sound.id);

    expect(new Set(ids).size).toBe(ids.length);

    for (const sound of sounds) {
      expect(sound.src).toMatch(/^\/audio\/.+\.mp3$/);
      expect(
        existsSync(join(process.cwd(), "public", sound.src.slice(1))),
        `${sound.label} is missing at public${sound.src}`,
      ).toBe(true);
    }
  });
});

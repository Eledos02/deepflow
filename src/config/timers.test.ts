import { describe, expect, it } from "vitest";

import {
  getRelatedTimerMinutes,
  parseLegacyTimerSlug,
  parseTimerMinutes,
} from "./timers";

describe("parseTimerMinutes", () => {
  it("accepts configured numeric timer routes", () => {
    expect(parseTimerMinutes("25")).toBe(25);
    expect(parseTimerMinutes("120")).toBe(120);
  });

  it("rejects malformed and unconfigured routes", () => {
    expect(parseTimerMinutes("25-minute-timer")).toBeNull();
    expect(parseTimerMinutes("0")).toBeNull();
    expect(parseTimerMinutes("17")).toBeNull();
  });
});

describe("parseLegacyTimerSlug", () => {
  it("recognizes configured legacy timer URLs", () => {
    expect(parseLegacyTimerSlug("25-minute-timer")).toBe(25);
  });
});

describe("getRelatedTimerMinutes", () => {
  it("balances nearby shorter and longer timers", () => {
    expect(getRelatedTimerMinutes(25)).toEqual([15, 20, 30, 45]);
  });

  it("returns available neighbors at the edges", () => {
    expect(getRelatedTimerMinutes(5)).toEqual([10, 15, 20, 25]);
    expect(getRelatedTimerMinutes(120)).toEqual([45, 50, 60, 90]);
  });
});

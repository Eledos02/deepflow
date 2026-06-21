import { describe, expect, it } from "vitest";

import {
  DEFAULT_COLLAPSED_SESSION_COUNT,
  getVisibleSessionListItems,
  hasHiddenSessionListItems,
} from "./collapsible-session-list";

const sessions = Array.from({ length: 7 }, (_, index) => `session-${index + 1}`);

describe("collapsible session lists", () => {
  it("shows five items by default", () => {
    expect(getVisibleSessionListItems(sessions, false)).toEqual(
      sessions.slice(0, DEFAULT_COLLAPSED_SESSION_COUNT),
    );
  });

  it("shows every item when expanded and returns to five when collapsed", () => {
    expect(getVisibleSessionListItems(sessions, true)).toEqual(sessions);
    expect(getVisibleSessionListItems(sessions, false)).toHaveLength(5);
  });

  it("only exposes a toggle when items are hidden", () => {
    expect(hasHiddenSessionListItems(5)).toBe(false);
    expect(hasHiddenSessionListItems(6)).toBe(true);
  });
});

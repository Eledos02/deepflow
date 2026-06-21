import { describe, expect, it } from "vitest";

import { splitReflectionNarrative } from "./reflection-presentation";

describe("reflection presentation", () => {
  it("groups a weekly reflection into two editorial paragraphs", () => {
    expect(
      splitReflectionNarrative(
        "Your rhythm felt steady. Momentum is building. Wednesday emerged as your strongest focus day, while your evening focus felt clear.",
      ),
    ).toEqual([
      "Your rhythm felt steady. Momentum is building.",
      "Wednesday emerged as your strongest focus day, while your evening focus felt clear.",
    ]);
  });

  it("keeps short narratives concise", () => {
    expect(splitReflectionNarrative("A calm week. Keep going."))
      .toEqual(["A calm week.", "Keep going."]);
  });
});

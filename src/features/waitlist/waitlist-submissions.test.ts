import { describe, expect, it } from "vitest";

import {
  WAITLIST_SUBMISSIONS_STORAGE_KEY,
  getWaitlistEmailSubmissionStatus,
  hasWaitlistSubmissionEmail,
  readWaitlistSubmissionEmails,
  saveWaitlistSubmissionEmail,
} from "./waitlist-submissions";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("waitlist submission storage", () => {
  it("stores normalized emails for multiple people on one browser", () => {
    const storage = createStorage();

    saveWaitlistSubmissionEmail(storage, "  FIRST@EXAMPLE.COM ");
    saveWaitlistSubmissionEmail(storage, "second@example.com");

    expect(readWaitlistSubmissionEmails(storage)).toEqual([
      "first@example.com",
      "second@example.com",
    ]);
    expect(JSON.parse(storage.getItem(WAITLIST_SUBMISSIONS_STORAGE_KEY) ?? ""))
      .toEqual({ emails: ["first@example.com", "second@example.com"] });
  });

  it("recognizes local duplicates without treating another email as joined", () => {
    const storage = createStorage();
    saveWaitlistSubmissionEmail(storage, "first@example.com");

    expect(hasWaitlistSubmissionEmail(storage, "FIRST@example.com")).toBe(true);
    expect(hasWaitlistSubmissionEmail(storage, "second@example.com")).toBe(false);
    expect(getWaitlistEmailSubmissionStatus(storage, "first@example.com")).toBe(
      "duplicate",
    );
    expect(getWaitlistEmailSubmissionStatus(storage, "second@example.com")).toBe(
      "new",
    );
  });

  it("migrates previous per-email records without losing known submissions", () => {
    const storage = createStorage({
      "deepflow:founding-member-waitlist:v1": JSON.stringify([
        { email: "first@example.com" },
        "second@example.com",
      ]),
    });

    expect(readWaitlistSubmissionEmails(storage)).toEqual([
      "first@example.com",
      "second@example.com",
    ]);
  });
});

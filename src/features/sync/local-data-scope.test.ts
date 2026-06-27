import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getLocalDataScope,
  getScopedLocalDataStorageKey,
  isActiveScopedLocalDataStorageKey,
  setLocalDataScopeForUser,
} from "./local-data-scope";

afterEach(() => {
  setLocalDataScopeForUser(null);
  vi.unstubAllGlobals();
});

describe("local data scope", () => {
  it("uses guest keys while logged out", () => {
    setLocalDataScopeForUser(null);

    expect(getLocalDataScope()).toEqual({ kind: "guest" });
    expect(getScopedLocalDataStorageKey("focus_sessions")).toBe(
      "deepflow:guest:focus_sessions",
    );
    expect(getScopedLocalDataStorageKey("focus_journal")).toBe(
      "deepflow:guest:focus_journal",
    );
    expect(getScopedLocalDataStorageKey("focus_goal")).toBe(
      "deepflow:guest:focus_goal",
    );
    expect(getScopedLocalDataStorageKey("focus_routines")).toBe(
      "deepflow:guest:focus_routines",
    );
  });

  it("uses account-specific keys while authenticated", () => {
    setLocalDataScopeForUser("account-a");

    expect(getLocalDataScope()).toEqual({ kind: "user", userId: "account-a" });
    expect(getScopedLocalDataStorageKey("focus_sessions")).toBe(
      "deepflow:user:account-a:focus_sessions",
    );
    expect(getScopedLocalDataStorageKey("focus_routines")).toBe(
      "deepflow:user:account-a:focus_routines",
    );

    setLocalDataScopeForUser("account-b");

    expect(getScopedLocalDataStorageKey("focus_sessions")).toBe(
      "deepflow:user:account-b:focus_sessions",
    );
    expect(
      isActiveScopedLocalDataStorageKey(
        "deepflow:user:account-a:focus_sessions",
        ["focus_sessions"],
      ),
    ).toBe(false);
    expect(
      isActiveScopedLocalDataStorageKey(
        "deepflow:user:account-b:focus_sessions",
        ["focus_sessions"],
      ),
    ).toBe(true);
  });
});

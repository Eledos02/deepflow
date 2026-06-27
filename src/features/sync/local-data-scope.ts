export const LOCAL_DATA_SCOPE_CHANGED_EVENT = "deepflow:local-data-scope-changed";

export type LocalDataKeyName =
  | "focus_sessions"
  | "focus_journal"
  | "timer_stats"
  | "focus_goal"
  | "focus_routines";

export type LocalDataScope =
  | { kind: "guest" }
  | { kind: "user"; userId: string };

let activeScope: LocalDataScope = { kind: "guest" };

function canDispatchScopeEvent() {
  return typeof window !== "undefined" && typeof window.dispatchEvent === "function";
}

function normalizeUserId(userId: string) {
  return userId.trim();
}

export function getLocalDataScope() {
  return activeScope;
}

export function setLocalDataScopeForUser(userId: string | null | undefined) {
  const normalizedUserId = typeof userId === "string" ? normalizeUserId(userId) : "";
  const nextScope: LocalDataScope = normalizedUserId
    ? { kind: "user", userId: normalizedUserId }
    : { kind: "guest" };
  const changed =
    nextScope.kind !== activeScope.kind ||
    (nextScope.kind === "user" &&
      activeScope.kind === "user" &&
      nextScope.userId !== activeScope.userId);

  activeScope = nextScope;

  if (changed && canDispatchScopeEvent()) {
    window.dispatchEvent(new Event(LOCAL_DATA_SCOPE_CHANGED_EVENT));
  }
}

export function getScopedLocalDataStorageKey(name: LocalDataKeyName) {
  if (activeScope.kind === "user") {
    return `deepflow:user:${activeScope.userId}:${name}`;
  }

  return `deepflow:guest:${name}`;
}

export function isActiveScopedLocalDataStorageKey(
  key: string | null | undefined,
  names: LocalDataKeyName[],
) {
  if (!key) return false;
  return names.some((name) => key === getScopedLocalDataStorageKey(name));
}

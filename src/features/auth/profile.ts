export const MAX_DISPLAY_NAME_LENGTH = 40;

export type Profile = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarColor: string;
  onboardingCompleted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DisplayNameValidation =
  | { valid: true; value: string }
  | { valid: false; error: string };

export function validateDisplayName(value: string): DisplayNameValidation {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return { valid: false, error: "Enter the name you would like DeepFlow to use." };
  }

  if (normalized.length > MAX_DISPLAY_NAME_LENGTH) {
    return {
      valid: false,
      error: `Use ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`,
    };
  }

  return { valid: true, value: normalized };
}

export function getAvatarInitial(
  displayName: string | null | undefined,
  email: string | null | undefined,
) {
  const source = displayName?.trim() || email?.trim() || "D";
  return source.charAt(0).toUpperCase();
}

export function getWorkspaceGreeting(
  displayName: string,
  now = new Date(),
) {
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${greeting}, ${displayName}.`;
}

export function parseProfile(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null;

  const profile = value as Record<string, unknown>;
  if (typeof profile.id !== "string") return null;

  return {
    id: profile.id,
    email: typeof profile.email === "string" ? profile.email : null,
    displayName:
      typeof profile.display_name === "string" && profile.display_name.trim()
        ? profile.display_name.trim()
        : null,
    avatarColor:
      typeof profile.avatar_color === "string" && profile.avatar_color.trim()
        ? profile.avatar_color
        : "deep-green",
    onboardingCompleted: profile.onboarding_completed === true,
    createdAt: typeof profile.created_at === "string" ? profile.created_at : null,
    updatedAt: typeof profile.updated_at === "string" ? profile.updated_at : null,
  };
}

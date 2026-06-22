export const WAITLIST_SUBMISSIONS_STORAGE_KEY =
  "deepflow:waitlist-submissions:v1";
const LEGACY_WAITLIST_STORAGE_KEY = "deepflow:founding-member-waitlist:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

type WaitlistSubmissionRecord = {
  emails: string[];
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeWaitlistEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeEmails(values: unknown[]) {
  return [...new Set(
    values.flatMap((value) => {
      if (typeof value !== "string") return [];
      const email = normalizeWaitlistEmail(value);
      return isValidEmail(email) ? [email] : [];
    }),
  )];
}

export function parseWaitlistSubmissionRecord(
  value: unknown,
): WaitlistSubmissionRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { emails: [] };
  }

  const record = value as Partial<WaitlistSubmissionRecord>;
  return {
    emails: Array.isArray(record.emails) ? normalizeEmails(record.emails) : [],
  };
}

function parseLegacyWaitlistEmails(value: unknown) {
  if (!Array.isArray(value)) return [];

  return normalizeEmails(
    value.map((entry) => {
      if (typeof entry === "string") return entry;
      if (!entry || typeof entry !== "object") return "";
      const candidate = entry as { email?: unknown };
      return typeof candidate.email === "string" ? candidate.email : "";
    }),
  );
}

function readJson(storage: StorageLike, key: string) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readWaitlistSubmissionEmails(storage: StorageLike) {
  const currentRecord = parseWaitlistSubmissionRecord(
    readJson(storage, WAITLIST_SUBMISSIONS_STORAGE_KEY),
  );
  if (currentRecord.emails.length > 0) return currentRecord.emails;

  const legacyEmails = parseLegacyWaitlistEmails(
    readJson(storage, LEGACY_WAITLIST_STORAGE_KEY),
  );
  if (legacyEmails.length > 0) {
    try {
      storage.setItem(
        WAITLIST_SUBMISSIONS_STORAGE_KEY,
        JSON.stringify({ emails: legacyEmails }),
      );
    } catch {
      // Local duplicate prevention should never block a waitlist submission.
    }
  }

  return legacyEmails;
}

export function hasWaitlistSubmissionEmail(
  storage: StorageLike,
  email: string,
) {
  return readWaitlistSubmissionEmails(storage).includes(
    normalizeWaitlistEmail(email),
  );
}

export function getWaitlistEmailSubmissionStatus(
  storage: StorageLike,
  email: string,
) {
  return hasWaitlistSubmissionEmail(storage, email) ? "duplicate" : "new";
}

export function saveWaitlistSubmissionEmail(
  storage: StorageLike,
  email: string,
) {
  const normalizedEmail = normalizeWaitlistEmail(email);
  const emails = readWaitlistSubmissionEmails(storage);
  const nextEmails = emails.includes(normalizedEmail)
    ? emails
    : [...emails, normalizedEmail];

  try {
    storage.setItem(
      WAITLIST_SUBMISSIONS_STORAGE_KEY,
      JSON.stringify({ emails: nextEmails }),
    );
  } catch {
    // The API remains the source of truth when local storage is unavailable.
  }

  return nextEmails;
}

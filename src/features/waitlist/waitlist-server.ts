import type { WaitlistSubmission } from "./waitlist";

type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
};

type SupabaseEnvironment = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

type FetchLike = typeof fetch;

export type WaitlistRecord = {
  email: string;
  welcome_email_sent_at: string | null;
  welcome_email_error: string | null;
};

type WaitlistSaveSuccess = {
  ok: true;
  record: WaitlistRecord;
};

type WaitlistSaveFailure = {
  ok: false;
  status: number;
  responseBody: string;
};

export type WaitlistSaveResult = WaitlistSaveSuccess | WaitlistSaveFailure;

type WaitlistRecordResult =
  | { ok: true; record: WaitlistRecord | null }
  | WaitlistSaveFailure;

export function normalizeSupabaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  const projectUrl = trimmed.replace(/\/rest\/v1$/i, "");

  try {
    const url = new URL(projectUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.pathname !== "/") return null;

    return url.origin;
  } catch {
    return null;
  }
}

export function getSupabaseConfig(
  environment: SupabaseEnvironment = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
): SupabaseConfig | null {
  const url = environment.SUPABASE_URL
    ? normalizeSupabaseUrl(environment.SUPABASE_URL)
    : null;
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY?.trim();

  return url && serviceRoleKey ? { url, serviceRoleKey } : null;
}

function supabaseHeaders(config: SupabaseConfig) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
  };
}

function parseWaitlistRecord(value: unknown): WaitlistRecord | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Partial<WaitlistRecord>;
  if (typeof record.email !== "string") return null;

  return {
    email: record.email,
    welcome_email_sent_at:
      typeof record.welcome_email_sent_at === "string"
        ? record.welcome_email_sent_at
        : null,
    welcome_email_error:
      typeof record.welcome_email_error === "string"
        ? record.welcome_email_error
        : null,
  };
}

export async function findWaitlistSubmission(
  email: string,
  config: SupabaseConfig,
  fetcher: FetchLike = fetch,
): Promise<WaitlistRecordResult> {
  const response = await fetcher(
    `${config.url}/rest/v1/waitlist?email=eq.${encodeURIComponent(email)}&select=email,welcome_email_sent_at,welcome_email_error`,
    { headers: supabaseHeaders(config) },
  );

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      responseBody: await response.text(),
    };
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) return { ok: true, record: null };

  return { ok: true, record: parseWaitlistRecord(payload[0]) };
}

export async function saveWaitlistSubmission(
  submission: WaitlistSubmission,
  config: SupabaseConfig,
  fetcher: FetchLike = fetch,
): Promise<WaitlistSaveResult> {
  const response = await fetcher(
    `${config.url}/rest/v1/waitlist`,
    {
      method: "POST",
      headers: {
        ...supabaseHeaders(config),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(submission),
    },
  );

  if (response.ok) {
    const payload: unknown = await response.json();
    const record = Array.isArray(payload) ? parseWaitlistRecord(payload[0]) : null;

    if (record) return { ok: true as const, record };

    return {
      ok: false as const,
      status: 502,
      responseBody: "Supabase insert response did not include a waitlist row.",
    };
  }

  return {
    ok: false as const,
    status: response.status,
    responseBody: await response.text(),
  };
}

export async function updateWaitlistWelcomeEmail(
  email: string,
  values: {
    welcome_email_sent_at?: string | null;
    welcome_email_error?: string | null;
  },
  config: SupabaseConfig,
  fetcher: FetchLike = fetch,
): Promise<WaitlistSaveResult> {
  const response = await fetcher(
    `${config.url}/rest/v1/waitlist?email=eq.${encodeURIComponent(email)}`,
    {
      method: "PATCH",
      headers: {
        ...supabaseHeaders(config),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(values),
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      responseBody: await response.text(),
    };
  }

  const payload: unknown = await response.json();
  const record = Array.isArray(payload) ? parseWaitlistRecord(payload[0]) : null;
  if (record) return { ok: true, record };

  return {
    ok: false,
    status: 502,
    responseBody: "Supabase email status update did not include a waitlist row.",
  };
}

export function isDuplicateWaitlistError(
  status: number,
  responseBody: string,
) {
  if (status !== 409) return false;

  return (
    /\"code\"\s*:\s*\"23505\"/i.test(responseBody) ||
    /duplicate key|unique constraint|already exists/i.test(responseBody)
  );
}

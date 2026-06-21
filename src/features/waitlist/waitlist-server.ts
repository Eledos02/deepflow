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

type WaitlistSaveSuccess = {
  ok: true;
};

type WaitlistSaveFailure = {
  ok: false;
  status: number;
  responseBody: string;
};

export type WaitlistSaveResult = WaitlistSaveSuccess | WaitlistSaveFailure;

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

export async function saveWaitlistSubmission(
  submission: WaitlistSubmission,
  config: SupabaseConfig,
  fetcher: FetchLike = fetch,
): Promise<WaitlistSaveResult> {
  const response = await fetcher(
    `${config.url}/rest/v1/waitlist?on_conflict=email`,
    {
      method: "POST",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify(submission),
    },
  );

  if (response.ok) {
    return { ok: true as const };
  }

  return {
    ok: false as const,
    status: response.status,
    responseBody: await response.text(),
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

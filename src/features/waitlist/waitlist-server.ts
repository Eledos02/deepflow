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

export function getSupabaseConfig(
  environment: SupabaseEnvironment = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
): SupabaseConfig | null {
  const url = environment.SUPABASE_URL?.trim();
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY?.trim();

  return url && serviceRoleKey ? { url, serviceRoleKey } : null;
}

export async function saveWaitlistSubmission(
  submission: WaitlistSubmission,
  config: SupabaseConfig,
  fetcher: FetchLike = fetch,
) {
  const response = await fetcher(
    `${config.url.replace(/\/$/, "")}/rest/v1/waitlist?on_conflict=email`,
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

  if (response.ok || response.status === 409) {
    return { ok: true as const };
  }

  return { ok: false as const, status: response.status };
}

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import { mapStripeSubscriptionStatus, type BillingSubscriptionRecord } from "./billing-status";

export type SupabaseBillingEnvironment = Record<string, string | undefined> & {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

export type SupabaseBillingConfig = {
  url: string;
  serviceRoleKey: string;
  anonKey: string;
};

export type AuthenticatedBillingUser = {
  id: string;
  email: string | null;
};

export type BillingCustomerRecord = {
  userId: string;
  stripeCustomerId: string;
  email: string | null;
};

export type BillingSubscriptionUpsert = {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  status: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string | null;
  trialStart?: string | null;
  trialEnd?: string | null;
  planKey?: string | null;
  planLabel?: string | null;
};

function normalizeSupabaseUrl(value: string | undefined) {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.replace(/\/rest\/v1$/i, ""));
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function getSupabaseBillingConfig(
  environment: SupabaseBillingEnvironment = process.env,
): SupabaseBillingConfig | null {
  const url = normalizeSupabaseUrl(
    environment.SUPABASE_URL || environment.NEXT_PUBLIC_SUPABASE_URL,
  );
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = environment.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  return url && serviceRoleKey && anonKey
    ? { url, serviceRoleKey, anonKey }
    : null;
}

export function createSupabaseServiceClient(config: SupabaseBillingConfig) {
  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createSupabaseAuthClient(config: SupabaseBillingConfig) {
  return createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function userFromSupabase(user: User | null): AuthenticatedBillingUser | null {
  return user
    ? {
        id: user.id,
        email: user.email ?? null,
      }
    : null;
}

export async function authenticateBillingRequest(
  request: Request,
  config: SupabaseBillingConfig,
  authClient: SupabaseClient = createSupabaseAuthClient(config),
): Promise<AuthenticatedBillingUser | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const { data, error } = await authClient.auth.getUser(token);
  if (error) return null;

  return userFromSupabase(data.user);
}

function parseBillingCustomer(value: unknown): BillingCustomerRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as {
    user_id?: unknown;
    stripe_customer_id?: unknown;
    email?: unknown;
  };

  if (typeof record.user_id !== "string") return null;
  if (typeof record.stripe_customer_id !== "string") return null;

  return {
    userId: record.user_id,
    stripeCustomerId: record.stripe_customer_id,
    email: typeof record.email === "string" ? record.email : null,
  };
}

function parseBillingSubscription(value: unknown): BillingSubscriptionRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as {
    user_id?: unknown;
    status?: unknown;
    plan_key?: unknown;
    plan_label?: unknown;
    stripe_price_id?: unknown;
    cancel_at_period_end?: unknown;
    current_period_end?: unknown;
  };

  if (typeof record.user_id !== "string") return null;

  return {
    userId: record.user_id,
    status: mapStripeSubscriptionStatus(
      typeof record.status === "string" ? record.status : null,
    ),
    planKey: typeof record.plan_key === "string" ? record.plan_key : null,
    planLabel: typeof record.plan_label === "string" ? record.plan_label : null,
    stripePriceId:
      typeof record.stripe_price_id === "string" ? record.stripe_price_id : null,
    cancelAtPeriodEnd: Boolean(record.cancel_at_period_end),
    currentPeriodEnd:
      typeof record.current_period_end === "string"
        ? record.current_period_end
        : null,
  };
}

export async function findBillingCustomerForUser(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("billing_customers")
    .select("user_id,stripe_customer_id,email")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error("billing_customer_lookup_failed");
  return parseBillingCustomer(data);
}

export async function findBillingCustomerByStripeId(
  supabase: SupabaseClient,
  stripeCustomerId: string,
) {
  const { data, error } = await supabase
    .from("billing_customers")
    .select("user_id,stripe_customer_id,email")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error) throw new Error("billing_customer_lookup_failed");
  return parseBillingCustomer(data);
}

export async function upsertBillingCustomer(
  supabase: SupabaseClient,
  record: BillingCustomerRecord,
) {
  const { error } = await supabase.from("billing_customers").upsert(
    {
      user_id: record.userId,
      stripe_customer_id: record.stripeCustomerId,
      email: record.email,
    },
    { onConflict: "user_id" },
  );

  if (error) throw new Error("billing_customer_upsert_failed");
}

export async function countActiveFounderSubscriptions(supabase: SupabaseClient) {
  const { count, error } = await supabase
    .from("billing_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("plan_key", "founding_member")
    .in("status", ["active", "trialing"]);

  if (error || typeof count !== "number") {
    throw new Error("founder_count_unavailable");
  }

  return count;
}

export async function findBestBillingSubscriptionForUser(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select(
      "user_id,status,plan_key,plan_label,stripe_price_id,cancel_at_period_end,current_period_end",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) throw new Error("billing_subscription_lookup_failed");
  if (!Array.isArray(data)) return null;

  const subscriptions = data
    .map((record) => parseBillingSubscription(record))
    .filter((record): record is BillingSubscriptionRecord => Boolean(record));

  return (
    subscriptions.find((subscription) =>
      subscription.status === "active" || subscription.status === "trialing"
    ) ??
    subscriptions[0] ??
    null
  );
}

export async function upsertBillingSubscription(
  supabase: SupabaseClient,
  record: BillingSubscriptionUpsert,
) {
  const { error } = await supabase.from("billing_subscriptions").upsert(
    {
      user_id: record.userId,
      stripe_customer_id: record.stripeCustomerId,
      stripe_subscription_id: record.stripeSubscriptionId,
      stripe_price_id: record.stripePriceId,
      status: mapStripeSubscriptionStatus(record.status),
      current_period_start: record.currentPeriodStart ?? null,
      current_period_end: record.currentPeriodEnd ?? null,
      cancel_at_period_end: Boolean(record.cancelAtPeriodEnd),
      canceled_at: record.canceledAt ?? null,
      trial_start: record.trialStart ?? null,
      trial_end: record.trialEnd ?? null,
      plan_key: record.planKey ?? null,
      plan_label: record.planLabel ?? null,
    },
    { onConflict: "stripe_subscription_id" },
  );

  if (error) throw new Error("billing_subscription_upsert_failed");
}

export async function hasProcessedBillingEvent(
  supabase: SupabaseClient,
  stripeEventId: string,
) {
  const { data, error } = await supabase
    .from("billing_events")
    .select("stripe_event_id,processing_status")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();

  if (error) throw new Error("billing_event_lookup_failed");
  return Boolean(data);
}

export async function recordBillingEvent(
  supabase: SupabaseClient,
  values: {
    stripeEventId: string;
    eventType: string;
    processingStatus?: "processed" | "skipped" | "failed";
    errorMessage?: string | null;
  },
) {
  const { error } = await supabase.from("billing_events").upsert(
    {
      stripe_event_id: values.stripeEventId,
      event_type: values.eventType,
      processing_status: values.processingStatus ?? "processed",
      error_message: values.errorMessage ?? null,
      processed_at: new Date().toISOString(),
    },
    { onConflict: "stripe_event_id" },
  );

  if (error) throw new Error("billing_event_record_failed");
}

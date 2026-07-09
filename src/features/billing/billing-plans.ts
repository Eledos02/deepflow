export const checkoutPlans = ["monthly", "annual", "founder"] as const;

export type CheckoutPlan = (typeof checkoutPlans)[number];

export type BillingPlanKey = "monthly" | "annual" | "founding_member";

export type BillingPlanDefinition = {
  checkoutPlan: CheckoutPlan;
  planKey: BillingPlanKey;
  label: string;
  priceId: string;
};

export type FounderAvailabilityConfig = {
  active: boolean;
  maxSubscriptions: number | null;
  endsAt: string | null;
};

export type StripeBillingEnvironment = Record<string, string | undefined> & {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_MONTHLY_PRICE_ID?: string;
  STRIPE_ANNUAL_PRICE_ID?: string;
  STRIPE_FOUNDER_PRICE_ID?: string;
  FOUNDER_PLAN_ACTIVE?: string;
  FOUNDER_PLAN_MAX_SUBSCRIPTIONS?: string;
  FOUNDER_PLAN_ENDS_AT?: string;
  NEXT_PUBLIC_SITE_URL?: string;
};

export type StripeBillingConfig = {
  secretKey: string;
  webhookSecret: string | null;
  publishableKey: string | null;
  siteUrl: string;
  plans: Record<CheckoutPlan, BillingPlanDefinition>;
  founder: FounderAvailabilityConfig;
};

export type StripeBillingConfigError =
  | "stripe_secret_key_missing"
  | "stripe_monthly_price_id_missing"
  | "stripe_annual_price_id_missing"
  | "stripe_founder_price_id_missing"
  | "invalid_site_url";

export type StripeBillingConfigResult =
  | { ok: true; config: StripeBillingConfig }
  | { ok: false; error: StripeBillingConfigError };

export type FounderAvailabilityResult =
  | { available: true }
  | { available: false; reason: "inactive" | "ended" | "limit_reached" | "count_unavailable" };

function optionalValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function requiredValue(value: string | undefined) {
  return optionalValue(value);
}

function parseBoolean(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

function parsePositiveInteger(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function resolveSiteUrl(value: string | undefined, fallback: string) {
  const candidate = value?.trim() || fallback;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function parseCheckoutPlan(value: unknown): CheckoutPlan | null {
  if (typeof value !== "string") return null;
  return checkoutPlans.includes(value as CheckoutPlan)
    ? (value as CheckoutPlan)
    : null;
}

export function getStripeBillingConfig(
  environment: StripeBillingEnvironment,
  fallbackSiteUrl: string,
): StripeBillingConfigResult {
  const secretKey = requiredValue(environment.STRIPE_SECRET_KEY);
  if (!secretKey) return { ok: false, error: "stripe_secret_key_missing" };

  const monthlyPriceId = requiredValue(environment.STRIPE_MONTHLY_PRICE_ID);
  if (!monthlyPriceId) {
    return { ok: false, error: "stripe_monthly_price_id_missing" };
  }

  const annualPriceId = requiredValue(environment.STRIPE_ANNUAL_PRICE_ID);
  if (!annualPriceId) {
    return { ok: false, error: "stripe_annual_price_id_missing" };
  }

  const founderPriceId = requiredValue(environment.STRIPE_FOUNDER_PRICE_ID);
  if (!founderPriceId) {
    return { ok: false, error: "stripe_founder_price_id_missing" };
  }

  const siteUrl = resolveSiteUrl(environment.NEXT_PUBLIC_SITE_URL, fallbackSiteUrl);
  if (!siteUrl) return { ok: false, error: "invalid_site_url" };

  return {
    ok: true,
    config: {
      secretKey,
      webhookSecret: optionalValue(environment.STRIPE_WEBHOOK_SECRET),
      publishableKey: optionalValue(environment.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
      siteUrl,
      plans: {
        monthly: {
          checkoutPlan: "monthly",
          planKey: "monthly",
          label: "Monthly",
          priceId: monthlyPriceId,
        },
        annual: {
          checkoutPlan: "annual",
          planKey: "annual",
          label: "Annual",
          priceId: annualPriceId,
        },
        founder: {
          checkoutPlan: "founder",
          planKey: "founding_member",
          label: "Founding Member",
          priceId: founderPriceId,
        },
      },
      founder: {
        active: parseBoolean(environment.FOUNDER_PLAN_ACTIVE),
        maxSubscriptions: parsePositiveInteger(
          environment.FOUNDER_PLAN_MAX_SUBSCRIPTIONS,
        ),
        endsAt: optionalValue(environment.FOUNDER_PLAN_ENDS_AT),
      },
    },
  };
}

export function getSafeBillingConfigMessage(error: StripeBillingConfigError) {
  if (error === "invalid_site_url") {
    return "Billing is not configured correctly yet.";
  }

  return "Billing is not active yet.";
}

export function resolveRequestOrigin(request: Request, configuredSiteUrl: string) {
  const requestUrl = new URL(request.url);
  const originHeader = request.headers.get("origin");
  const candidate = originHeader || requestUrl.origin;

  try {
    const originUrl = new URL(candidate);
    const host = originUrl.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return originUrl.origin;
    }
  } catch {
    // Fall through to configured production origin.
  }

  return configuredSiteUrl;
}

export function checkFounderAvailability({
  config,
  activeFounderCount,
  now = new Date(),
}: {
  config: FounderAvailabilityConfig;
  activeFounderCount: number | null;
  now?: Date;
}): FounderAvailabilityResult {
  if (!config.active) return { available: false, reason: "inactive" };

  if (config.endsAt) {
    const endsAtMs = Date.parse(config.endsAt);
    if (!Number.isFinite(endsAtMs) || now.getTime() >= endsAtMs) {
      return { available: false, reason: "ended" };
    }
  }

  if (config.maxSubscriptions !== null) {
    if (activeFounderCount === null) {
      return { available: false, reason: "count_unavailable" };
    }

    if (activeFounderCount >= config.maxSubscriptions) {
      return { available: false, reason: "limit_reached" };
    }
  }

  return { available: true };
}

export function planFromPriceId(
  priceId: string | null | undefined,
  plans: Record<CheckoutPlan, BillingPlanDefinition>,
) {
  if (!priceId) return null;

  return (
    checkoutPlans
      .map((plan) => plans[plan])
      .find((plan) => plan.priceId === priceId) ?? null
  );
}

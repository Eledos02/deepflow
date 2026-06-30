import { siteConfig } from "../site";

export type StripeServerEnvironment = Record<string, string | undefined> & {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_FOUNDER_PRICE_ID?: string;
  NEXT_PUBLIC_SITE_URL?: string;
};

export type StripeServerConfig = {
  secretKey: string;
  webhookSecret: string | null;
  publishableKey: string | null;
  founderPriceId: string | null;
  siteUrl: string;
};

export type StripeConfigResult =
  | { ok: true; config: StripeServerConfig }
  | { ok: false; error: "stripe_secret_key_missing" | "invalid_site_url" };

export type StripeWebhookConfigResult =
  | { ok: true; secret: string }
  | { ok: false; error: "stripe_webhook_secret_missing" };

function optionalSecret(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function resolveSiteUrl(value: string | undefined) {
  const candidate = value?.trim() || siteConfig.url;

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

export function getStripeServerConfig(
  environment: StripeServerEnvironment = process.env,
): StripeConfigResult {
  const secretKey = optionalSecret(environment.STRIPE_SECRET_KEY);
  if (!secretKey) return { ok: false, error: "stripe_secret_key_missing" };

  const siteUrl = resolveSiteUrl(environment.NEXT_PUBLIC_SITE_URL);
  if (!siteUrl) return { ok: false, error: "invalid_site_url" };

  return {
    ok: true,
    config: {
      secretKey,
      webhookSecret: optionalSecret(environment.STRIPE_WEBHOOK_SECRET),
      publishableKey: optionalSecret(environment.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
      founderPriceId: optionalSecret(environment.STRIPE_FOUNDER_PRICE_ID),
      siteUrl,
    },
  };
}

export function getStripeWebhookConfig(
  environment: StripeServerEnvironment = process.env,
): StripeWebhookConfigResult {
  const secret = optionalSecret(environment.STRIPE_WEBHOOK_SECRET);
  return secret
    ? { ok: true, secret }
    : { ok: false, error: "stripe_webhook_secret_missing" };
}

export function getSafeStripeConfigErrorMessage(
  error: Extract<StripeConfigResult, { ok: false }>["error"],
) {
  if (error === "invalid_site_url") {
    return "Billing is not configured correctly yet.";
  }

  return "Billing is not active yet.";
}

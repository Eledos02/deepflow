"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getBillingAccessToken } from "@/components/marketing/billing-checkout-button";

type BillingPlanPayload = {
  status: string;
  label: string;
  isPaid: boolean;
  isFounder: boolean;
  canUseFounderFeatures: boolean;
  planKey: string | null;
  hasCustomer: boolean;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
};

type BillingStatusPayload = {
  ok?: boolean;
  billingActive?: boolean;
  plan?: BillingPlanPayload;
};

function formatPeriodEnd(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function billingStatusCopy(plan: BillingPlanPayload | null) {
  if (!plan) return "Checking billing status...";
  if (plan.isPaid) {
    if (plan.cancelAtPeriodEnd) return "Cancels at period end";
    return "Active";
  }
  if (plan.status === "past_due" || plan.status === "unpaid") {
    return "Payment issue";
  }
  return "Free";
}

export function AccountBillingPanel() {
  const [plan, setPlan] = useState<BillingPlanPayload | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isManaging, setIsManaging] = useState(false);

  useEffect(() => {
    let canceled = false;

    async function loadBillingStatus() {
      setIsLoading(true);
      const token = await getBillingAccessToken();

      if (!token) {
        if (!canceled) {
          setPlan({
            status: "none",
            label: "Free",
            isPaid: false,
            isFounder: false,
            canUseFounderFeatures: false,
            planKey: null,
            hasCustomer: false,
          });
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await fetch("/api/billing/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json() as BillingStatusPayload;
        if (!canceled) {
          setPlan(payload.plan ?? null);
          setError("");
        }
      } catch {
        if (!canceled) {
          setError("Could not check billing right now.");
        }
      } finally {
        if (!canceled) setIsLoading(false);
      }
    }

    void loadBillingStatus();

    return () => {
      canceled = true;
    };
  }, []);

  const manageBilling = async () => {
    setError("");
    setIsManaging(true);
    const token = await getBillingAccessToken();

    if (!token) {
      setError("Sign in again to manage billing.");
      setIsManaging(false);
      return;
    }

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json() as {
        ok?: boolean;
        url?: string;
        detail?: string;
      };

      if (!response.ok || !payload.ok || !payload.url) {
        setError(payload.detail || "Billing management is not available yet.");
        setIsManaging(false);
        return;
      }

      window.location.assign(payload.url);
    } catch {
      setError("Could not open billing management right now.");
      setIsManaging(false);
    }
  };

  const periodEnd = formatPeriodEnd(plan?.currentPeriodEnd);

  return (
    <>
      <article>
        <span>Current plan</span>
        <strong>{isLoading ? "Checking..." : plan?.label ?? "Free"}</strong>
        <p>{billingStatusCopy(plan)}</p>
        {periodEnd ? <p>Current period ends {periodEnd}.</p> : null}
      </article>
      <article>
        <span>Billing</span>
        <strong>{plan?.hasCustomer ? "Manage in Stripe" : "No paid billing yet"}</strong>
        <p>
          Paid status comes from verified Stripe webhooks, not checkout return
          URLs.
        </p>
        {plan?.hasCustomer ? (
          <button
            className="button button--ghost"
            disabled={isManaging}
            onClick={() => void manageBilling()}
            type="button"
          >
            {isManaging ? "Opening..." : "Manage billing"}
          </button>
        ) : (
          <Link href="/pricing">View pricing</Link>
        )}
        {error ? <p className="billing-action__error" role="alert">{error}</p> : null}
      </article>
    </>
  );
}

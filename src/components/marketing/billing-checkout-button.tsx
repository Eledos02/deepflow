"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import type { CheckoutPlan } from "@/features/billing/billing-plans";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type BillingCheckoutButtonProps = {
  plan: CheckoutPlan;
  children: React.ReactNode;
  className?: string;
};

export async function getBillingAccessToken() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) return null;

  return data.session?.access_token ?? null;
}

export function BillingCheckoutButton({
  plan,
  children,
  className = "button button--dark button--full",
}: BillingCheckoutButtonProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const startCheckout = async () => {
    setError("");

    if (!user) {
      router.push(`/signup?billing_plan=${encodeURIComponent(plan)}`);
      return;
    }

    setIsLoading(true);
    const token = await getBillingAccessToken();
    if (!token) {
      setIsLoading(false);
      router.push(`/login?billing_plan=${encodeURIComponent(plan)}`);
      return;
    }

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });
      const payload = await response.json() as {
        ok?: boolean;
        url?: string;
        error?: string;
        detail?: string;
      };

      if (!response.ok || !payload.ok || !payload.url) {
        setError(
          payload.error === "founder_unavailable"
            ? "The Founding Member price is no longer available."
            : payload.detail || "Could not start checkout right now.",
        );
        setIsLoading(false);
        return;
      }

      window.location.assign(payload.url);
    } catch {
      setError("Could not start checkout right now.");
      setIsLoading(false);
    }
  };

  return (
    <div className="billing-action">
      <button
        className={className}
        disabled={isLoading}
        onClick={() => void startCheckout()}
        type="button"
      >
        {isLoading ? "Opening checkout..." : children}
      </button>
      {error ? <p className="billing-action__error" role="alert">{error}</p> : null}
    </div>
  );
}

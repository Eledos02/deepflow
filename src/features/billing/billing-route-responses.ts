import { NextResponse } from "next/server";

export const BILLING_NOT_ACTIVE_MESSAGE = "Billing is not active yet.";

export function billingNotActiveResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "billing_not_active",
      detail: BILLING_NOT_ACTIVE_MESSAGE,
    },
    { status: 501 },
  );
}

export function billingStatusResponse() {
  return NextResponse.json({
    ok: true,
    billingActive: false,
    plan: {
      status: "none",
      label: "Free",
      isPaid: false,
      isFounder: false,
      canUseFounderFeatures: false,
    },
  });
}

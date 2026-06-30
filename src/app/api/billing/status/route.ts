import { billingStatusResponse } from "../../../../features/billing/billing-route-responses";

export const runtime = "nodejs";

export async function GET() {
  return billingStatusResponse();
}

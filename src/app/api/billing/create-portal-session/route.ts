import { billingNotActiveResponse } from "../../../../features/billing/billing-route-responses";

export const runtime = "nodejs";

export async function POST() {
  return billingNotActiveResponse();
}

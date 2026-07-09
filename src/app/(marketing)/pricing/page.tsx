import Link from "next/link";

import { BillingCheckoutButton } from "@/components/marketing/billing-checkout-button";
import { FoundingMemberWaitlist } from "@/components/marketing/founding-member-waitlist";
import { InteractiveBrainwaveBackground } from "@/components/marketing/interactive-brainwave-background";
import {
  CheckIcon,
  ShieldIcon,
  TargetIcon,
  TimerIcon,
} from "@/components/ui/icons";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "DeepFlow Pricing",
  description:
    "DeepFlow is free to start, with optional Monthly, Annual, and limited Founding Member subscriptions managed through Stripe.",
  path: "/pricing",
  keywords: ["DeepFlow pricing", "Founding Member", "focus workspace"],
});

const freeFeatures = [
  "Focus timers, routines, weekly goals, Focus Journal, and Insights",
  "Use the Workspace without creating an account",
  "Create a free account for cloud backup of sessions, routines, and goals",
  "Notes Canvas and layout data remain local-only for now",
];

const monthlyFeatures = [
  "Support DeepFlow's focused product roadmap",
  "Use account cloud backup for sessions, routines, and goals",
  "Manage billing through the Stripe customer portal",
  "Keep the free local-first core available",
];

const annualFeatures = [
  "Lower yearly price for the same DeepFlow account features",
  "Stripe-managed subscription and renewal",
  "Cloud backup remains explicit and user-controlled",
  "Notes Canvas stays local-only for now",
];

const founderFeatures = [
  "Limited yearly launch price",
  "Founder subscription is managed through Stripe",
  "Available only while the launch offer remains open",
  "No lifetime-plan claim or local data changes",
];

export default function PricingPage() {
  return (
    <section className="pricing-page">
      <InteractiveBrainwaveBackground />
      <div className="shell">
        <div className="pricing-heading">
          <span className="eyebrow">Pricing</span>
          <h1>Start free. Upgrade only if it helps.</h1>
          <p>
            DeepFlow&apos;s local-first core remains free. Optional paid plans
            are handled through Stripe and never change cloud restore, sync, or
            Notes Canvas behavior.
          </p>
        </div>
        <div className="pricing-grid">
          <article className="price-card">
            <span className="price-card__eyebrow">Start now</span>
            <span className="price-card__label">Free core</span>
            <strong className="price-card__status">Available now</strong>
            <p>A calm focus workspace you can use before creating an account.</p>
            <Link className="button button--ghost button--full" href="/workspace">
              Start focusing
            </Link>
            <ul>
              {freeFeatures.map((feature) => (
                <li key={feature}>
                  <CheckIcon />
                  {feature}
                </li>
              ))}
            </ul>
          </article>
          <article className="price-card">
            <span className="price-card__eyebrow">Monthly</span>
            <span className="price-card__label">DeepFlow Monthly</span>
            <strong className="price-card__status">$4.99/mo</strong>
            <p>
              A flexible monthly subscription for people who want to support
              DeepFlow while keeping account backup available.
            </p>
            <BillingCheckoutButton plan="monthly">
              Choose monthly
            </BillingCheckoutButton>
            <ul>
              {monthlyFeatures.map((feature) => (
                <li key={feature}>
                  <CheckIcon />
                  {feature}
                </li>
              ))}
            </ul>
          </article>
          <article className="price-card">
            <span className="price-card__eyebrow">Annual</span>
            <span className="price-card__label">DeepFlow Annual</span>
            <strong className="price-card__status">$39/yr</strong>
            <p>
              A yearly subscription for people who know DeepFlow belongs in
              their focus rhythm.
            </p>
            <BillingCheckoutButton plan="annual">
              Choose annual
            </BillingCheckoutButton>
            <ul>
              {annualFeatures.map((feature) => (
                <li key={feature}>
                  <CheckIcon />
                  {feature}
                </li>
              ))}
            </ul>
          </article>
          <article className="price-card price-card--featured">
            <span className="price-card__badge">Limited</span>
            <span className="price-card__eyebrow">Launch price</span>
            <span className="price-card__label">Founding Member</span>
            <strong className="price-card__status">$29/yr</strong>
            <p>
              A limited yearly launch price for early supporters. Availability
              is checked on the server before checkout opens.
            </p>
            <BillingCheckoutButton
              className="button button--light button--full"
              plan="founder"
            >
              Choose Founder
            </BillingCheckoutButton>
            <small className="price-card__note">
              If the launch price is closed, checkout will not open.
            </small>
            <ul>
              {founderFeatures.map((feature) => (
                <li key={feature}>
                  <CheckIcon />
                  {feature}
                </li>
              ))}
            </ul>
          </article>
        </div>
        <section
          aria-labelledby="founding-member-title"
          className="founding-waitlist"
          id="founding-member"
        >
          <div className="founding-waitlist__hero">
            <div>
              <span className="founding-waitlist__badge">
                Limited early access
              </span>
              <h2 id="founding-member-title">Founding Member launch updates.</h2>
              <p className="founding-waitlist__description">
                Join the list if you want updates about launch pricing,
                billing changes, and what DeepFlow is building next.
              </p>
              <p className="founding-waitlist__subtext">
                Checkout is handled through Stripe. Waitlist signup never
                creates a subscription.
              </p>
            </div>
            <FoundingMemberWaitlist source="pricing_founding_member" />
          </div>
        </section>
        <div className="pricing-assurance">
          <article>
            <TimerIcon />
            <div>
              <strong>Useful before paid access exists</strong>
              <p>The core timer remains free and starts without an account.</p>
            </div>
          </article>
          <article>
            <ShieldIcon />
            <div>
              <strong>Privacy is a product choice</strong>
              <p>Your focus practice should not become another attention feed.</p>
            </div>
          </article>
          <article>
            <TargetIcon />
            <div>
              <strong>Billing status comes from Stripe webhooks</strong>
              <p>Checkout redirects never activate paid access by themselves.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

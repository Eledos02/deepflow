import Link from "next/link";

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
  title: "DeepFlow Pricing and Founding Member Updates",
  description:
    "DeepFlow is free to start. Founding Member access is coming soon, and pricing will be introduced after the free core experience is stable.",
  path: "/pricing",
  keywords: ["DeepFlow pricing", "Founding Member", "focus workspace"],
});

const freeFeatures = [
  "Focus timers, routines, weekly goals, Focus Journal, and Insights",
  "Use the Workspace without creating an account",
  "Create a free account for cloud backup of sessions, routines, and goals",
  "Notes Canvas and layout data remain local-only for now",
];

const foundingNotes = [
  "Founding Member access is coming soon",
  "Pricing will be shared before anything paid opens",
  "No checkout, billing, or payment flow is active yet",
  "The free core experience remains the priority",
];

export default function PricingPage() {
  return (
    <section className="pricing-page">
      <InteractiveBrainwaveBackground />
      <div className="shell">
        <div className="pricing-heading">
          <span className="eyebrow">Pricing</span>
          <h1>Start free. Founder access comes later.</h1>
          <p>
            DeepFlow is focused on making the free core experience stable
            before introducing supporter access. There is no checkout today.
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
          <article className="price-card price-card--featured">
            <span className="price-card__badge">No checkout</span>
            <span className="price-card__eyebrow">Coming soon</span>
            <span className="price-card__label">Founding Member</span>
            <strong className="price-card__status">Coming soon</strong>
            <p>
              Early supporter access will open after the free core experience
              is stable.
            </p>
            <a className="button button--light button--full" href="#founding-member">
              Join updates
            </a>
            <small className="price-card__note">
              Payments are not active yet.
            </small>
            <ul>
              {foundingNotes.map((feature) => (
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
              <h2 id="founding-member-title">Founding Member access is coming soon.</h2>
              <p className="founding-waitlist__description">
                Join the list if you want an update when DeepFlow is ready to
                introduce supporter access.
              </p>
              <p className="founding-waitlist__subtext">
                No payment today. Pricing will be introduced after the free core
                experience is stable.
              </p>
            </div>
            <FoundingMemberWaitlist source="pricing_founding_member" />
          </div>
        </section>
        <div className="pricing-assurance">
          <article>
            <TimerIcon />
            <div>
              <strong>Useful before you upgrade</strong>
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
              <strong>Pricing will be clear before it opens</strong>
              <p>No billing is active, and no plan is required to start.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

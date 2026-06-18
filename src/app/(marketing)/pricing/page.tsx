import Link from "next/link";

import { InteractiveBrainwaveBackground } from "@/components/marketing/interactive-brainwave-background";
import {
  CheckIcon,
  ShieldIcon,
  TargetIcon,
  TimerIcon,
} from "@/components/ui/icons";
import { createMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata = createMetadata({
  title: "Pricing",
  description:
    "Start focusing for free. Upgrade to DeepFlow Pro for history, goals, insights, and distraction blocking.",
  path: "/pricing",
  keywords: ["DeepFlow pricing", "focus app pricing"],
});

const freeFeatures = [
  "Focus, Pomodoro, and countdown timers",
  "Unlimited local sessions",
  "Common timer durations",
  "No account required",
];

const proFeatures = [
  "Everything in Free",
  "Cross-device session history",
  "Weekly goals and focus insights",
  "Saved routines and soundscapes",
  "Distraction blocking",
];

const earlyAccessUrl = `mailto:${siteConfig.email}?subject=DeepFlow%20Pro%20early%20access`;

export default function PricingPage() {
  return (
    <section className="pricing-page">
      <InteractiveBrainwaveBackground />
      <div className="shell">
        <div className="pricing-heading">
          <span className="eyebrow">Simple pricing</span>
          <h1>Start free. Build a deeper practice when you are ready.</h1>
          <p>
            The core timer stays useful without an account. Pro turns individual
            sessions into a durable focus system.
          </p>
        </div>
        <div className="pricing-grid">
          <article className="price-card">
            <span className="price-card__eyebrow">Start now</span>
            <span className="price-card__label">Free</span>
            <h2>$0</h2>
            <p>The essential focus toolkit, available without an account.</p>
            <Link className="button button--ghost button--full" href="/tools/focus-timer">
              Start focusing free
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
            <span className="price-card__badge">Early access</span>
            <span className="price-card__eyebrow">Build a practice</span>
            <span className="price-card__label">Pro</span>
            <h2>
              $8 <small>/ month</small>
            </h2>
            <p>Founding pricing for people ready to make focus repeatable.</p>
            <a className="button button--light button--full" href={earlyAccessUrl}>
              Request early access
            </a>
            <small className="price-card__note">No charge today. We will email you before launch.</small>
            <ul>
              {proFeatures.map((feature) => (
                <li key={feature}>
                  <CheckIcon />
                  {feature}
                </li>
              ))}
            </ul>
          </article>
        </div>
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
              <strong>Pay for durable value</strong>
              <p>Pro is designed around history, goals, routines, and insight.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

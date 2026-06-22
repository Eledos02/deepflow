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

const premiumAudioFeatures = [
  "Rain Window",
  "Fireplace",
  "Forest Cabin",
  "Ocean Waves",
  "Coffee Shop",
  "Deep Focus Brown Noise",
  "Night Crickets",
  "Soft Wind",
  "Thunderstorm",
  "Library Ambience",
];

const focusEnvironments = [
  {
    title: "Rain Window Environment",
    description:
      "Animated rain on a virtual window with subtle weather effects.",
  },
  {
    title: "Fireplace Environment",
    description:
      "A warm fireplace with gentle animated flames and ambient glow.",
  },
  {
    title: "Forest Cabin Environment",
    description:
      "A peaceful cabin overlooking a forest with subtle motion.",
  },
  {
    title: "Ocean View Environment",
    description:
      "Relaxing ocean scenery with slow-moving waves.",
  },
  {
    title: "Night Studio Environment",
    description:
      "A calm night workspace with city lights and atmospheric ambience.",
  },
  {
    title: "Mountain Sunrise Environment",
    description:
      "A beautiful sunrise scene with gradual lighting changes.",
  },
];

const productivityFeatures = [
  "Cloud Sync Across Devices",
  "Unlimited Focus History",
  "Advanced Focus Analytics",
  "Weekly Insights & Reports",
  "Focus Goals & Milestones",
  "Priority Access To New Features",
  "Founding Member Badge",
  "Lock In Your Price Forever",
];

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
            <span className="price-card__badge">Future Pro</span>
            <span className="price-card__eyebrow">Coming soon</span>
            <span className="price-card__label">Pro plan</span>
            <h2>
              $8 <small>/ month</small>
            </h2>
            <p>Planned subscription for people ready to make focus repeatable.</p>
            <a className="button button--light button--full" href="#founding-member">
              Join lifetime waitlist
            </a>
            <small className="price-card__note">
              Payments are not active yet. Founding Member access opens first.
            </small>
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
              <h2 id="founding-member-title">Become a Founding Member</h2>
              <p className="founding-waitlist__price">
                $19 Lifetime Access - coming soon
              </p>
              <p className="founding-waitlist__description">
                Support the development of DeepFlow and lock in lifetime access
                to DeepFlow Pro as the product evolves.
              </p>
              <p className="founding-waitlist__subtext">
                Join the Founding Member list today. No payment required.
                We&apos;ll notify you before lifetime access opens and before the
                launch price expires.
              </p>
            </div>
            <FoundingMemberWaitlist source="pricing_founding_member" />
          </div>

          <div className="founding-feature-grid">
            <article className="founding-feature-card founding-feature-card--audio">
              <span className="eyebrow">Premium Audio Library</span>
              <ul>
                {premiumAudioFeatures.map((feature) => (
                  <li key={feature}>
                    <CheckIcon />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>

            <article className="founding-feature-card founding-feature-card--wide">
              <span className="eyebrow">Focus Environments</span>
              <h3>Transform your timer into a calm environment designed for deep work.</h3>
              <div className="founding-environment-grid">
                {focusEnvironments.map((environment) => (
                  <div key={environment.title}>
                    <strong>{environment.title}</strong>
                    <p>{environment.description}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="founding-feature-card founding-feature-card--productivity">
              <span className="eyebrow">Productivity Features</span>
              <ul>
                {productivityFeatures.map((feature) => (
                  <li key={feature}>
                    <CheckIcon />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
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
              <strong>Pay for durable value</strong>
              <p>Pro is designed around history, goals, routines, and insight.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

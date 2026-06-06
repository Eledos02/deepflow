import Link from "next/link";

import { BenefitGrid } from "@/components/marketing/benefit-grid";
import { ConversionCard } from "@/components/marketing/conversion-card";
import { ProductPreview } from "@/components/marketing/product-preview";
import { TimerExperience } from "@/components/product/timer-experience";
import {
  ArrowIcon,
  CheckIcon,
  ShieldIcon,
  SparkIcon,
  TargetIcon,
  TimerIcon,
} from "@/components/ui/icons";
import { timerTools } from "@/content/timer-tools";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Focus better. Finish what matters.",
  description:
    "A calm, accurate focus timer for deep work, Pomodoro sessions, and distraction-free productivity.",
  path: "/",
  keywords: ["focus timer", "deep work", "pomodoro timer", "productivity"],
});

const focusTool = timerTools[0];

const productBenefits = [
  {
    title: "Plan with intention",
    description:
      "Turn a vague workload into a small number of meaningful focus blocks.",
  },
  {
    title: "Focus without friction",
    description:
      "Start instantly with a quiet timer designed to disappear once work begins.",
  },
  {
    title: "Learn from your attention",
    description:
      "Use session history and weekly patterns to protect more of your best hours.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero__glow hero__glow--one" />
        <div className="hero__glow hero__glow--two" />
        <div className="shell hero__grid">
          <div className="hero__copy">
            <span className="announcement">
              <SparkIcon width={16} height={16} />
              Your attention is worth protecting
            </span>
            <h1>
              Focus better.
              <br />
              <em>Finish what matters.</em>
            </h1>
            <p className="hero__lede">
              Plan focused sessions, work without distraction, and understand
              where your attention goes.
            </p>
            <div className="hero__actions">
              <Link className="button button--dark button--large" href="/tools/focus-timer">
                Start focusing free
                <ArrowIcon />
              </Link>
              <Link className="button button--ghost button--large" href="/#product">
                See the product
              </Link>
            </div>
            <div className="hero__trust">
              <span>
                <CheckIcon width={17} height={17} />
                No signup to start
              </span>
              <span>
                <ShieldIcon width={17} height={17} />
                Private by default
              </span>
            </div>
          </div>
          <div className="hero__product">
            <div className="product-window">
              <div className="product-window__bar">
                <span />
                <span />
                <span />
                <p>deepflow.app/focus</p>
              </div>
              <TimerExperience tool={focusTool} />
            </div>
            <div className="floating-note floating-note--top">
              <span>Weekly goal</span>
              <strong>76% complete</strong>
            </div>
            <div className="floating-note floating-note--bottom">
              <span className="focus-dot" />
              <div>
                <strong>Focus protected</strong>
                <span>One task at a time</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="proof-strip" aria-label="DeepFlow principles">
        <div className="shell proof-strip__inner">
          <span>Designed for</span>
          <strong>Writers</strong>
          <i />
          <strong>Developers</strong>
          <i />
          <strong>Students</strong>
          <i />
          <strong>Creative teams</strong>
        </div>
      </section>

      <section className="section product-section" id="product">
        <div className="shell">
          <div className="section-heading product-section__heading">
            <div>
              <span className="eyebrow">Beyond the timer</span>
              <h2>A calm operating system for focused work.</h2>
            </div>
            <div className="product-section__intro">
              <p>
                The free timer helps you begin. DeepFlow Pro connects each
                session into a system for planning, consistency, and insight.
              </p>
              <Link className="text-arrow-link" href="/pricing">
                Explore the roadmap
                <ArrowIcon />
              </Link>
            </div>
          </div>
          <ProductPreview />
          <div className="product-capabilities" aria-label="DeepFlow capabilities">
            <span>
              <TargetIcon />
              Weekly focus goals
            </span>
            <span>
              <TimerIcon />
              Saved routines
            </span>
            <span>
              <ShieldIcon />
              Distraction protection
            </span>
            <span>
              <SparkIcon />
              Attention insights
            </span>
          </div>
        </div>
      </section>

      <section className="section section--roomy">
        <div className="shell">
          <div className="section-heading section-heading--split">
            <div>
              <span className="eyebrow">A complete attention loop</span>
              <h2>Structure the work without over-managing it.</h2>
            </div>
            <p>
              DeepFlow gives important work a clear beginning, a protected
              middle, and enough context to improve the next session.
            </p>
          </div>
          <BenefitGrid items={productBenefits} />
        </div>
      </section>

      <section className="section workflow-section">
        <div className="shell workflow-grid">
          <div className="workflow-visual">
            <div className="orbit orbit--outer" />
            <div className="orbit orbit--inner" />
            <div className="workflow-clock">
              <TimerIcon width={34} height={34} />
              <strong>50:00</strong>
              <span>Deep work</span>
            </div>
            <span className="orbit-label orbit-label--one">Plan</span>
            <span className="orbit-label orbit-label--two">Focus</span>
            <span className="orbit-label orbit-label--three">Recover</span>
          </div>
          <div className="workflow-copy">
            <span className="eyebrow">A repeatable practice</span>
            <h2>Build momentum without burning through attention.</h2>
            <p>
              Pick one outcome, choose an interval, and let the timer hold the
              boundary. When the session ends, step away before you begin again.
            </p>
            <ol className="workflow-steps">
              <li>
                <span>01</span>
                <div>
                  <strong>Choose one meaningful task</strong>
                  <p>Make the next outcome specific enough to start.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Protect a block of time</strong>
                  <p>Use 25, 50, or 90 minutes to match your energy.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Return tomorrow</strong>
                  <p>Consistency builds focus more reliably than intensity.</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <ConversionCard placement="homepage" />
        </div>
      </section>
    </>
  );
}

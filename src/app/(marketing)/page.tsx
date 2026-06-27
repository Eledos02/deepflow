import Link from "next/link";

import { BenefitGrid } from "@/components/marketing/benefit-grid";
import { ConversionCard } from "@/components/marketing/conversion-card";
import { FoundingMemberWaitlist } from "@/components/marketing/founding-member-waitlist";
import { InteractiveBrainwaveBackground } from "@/components/marketing/interactive-brainwave-background";
import { ProductPreview } from "@/components/marketing/product-preview";
import { TimerExperience } from "@/components/product/timer-experience";
import {
  ArrowIcon,
  ChartIcon,
  CheckIcon,
  LayersIcon,
  ShieldIcon,
  SparkIcon,
  TargetIcon,
  TimerIcon,
} from "@/components/ui/icons";
import { timerTools } from "@/content/timer-tools";
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "DeepFlow - Calm Focus Workspace for Deep Work",
  description:
    "DeepFlow helps you plan focused work sessions, build routines, track weekly goals, and reflect on your focus rhythm in a calm, distraction-light workspace.",
  path: "/",
  keywords: ["focus workspace", "deep work", "focus timer", "weekly goals"],
});

const focusTool = timerTools[0];

const productBenefits = [
  {
    title: "Start with one clear next action",
    description:
      "Name the work, choose a length that feels possible, and let the timer hold the boundary.",
  },
  {
    title: "Keep the whole practice in one place",
    description:
      "Completed sessions become a private journal, calm notes, routines, goals, and a clearer workspace.",
  },
  {
    title: "Learn your natural rhythm",
    description:
      "Notice your strongest focus windows, steady habits, and momentum without turning attention into a score.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <InteractiveBrainwaveBackground />
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
              DeepFlow is a calm focus workspace for timed work sessions,
              routines, goals, and reflection - designed to help you stay with
              one meaningful task at a time.
            </p>
            <div className="hero__actions">
              <Link className="button button--dark button--large" href="/workspace">
                Start focusing
                <ArrowIcon />
              </Link>
              <Link className="button button--ghost button--large" href="/signup">
                Create free account
              </Link>
            </div>
            <div className="hero__waitlist">
              <span>Founding Member updates</span>
              <FoundingMemberWaitlist source="homepage_hero" variant="compact" />
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
            <p className="hero__local-note">
              Use it without an account. Sign in when you want cloud backup
              across devices.
            </p>
          </div>
          <div className="hero__product">
            <div className="product-window">
              <div className="product-window__bar">
                <span />
                <span />
                <span />
                <p>deepflownow.com/focus</p>
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
          <span>Built for</span>
          <strong>Writers</strong>
          <i />
          <strong>Developers</strong>
          <i />
          <strong>Students</strong>
          <i />
          <strong>Independent builders</strong>
        </div>
      </section>

      <section className="section product-section" id="product">
        <div className="shell">
          <div className="section-heading product-section__heading">
            <div>
              <span className="eyebrow">What DeepFlow is</span>
              <h2>DeepFlow is a calm workspace for focused work.</h2>
            </div>
            <div className="product-section__intro">
              <p>
                Start a timer, save routines, set weekly goals, reflect in the
                Focus Journal, and review insights without turning your work
                into a noisy dashboard.
              </p>
              <Link className="text-arrow-link" href="/workspace">
                Explore the Workspace
                <ArrowIcon />
              </Link>
              <Link className="text-arrow-link" href="/adhd-timer">
                Try the ADHD-friendly timer
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
              <SparkIcon />
              Notes Canvas
            </span>
            <span>
              <ChartIcon />
              Attention insights
            </span>
            <span>
              <ShieldIcon />
              Account cloud backup
            </span>
            <span>
              <TimerIcon />
              Notes Canvas local-only
            </span>
          </div>
        </div>
      </section>

      <section className="section section--roomy">
        <div className="shell">
          <div className="section-heading section-heading--split">
            <div>
              <span className="eyebrow">For scattered attention</span>
              <h2>Make the next focused session easier to begin.</h2>
            </div>
            <p>
              DeepFlow is for people who feel pulled between tabs, tasks, and
              half-finished ideas. It gives important work a clear beginning, a
              protected middle, and enough reflection to return with less
              friction.
            </p>
          </div>
          <BenefitGrid items={productBenefits} />
        </div>
      </section>

      <section className="section product-pillars">
        <div className="shell">
          <div className="section-heading section-heading--center">
            <span className="eyebrow">A complete focus practice</span>
            <h2>Keep the timer simple. Let the system grow around it.</h2>
          </div>
          <div className="product-pillars__grid">
            <article>
              <TimerIcon />
              <h3>Focus sessions</h3>
              <p>Set an intention, choose a calm interval, and keep the session visible with the mini player.</p>
            </article>
            <article>
              <LayersIcon />
              <h3>Workspace</h3>
              <p>Bring your Focus Journal, goals, notes, routines, and quiet patterns into one private place.</p>
            </article>
            <article>
              <TargetIcon />
              <h3>Routines and insights</h3>
              <p>Save the sessions you repeat, then notice your best days, focus windows, momentum, and reflection.</p>
            </article>
            <article>
              <SparkIcon />
              <h3>Notes Canvas</h3>
              <p>Collect loose thoughts, connect ideas, and keep useful context nearby. Notes Canvas and layout data remain local-only for now.</p>
            </article>
            <article>
              <ShieldIcon />
              <h3>Account cloud backup</h3>
              <p>Save sessions, routines, and goals to your account, restore them on another device, and recover access with password reset.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section local-first-section">
        <div className="shell">
          <div className="local-first-panel">
            <span className="eyebrow">Local-first by design</span>
            <h2>Your workspace starts on this device.</h2>
            <p>
              Your focus sessions, routines, and goals can be backed up to your
              account. Notes Canvas and layout data remain local-only for now.
            </p>
            <Link className="text-arrow-link" href="/signup">
              Create free account
              <ArrowIcon />
            </Link>
          </div>
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

      <section className="section home-waitlist-section" aria-labelledby="home-waitlist-title">
        <div className="shell">
          <div className="home-waitlist">
            <div>
              <span className="eyebrow">Founder teaser</span>
              <h2 id="home-waitlist-title">Founding Member access is coming soon.</h2>
              <p>Pricing will be introduced after the free core experience is stable.</p>
            </div>
            <FoundingMemberWaitlist source="homepage_final_cta" variant="compact" />
          </div>
        </div>
      </section>
    </>
  );
}

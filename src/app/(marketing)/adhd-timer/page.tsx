import Link from "next/link";

import { BenefitGrid } from "@/components/marketing/benefit-grid";
import { ConversionCard } from "@/components/marketing/conversion-card";
import { InteractiveBrainwaveBackground } from "@/components/marketing/interactive-brainwave-background";
import { ToolLinks } from "@/components/marketing/tool-links";
import { TimerExperience } from "@/components/product/timer-experience";
import { FaqSection } from "@/components/seo/faq-section";
import { JsonLd } from "@/components/seo/json-ld";
import { ArrowIcon, SparkIcon, TargetIcon, TimerIcon } from "@/components/ui/icons";
import { getTimerPath } from "@/config/timers";
import { getTimerTool, type TimerTool } from "@/content/timer-tools";
import type { FaqItem } from "@/content/types";
import { createMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";
import {
  createFaqSchema,
  createSoftwareApplicationSchema,
} from "@/lib/structured-data";

const description =
  "Use a calm ADHD-friendly timer to start tasks, reduce friction, and stay focused with simple sessions, ambient audio, and a distraction-light workspace.";

const faqs: FaqItem[] = [
  {
    question: "Is this a medical ADHD tool?",
    answer:
      "No. DeepFlow is not a medical tool and does not diagnose, treat, or cure ADHD. It is a calm productivity timer designed to reduce friction around starting and continuing focus sessions.",
  },
  {
    question: "What timer length is best for ADHD?",
    answer:
      "Many people prefer shorter sessions like 5, 10, 15, or 25 minutes. DeepFlow lets you choose the length that feels easiest to start.",
  },
  {
    question: "Can I use ambient audio?",
    answer:
      "Yes. DeepFlow includes calm audio options, and you can keep the experience silent when that works better for you.",
  },
  {
    question: "Can I track completed sessions?",
    answer:
      "Yes. Completed focus sessions can appear in the Focus Journal and Workspace insights, stored locally in your browser.",
  },
];

const sessionOptions = [
  {
    minutes: 5,
    title: "5 min task start",
    description: "Open the document, name the next action, and make beginning smaller.",
  },
  {
    minutes: 10,
    title: "10 min reset",
    description: "Use a short boundary to return after an interruption or low-energy moment.",
  },
  {
    minutes: 15,
    title: "15 min focus block",
    description: "Give one useful task enough room to become easier than avoiding it.",
  },
  {
    minutes: 25,
    title: "25 min classic session",
    description: "Settle into a familiar block with one intention and a clear finish.",
  },
  {
    minutes: 45,
    title: "45 min deep work block",
    description: "Protect a longer stretch when attention has already found its footing.",
  },
] as const;

const focusTool = getTimerTool("focus-timer");

if (!focusTool) {
  throw new Error("Focus timer configuration is missing");
}

const adhdTimerTool: TimerTool = {
  ...focusTool,
  slug: "adhd-timer",
  eyebrow: "ADHD-friendly focus timer",
  title: "ADHD Timer",
  shortTitle: "ADHD Focus",
  description,
  defaultMinutes: 25,
  presets: sessionOptions.map((session) => session.minutes),
  keywords: [
    "ADHD timer",
    "ADHD-friendly timer",
    "focus timer",
    "task start timer",
    "calm productivity timer",
  ],
  benefits: [
    {
      title: "Make the next action visible",
      description:
        "Write one small intention before you begin, so the timer protects a choice you have already made.",
    },
    {
      title: "Choose a session that feels possible",
      description:
        "Start with five or ten minutes when needed, then use longer blocks when your attention has settled.",
    },
    {
      title: "Keep support close, not loud",
      description:
        "Use ambient audio, the mini player, and a distraction-light workspace only when they help your focus.",
    },
  ],
  faqs,
};

export const metadata = createMetadata({
  title: "ADHD Timer - A Calm Focus Timer for Starting and Staying on Task",
  description,
  path: "/adhd-timer",
  keywords: adhdTimerTool.keywords,
});

export default function AdhdTimerPage() {
  const canonicalUrl = absoluteUrl("/adhd-timer");

  return (
    <>
      <JsonLd
        data={[
          createSoftwareApplicationSchema({
            name: "DeepFlow ADHD Timer",
            description,
            url: canonicalUrl,
            keywords: adhdTimerTool.keywords,
          }),
          createFaqSchema(faqs, canonicalUrl),
        ]}
      />
      <section className="tool-hero">
        <InteractiveBrainwaveBackground />
        <div className="shell tool-hero__grid">
          <div className="tool-hero__copy">
            <span className="eyebrow">ADHD-friendly focus timer</span>
            <h1>ADHD Timer</h1>
            <p>
              A calm, low-friction timer for starting tasks and staying with
              them one session at a time.
            </p>
            <div className="hero__actions">
              <Link className="button button--dark" href="/timer/25">
                Start an ADHD-friendly focus session
                <ArrowIcon />
              </Link>
              <Link className="button button--ghost" href="/workspace">
                Open Workspace
              </Link>
            </div>
            <div className="mini-proof">
              <span>Short sessions</span>
              <i />
              <span>Ambient audio</span>
              <i />
              <span>No sign-up</span>
            </div>
          </div>
          <div className="tool-hero__timer">
            <TimerExperience showIntention showUpgradePrompt tool={adhdTimerTool} />
          </div>
        </div>
      </section>

      <section className="section section--roomy">
        <div className="shell editorial-split">
          <div>
            <span className="eyebrow">Start gently</span>
            <h2>Why an ADHD-friendly timer can lower the friction.</h2>
          </div>
          <div className="editorial-copy">
            <p>
              Starting can feel harder than the work itself. A visible, modest
              time boundary can make the next step feel clearer without asking
              you to plan an entire day. Begin with the smallest session that
              makes the task feel approachable.
            </p>
            <p>
              Writing one intention gives the session a direction. Instead of
              holding every possible task in mind, choose the next useful
              action and let the countdown contain it. You can stop, reset, or
              choose a shorter session whenever that is the kinder choice.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className="shell">
          <div className="section-heading section-heading--center">
            <span className="eyebrow">Support without the noise</span>
            <h2>DeepFlow keeps the useful pieces close.</h2>
          </div>
          <BenefitGrid items={adhdTimerTool.benefits} />
          <div className="adhd-support-grid">
            <article>
              <TimerIcon />
              <strong>Simple timer and mini player</strong>
              <p>Keep the session available while you move through the rest of DeepFlow.</p>
            </article>
            <article>
              <SparkIcon />
              <strong>Focus Journal and Notes Canvas</strong>
              <p>Let completed sessions and loose thoughts live in one calm workspace.</p>
            </article>
            <article>
              <TargetIcon />
              <strong>Routines and quiet insights</strong>
              <p>Return to the patterns that make starting feel more familiar.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section related-timers">
        <div className="shell shell--narrow">
          <div className="section-heading section-heading--center">
            <span className="eyebrow">Choose a small enough start</span>
            <h2>Suggested ADHD-friendly sessions.</h2>
            <p>There is no universal best length. Pick the duration that makes beginning feel most available today.</p>
          </div>
          <div className="related-timer-grid">
            {sessionOptions.map((session) => (
              <Link
                className="related-timer-card"
                href={getTimerPath(session.minutes)}
                key={session.minutes}
              >
                <span className="related-timer-card__icon">
                  <TimerIcon />
                </span>
                <span>
                  <strong>{session.title}</strong>
                  <small>{session.description}</small>
                </span>
                <ArrowIcon />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--ink">
        <div className="shell editorial-split">
          <div>
            <span className="eyebrow eyebrow--light">Use it your way</span>
            <h2>Build a session that is easier to return to.</h2>
          </div>
          <ol className="workflow-steps workflow-steps--light">
            <li>
              <span>01</span>
              <div>
                <strong>Write one tiny next action</strong>
                <p>Choose the first visible move, not the entire project.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Start smaller than you think</strong>
                <p>Five or ten minutes can be enough to create an opening.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Keep the workspace open</strong>
                <p>Use notes or the journal to leave a gentle trail back to the work.</p>
              </div>
            </li>
            <li>
              <span>04</span>
              <div>
                <strong>Use sound only if it helps</strong>
                <p>Rain, fireplace, ocean waves, or silence all count as valid support.</p>
              </div>
            </li>
            <li>
              <span>05</span>
              <div>
                <strong>Stop and reset without guilt</strong>
                <p>A timer is a fresh boundary, not a judgment about the last one.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <FaqSection items={faqs} title="ADHD timer questions" />

      <section className="section">
        <div className="shell">
          <ConversionCard placement="tool" />
        </div>
      </section>
      <ToolLinks />
    </>
  );
}

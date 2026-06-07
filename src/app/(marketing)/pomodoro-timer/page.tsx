import Link from "next/link";

import { BenefitGrid } from "@/components/marketing/benefit-grid";
import { ConversionCard } from "@/components/marketing/conversion-card";
import { ToolLinks } from "@/components/marketing/tool-links";
import { TimerExperience } from "@/components/product/timer-experience";
import { FaqSection } from "@/components/seo/faq-section";
import { JsonLd } from "@/components/seo/json-ld";
import { ArrowIcon, TimerIcon } from "@/components/ui/icons";
import { getTimerPath } from "@/config/timers";
import { pomodoroPage } from "@/content/pomodoro-page";
import { getTimerTool } from "@/content/timer-tools";
import { createMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";
import {
  createFaqSchema,
  createSoftwareApplicationSchema,
} from "@/lib/structured-data";

function getPomodoroTool() {
  const tool = getTimerTool("pomodoro-timer");
  if (!tool) {
    throw new Error("Pomodoro timer configuration is missing");
  }
  return tool;
}

const pomodoroTool = getPomodoroTool();

export const metadata = createMetadata({
  title: pomodoroPage.title,
  description: pomodoroPage.description,
  path: "/pomodoro-timer",
  keywords: [...pomodoroPage.keywords],
});

export default function PomodoroTimerPage() {
  const canonicalUrl = absoluteUrl("/pomodoro-timer");

  return (
    <>
      <JsonLd
        data={[
          createSoftwareApplicationSchema({
            name: "DeepFlow Pomodoro Timer",
            description: pomodoroPage.description,
            url: canonicalUrl,
          }),
          createFaqSchema([...pomodoroPage.faqs], canonicalUrl),
        ]}
      />

      <section className="tool-hero">
        <div className="shell tool-hero__grid">
          <div className="tool-hero__copy">
            <span className="eyebrow">Free online Pomodoro timer</span>
            <h1>{pomodoroPage.heading}</h1>
            <p>{pomodoroPage.description}</p>
            <div className="mini-proof">
              <span>25 minute focus</span>
              <i />
              <span>Built-in breaks</span>
              <i />
              <span>No sign-up</span>
            </div>
          </div>
          <div className="tool-hero__timer">
            <TimerExperience
              showIntention
              showUpgradePrompt
              tool={pomodoroTool}
            />
          </div>
        </div>
      </section>

      <section className="section section--roomy">
        <div className="shell editorial-split">
          <div>
            <span className="eyebrow">The Pomodoro rhythm</span>
            <h2>Focus fully, then recover on purpose.</h2>
          </div>
          <div className="editorial-copy">
            {pomodoroPage.intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className="shell">
          <div className="section-heading section-heading--center">
            <span className="eyebrow">A repeatable practice</span>
            <h2>Everything needed for a complete focus cycle.</h2>
          </div>
          <BenefitGrid items={pomodoroTool.benefits} />
        </div>
      </section>

      <section className="section related-timers">
        <div className="shell shell--narrow">
          <div className="section-heading section-heading--center">
            <span className="eyebrow">Pomodoro durations</span>
            <h2>Choose the interval that fits your energy.</h2>
            <p>
              Use the traditional cycle or adapt the work and recovery periods
              while keeping each commitment clear.
            </p>
          </div>
          <div className="related-timer-grid">
            {pomodoroPage.durations.map((duration) => (
              <Link
                className="related-timer-card"
                href={getTimerPath(duration.minutes)}
                key={duration.minutes}
              >
                <span className="related-timer-card__icon">
                  <TimerIcon />
                </span>
                <span>
                  <strong>{duration.label}</strong>
                  <small>{duration.description}</small>
                </span>
                <ArrowIcon />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FaqSection
        items={[...pomodoroPage.faqs]}
        title="Pomodoro timer questions"
      />

      <section className="section">
        <div className="shell">
          <ConversionCard placement="tool" />
        </div>
      </section>

      <ToolLinks exclude="pomodoro-timer" />
    </>
  );
}

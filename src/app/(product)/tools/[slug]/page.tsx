import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { BenefitGrid } from "@/components/marketing/benefit-grid";
import { ConversionCard } from "@/components/marketing/conversion-card";
import { InteractiveBrainwaveBackground } from "@/components/marketing/interactive-brainwave-background";
import { ToolLinks } from "@/components/marketing/tool-links";
import { SessionHistoryCard } from "@/components/product/session-history-card";
import { TimerExperience } from "@/components/product/timer-experience";
import { FaqSection } from "@/components/seo/faq-section";
import { JsonLd } from "@/components/seo/json-ld";
import { ArrowIcon } from "@/components/ui/icons";
import {
  getTimerTool,
  getTimerToolPath,
  timerTools,
} from "@/content/timer-tools";
import { createMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";
import {
  createFaqSchema,
  createSoftwareApplicationSchema,
} from "@/lib/structured-data";

type ToolPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return timerTools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "pomodoro-timer") return {};

  const tool = getTimerTool(slug);
  if (!tool) return {};

  return createMetadata({
    title: tool.seoTitle ?? `${tool.shortTitle} Timer - Free Online Timer`,
    description: tool.description,
    path: `/tools/${tool.slug}`,
    keywords: tool.keywords,
  });
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  if (slug === "pomodoro-timer") {
    permanentRedirect(getTimerToolPath(slug));
  }

  const tool = getTimerTool(slug);
  if (!tool) notFound();
  const canonicalUrl = absoluteUrl(`/tools/${tool.slug}`);

  return (
    <>
      <JsonLd
        data={[
          createSoftwareApplicationSchema({
            name: `${tool.shortTitle} Timer by DeepFlow`,
            description: tool.description,
            url: canonicalUrl,
          }),
          createFaqSchema(tool.faqs, canonicalUrl),
        ]}
      />
      <section className="tool-hero">
        <InteractiveBrainwaveBackground />
        <div className="shell tool-hero__grid">
          <div className="tool-hero__copy">
            <span className="eyebrow">{tool.eyebrow}</span>
            <h1>{tool.title}</h1>
            <p>{tool.description}</p>
            <div className="mini-proof">
              <span>Free</span>
              <i />
              <span>Private</span>
              <i />
              <span>No sign-up</span>
            </div>
          </div>
          <div className="tool-hero__timer">
            <TimerExperience
              showIntention={tool.kind !== "countdown"}
              showUpgradePrompt
              tool={tool}
            />
          </div>
          {tool.kind === "focus" ? (
            <div className="tool-hero__journal">
              <SessionHistoryCard />
            </div>
          ) : null}
        </div>
      </section>

      <section className="section section--roomy">
        <div className="shell">
          <div className="section-heading section-heading--center">
            <span className="eyebrow">Made for momentum</span>
            <h2>Everything you need to begin. Nothing you do not.</h2>
          </div>
          <BenefitGrid items={tool.benefits} />
        </div>
      </section>

      <section className="section section--ink">
        <div className="shell editorial-split">
          <div>
            <span className="eyebrow eyebrow--light">Use it well</span>
            <h2>Make the timer a boundary, not another metric.</h2>
          </div>
          <div className="editorial-copy">
            <p>
              Before you press start, name the result you want from this
              session. Keep it visible and specific. The clock is there to
              protect the commitment, not to rush you.
            </p>
            <p>
              When the interval ends, record the next action and take a real
              break. A clear ending makes it easier to return with attention
              intact.
            </p>
          </div>
        </div>
      </section>

      {tool.sections ? (
        <section className="section section--roomy">
          <div className="shell shell--article article-body">
            {tool.sections.map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
            <div className="article-cta">
              <span className="eyebrow eyebrow--light">Choose your rhythm</span>
              <h2>Keep studying with the timer that fits.</h2>
              <p>
                Use a structured Pomodoro cycle or open a longer focus session
                when the material needs more continuity.
              </p>
              <div className="hero__actions">
                <Link className="button button--light" href="/pomodoro-timer">
                  Open Pomodoro Timer
                  <ArrowIcon />
                </Link>
                <Link
                  className="button button--ghost button--light"
                  href="/tools/focus-timer"
                >
                  Open Focus Timer
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="shell">
          <ConversionCard placement="tool" />
        </div>
      </section>
      <FaqSection items={tool.faqs} />
      <ToolLinks exclude={tool.slug} />
    </>
  );
}

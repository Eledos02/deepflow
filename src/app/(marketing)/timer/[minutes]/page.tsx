import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { RelatedTimers } from "@/components/marketing/related-timers";
import { TimerLandingContent } from "@/components/marketing/timer-landing-content";
import { TimerExperience } from "@/components/product/timer-experience";
import { FaqSection } from "@/components/seo/faq-section";
import { JsonLd } from "@/components/seo/json-ld";
import {
  getTimerPath,
  parseLegacyTimerSlug,
  parseTimerMinutes,
  timers,
} from "@/config/timers";
import { getTimerPageContent } from "@/content/timer-pages";
import { timerTools } from "@/content/timer-tools";
import { createMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";
import {
  createBreadcrumbSchema,
  createFaqSchema,
  createHowToSchema,
  createSoftwareApplicationSchema,
} from "@/lib/structured-data";

type TimerPageProps = {
  params: Promise<{ minutes: string }>;
};

export function generateStaticParams() {
  return timers.map((minutes) => ({
    minutes: String(minutes),
  }));
}

export async function generateMetadata({
  params,
}: TimerPageProps): Promise<Metadata> {
  const { minutes: value } = await params;
  const minutes = parseTimerMinutes(value);
  if (!minutes) return {};

  const content = getTimerPageContent(minutes);

  return createMetadata({
    title: `${content.title} - Free Online Countdown`,
    description: content.description,
    path: getTimerPath(minutes),
    keywords: content.keywords,
  });
}

export default async function TimerPage({ params }: TimerPageProps) {
  const { minutes: value } = await params;
  const legacyMinutes = parseLegacyTimerSlug(value);

  if (legacyMinutes) {
    permanentRedirect(getTimerPath(legacyMinutes));
  }

  const minutes = parseTimerMinutes(value);
  if (!minutes) notFound();

  const content = getTimerPageContent(minutes);
  const countdownTool = timerTools.find((tool) => tool.kind === "countdown");
  if (!countdownTool) notFound();

  const canonicalUrl = absoluteUrl(getTimerPath(minutes));

  return (
    <>
      <JsonLd
        data={[
          createSoftwareApplicationSchema({
            name: `${content.title} by DeepFlow`,
            description: content.description,
            url: canonicalUrl,
          }),
          createFaqSchema(content.faqs, canonicalUrl),
          createHowToSchema({
            name: `How to use a ${minutes} minute timer`,
            description: `A practical four-step method for using DeepFlow's ${minutes} minute countdown effectively.`,
            totalTime: `PT${minutes}M`,
            pageUrl: canonicalUrl,
            steps: content.howTo,
          }),
          createBreadcrumbSchema({
            pageName: content.title,
            pageUrl: canonicalUrl,
          }),
        ]}
      />

      <section className="duration-hero">
        <div className="shell shell--narrow duration-hero__inner">
          <nav className="timer-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">DeepFlow</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{content.title}</span>
          </nav>
          <div className="duration-hero__heading">
            <span className="eyebrow">Free online countdown</span>
            <h1>{content.title}</h1>
            <p>{content.description}</p>
          </div>
          <TimerExperience
            compactHeading={content.title}
            initialMinutes={minutes}
            tool={countdownTool}
          />
        </div>
      </section>

      <section className="section timer-explainer">
        <div className="shell shell--narrow prose-layout">
          <div className="prose-main">
            <span className="eyebrow">About this timer</span>
            <h2>What can you do in {minutes} minutes?</h2>
            {content.intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <aside className="use-case-card">
            <span>Good for</span>
            <ul>
              {content.useCases.map((useCase) => (
                <li key={useCase}>{useCase}</li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <TimerLandingContent
        benefits={content.benefits}
        howTo={content.howTo}
        internalLinks={content.internalLinks}
        minutes={minutes}
        sections={content.sections}
      />
      <FaqSection items={content.faqs} title={`${minutes} minute timer FAQ`} />
      <RelatedTimers minutes={minutes} />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConversionCard } from "@/components/marketing/conversion-card";
import { InteractiveBrainwaveBackground } from "@/components/marketing/interactive-brainwave-background";
import { FaqSection } from "@/components/seo/faq-section";
import { JsonLd } from "@/components/seo/json-ld";
import { ArrowIcon } from "@/components/ui/icons";
import { getGuide, guides } from "@/content/guides";
import { createMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";
import {
  createArticleSchema,
  createBreadcrumbSchema,
  createFaqSchema,
} from "@/lib/structured-data";

type GuidePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};

  return createMetadata({
    title: guide.title,
    description: guide.description,
    path: `/guides/${guide.slug}`,
    keywords: guide.keywords,
  });
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const canonicalUrl = absoluteUrl(`/guides/${guide.slug}`);

  return (
    <>
      <JsonLd
        data={[
          createArticleSchema({
            headline: guide.title,
            description: guide.description,
            url: canonicalUrl,
          }),
          createFaqSchema(guide.faqs, canonicalUrl),
          createBreadcrumbSchema({
            pageName: guide.title,
            pageUrl: canonicalUrl,
          }),
        ]}
      />
      <article>
        <header className="guide-hero">
          <InteractiveBrainwaveBackground />
          <div className="shell shell--article">
            <span className="eyebrow">{guide.eyebrow}</span>
            <h1>{guide.title}</h1>
            <p>{guide.description}</p>
            <div className="guide-meta">
              <span>DeepFlow editorial</span>
              <i />
              <span>{Math.max(4, guide.sections.length * 2)} min read</span>
            </div>
          </div>
        </header>
        <div className="shell shell--article article-body">
          {guide.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
          {guide.relatedLinks ? (
            <section>
              <h2>Recommended DeepFlow tools</h2>
              <p>
                Use these timers and guides to turn the ideas above into a
                repeatable focus routine.
              </p>
              <div className="timer-next-steps__grid">
                {guide.relatedLinks.map((link) => (
                  <Link
                    className="timer-resource-card"
                    href={link.href}
                    key={link.href}
                  >
                    <span>
                      <strong>{link.label}</strong>
                      <small>{link.description}</small>
                    </span>
                    <ArrowIcon />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          <div className="article-cta">
            <span className="eyebrow eyebrow--light">Put it into practice</span>
            <h2>Start one protected session.</h2>
            <p>Choose the work. Set the boundary. Begin before you feel ready.</p>
            <Link className="button button--light" href="/tools/focus-timer">
              Open the focus timer
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </article>
      <FaqSection items={guide.faqs} title="Common questions" />
      <section className="section">
        <div className="shell">
          <ConversionCard placement="guide" />
        </div>
      </section>
    </>
  );
}

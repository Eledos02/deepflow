import Link from "next/link";

import { InteractiveBrainwaveBackground } from "@/components/marketing/interactive-brainwave-background";
import { JsonLd } from "@/components/seo/json-ld";
import { ArrowIcon } from "@/components/ui/icons";
import { legalLastUpdated, termsPage } from "@/content/legal-pages";
import { createMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";
import { createBreadcrumbSchema } from "@/lib/structured-data";

export const metadata = createMetadata({
  title: termsPage.title,
  description:
    "Read DeepFlow's Terms of Service for accounts, billing readiness, cancellations, refunds, acceptable use, and local-first data behavior.",
  path: "/terms",
  keywords: ["DeepFlow terms", "terms of service", "DeepFlow legal"],
});

export default function TermsPage() {
  const canonicalUrl = absoluteUrl("/terms");

  return (
    <>
      <JsonLd
        data={createBreadcrumbSchema({
          pageName: termsPage.title,
          pageUrl: canonicalUrl,
        })}
      />
      <article>
        <header className="guide-hero legal-hero">
          <InteractiveBrainwaveBackground />
          <div className="shell shell--article">
            <span className="eyebrow">DeepFlow legal</span>
            <h1>{termsPage.title}</h1>
            <p>{termsPage.intro}</p>
            <div className="guide-meta">
              <span>Starter legal template</span>
              <i />
              <span>Last updated {legalLastUpdated}</span>
            </div>
          </div>
        </header>

        <div className="shell shell--article article-body legal-body">
          <p className="legal-disclaimer">
            This page is a practical starter policy for DeepFlow and is not a
            substitute for legal advice.
          </p>

          {termsPage.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.items ? (
                <ul className="legal-list">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <nav className="legal-cross-link" aria-label="Related legal page">
            <Link href={termsPage.relatedLink.href}>
              <span>
                <strong>{termsPage.relatedLink.label}</strong>
                <small>{termsPage.relatedLink.description}</small>
              </span>
              <ArrowIcon />
            </Link>
          </nav>
        </div>
      </article>
    </>
  );
}

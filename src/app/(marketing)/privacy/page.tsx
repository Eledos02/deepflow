import Link from "next/link";

import { InteractiveBrainwaveBackground } from "@/components/marketing/interactive-brainwave-background";
import { JsonLd } from "@/components/seo/json-ld";
import { ArrowIcon } from "@/components/ui/icons";
import { legalLastUpdated, privacyPage } from "@/content/legal-pages";
import { createMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";
import { createBreadcrumbSchema } from "@/lib/structured-data";

export const metadata = createMetadata({
  title: privacyPage.title,
  description:
    "Read DeepFlow's Privacy Policy for account data, local-first browser storage, cloud backup, payments, email, analytics, and cookies.",
  path: "/privacy",
  keywords: ["DeepFlow privacy", "privacy policy", "local-first data"],
});

export default function PrivacyPage() {
  const canonicalUrl = absoluteUrl("/privacy");

  return (
    <>
      <JsonLd
        data={createBreadcrumbSchema({
          pageName: privacyPage.title,
          pageUrl: canonicalUrl,
        })}
      />
      <article>
        <header className="guide-hero legal-hero">
          <InteractiveBrainwaveBackground />
          <div className="shell shell--article">
            <span className="eyebrow">DeepFlow legal</span>
            <h1>{privacyPage.title}</h1>
            <p>{privacyPage.intro}</p>
            <div className="guide-meta">
              <span>Starter privacy policy</span>
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

          {privacyPage.sections.map((section) => (
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
            <Link href={privacyPage.relatedLink.href}>
              <span>
                <strong>{privacyPage.relatedLink.label}</strong>
                <small>{privacyPage.relatedLink.description}</small>
              </span>
              <ArrowIcon />
            </Link>
          </nav>
        </div>
      </article>
    </>
  );
}

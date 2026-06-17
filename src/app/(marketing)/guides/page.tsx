import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { ArrowIcon } from "@/components/ui/icons";
import { guides } from "@/content/guides";
import { createMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";
import { createBreadcrumbSchema } from "@/lib/structured-data";

const guideHubTitle = "DeepFlow Guides — Focus, Pomodoro, Study & Deep Work";
const guideHubDescription =
  "Explore practical guides on focus, Pomodoro, study timers, deep work, and building better attention habits with DeepFlow.";

const featuredLinks = [
  {
    href: "/tools/focus-timer",
    label: "Focus Timer",
    description: "Start a protected focus block with intention tracking.",
  },
  {
    href: "/tools/pomodoro-timer",
    label: "Pomodoro Timer",
    description: "Use structured work and break cycles for steady progress.",
  },
  {
    href: "/tools/study-timer",
    label: "Study Timer",
    description: "Plan reading, recall, and review sessions with less friction.",
  },
  {
    href: "/timer/25",
    label: "25 Minute Timer",
    description: "Use the classic Pomodoro interval for focused work.",
  },
  {
    href: "/timer/50",
    label: "50 Minute Timer",
    description: "Try an extended 50/10 concentration cycle.",
  },
  {
    href: "/timer/90",
    label: "90 Minute Timer",
    description: "Reserve a deeper block for demanding creative work.",
  },
] as const;

export const metadata = createMetadata({
  title: guideHubTitle,
  description: guideHubDescription,
  path: "/guides",
  keywords: [
    "focus guides",
    "pomodoro guides",
    "study timer guides",
    "deep work guides",
  ],
});

function getReadingTime(sectionCount: number) {
  return `${Math.max(4, sectionCount * 2)} min read`;
}

export default function GuidesPage() {
  const canonicalUrl = absoluteUrl("/guides");

  return (
    <>
      <JsonLd
        data={createBreadcrumbSchema({
          pageName: "Guides",
          pageUrl: canonicalUrl,
        })}
      />
      <main>
        <section className="guide-hero guide-hub-hero">
          <div className="shell shell--article">
            <span className="eyebrow">DeepFlow guides</span>
            <h1>Focus, study, Pomodoro, and deep work guides.</h1>
            <p>{guideHubDescription}</p>
            <div className="guide-meta">
              <span>{guides.length} practical guides</span>
              <i />
              <span>Built for better attention habits</span>
            </div>
          </div>
        </section>

        <section className="section guide-hub" aria-labelledby="guide-hub-title">
          <div className="shell">
            <div className="section-heading">
              <span className="eyebrow">Guide library</span>
              <h2 id="guide-hub-title">Choose the focus problem you want to solve.</h2>
            </div>
            <div className="guide-hub__grid">
              {guides.map((guide) => (
                <Link
                  className="guide-card"
                  href={`/guides/${guide.slug}`}
                  key={guide.slug}
                >
                  <span className="guide-card__tag">{guide.eyebrow}</span>
                  <h3>{guide.title}</h3>
                  <p>{guide.description}</p>
                  <span className="guide-card__meta">
                    {getReadingTime(guide.sections.length)}
                    <ArrowIcon />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <nav
          className="section section--soft timer-next-steps"
          aria-labelledby="guide-tools-title"
        >
          <div className="shell">
            <div className="section-heading">
              <span className="eyebrow">Put the guides into practice</span>
              <h2 id="guide-tools-title">Open a DeepFlow timer.</h2>
            </div>
            <div className="timer-next-steps__grid guide-hub__tools">
              {featuredLinks.map((link) => (
                <Link className="timer-resource-card" href={link.href} key={link.href}>
                  <span>
                    <strong>{link.label}</strong>
                    <small>{link.description}</small>
                  </span>
                  <ArrowIcon />
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </main>
    </>
  );
}

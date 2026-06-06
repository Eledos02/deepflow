import Link from "next/link";

import { ArrowIcon, CheckIcon, SparkIcon, TargetIcon } from "@/components/ui/icons";
import type {
  TimerBenefit,
  TimerContentSection,
  TimerInternalLink,
  TimerStep,
} from "@/content/timer-pages";

type TimerLandingContentProps = {
  minutes: number;
  benefits: TimerBenefit[];
  howTo: TimerStep[];
  sections: TimerContentSection[];
  internalLinks: TimerInternalLink[];
};

const benefitIcons = [TargetIcon, SparkIcon, CheckIcon];

export function TimerLandingContent({
  minutes,
  benefits,
  howTo,
  sections,
  internalLinks,
}: TimerLandingContentProps) {
  return (
    <>
      <section className="section timer-benefits" aria-labelledby="timer-benefits-title">
        <div className="shell shell--narrow">
          <div className="section-heading section-heading--center">
            <span className="eyebrow">Why this interval works</span>
            <h2 id="timer-benefits-title">
              Benefits of a {minutes} minute timer
            </h2>
          </div>
          <div className="benefit-grid">
            {benefits.map((benefit, index) => {
              const Icon = benefitIcons[index % benefitIcons.length];

              return (
                <article className="benefit-card timer-benefit-card" key={benefit.title}>
                  <span className="benefit-card__number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="benefit-card__icon">
                    <Icon />
                  </span>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section timer-how-to" aria-labelledby="timer-how-to-title">
        <div className="shell shell--narrow timer-how-to__grid">
          <div className="timer-how-to__intro">
            <span className="eyebrow">How to use it</span>
            <h2 id="timer-how-to-title">
              Turn {minutes} minutes into a clear commitment.
            </h2>
            <p>
              A useful countdown begins before the clock moves. Define the
              result, protect the interval, and close the session in a way that
              makes the next step easier.
            </p>
          </div>
          <ol className="timer-step-list">
            {howTo.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section timer-editorial" aria-labelledby="timer-guide-title">
        <div className="shell shell--narrow">
          <header className="timer-editorial__header">
            <span className="eyebrow">Practical guide</span>
            <h2 id="timer-guide-title">
              Make the {minutes} minute interval work for you.
            </h2>
          </header>
          <div className="timer-editorial__body">
            {sections.map((section) => (
              <article className="timer-editorial__section" key={section.title}>
                <h3>{section.title}</h3>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </article>
            ))}
          </div>
        </div>
      </section>

      <nav
        className="section section--soft timer-next-steps"
        aria-labelledby="timer-next-steps-title"
      >
        <div className="shell shell--narrow">
          <div className="section-heading">
            <span className="eyebrow">Keep building your practice</span>
            <h2 id="timer-next-steps-title">Go beyond one countdown.</h2>
          </div>
          <div className="timer-next-steps__grid">
            {internalLinks.map((link) => (
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
    </>
  );
}

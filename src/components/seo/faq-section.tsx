import type { FaqItem } from "@/content/types";

type FaqSectionProps = {
  items: FaqItem[];
  title?: string;
};

export function FaqSection({
  items,
  title = "Questions, answered",
}: FaqSectionProps) {
  return (
    <section className="section section--soft">
      <div className="shell shell--narrow">
        <div className="section-heading section-heading--center">
          <span className="eyebrow">FAQ</span>
          <h2>{title}</h2>
        </div>
        <div className="faq-list">
          {items.map((item, index) => (
            <details className="faq-item" key={item.question} open={index === 0}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

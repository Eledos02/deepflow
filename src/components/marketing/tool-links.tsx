import Link from "next/link";

import { ArrowIcon, TimerIcon } from "@/components/ui/icons";
import { timerTools } from "@/content/timer-tools";

type ToolLinksProps = {
  exclude?: string;
};

export function ToolLinks({ exclude }: ToolLinksProps) {
  const tools = timerTools.filter((tool) => tool.slug !== exclude);

  return (
    <section className="section">
      <div className="shell">
        <div className="section-heading">
          <span className="eyebrow">More ways to focus</span>
          <h2>Use the right rhythm for the work.</h2>
        </div>
        <div className="tool-link-grid">
          {tools.map((tool) => (
            <Link className="tool-link-card" href={`/tools/${tool.slug}`} key={tool.slug}>
              <span className="tool-link-card__icon">
                <TimerIcon />
              </span>
              <span>
                <strong>{tool.shortTitle} timer</strong>
                <small>{tool.description}</small>
              </span>
              <ArrowIcon />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

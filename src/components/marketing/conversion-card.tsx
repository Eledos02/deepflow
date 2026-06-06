import Link from "next/link";

import { ArrowIcon, SparkIcon } from "@/components/ui/icons";

type ConversionCardProps = {
  placement: "homepage" | "tool" | "guide";
};

const content = {
  homepage: {
    eyebrow: "DeepFlow Pro - Early access",
    title: "Build a focus practice that compounds.",
    description:
      "Plan meaningful sessions, protect your attention, and understand the patterns behind your best work.",
    action: "See Pro plans",
  },
  tool: {
    eyebrow: "Keep the momentum",
    title: "Turn one good session into a repeatable rhythm.",
    description:
      "Save session history, build weekly goals, and return to the routines that help you do your best work.",
    action: "Track progress with Pro",
  },
  guide: {
    eyebrow: "Put the method into practice",
    title: "Make focused work easier to repeat.",
    description:
      "Move from reading about focus to planning sessions, protecting time, and learning from your attention.",
    action: "Explore DeepFlow Pro",
  },
} as const;

export function ConversionCard({ placement }: ConversionCardProps) {
  const copy = content[placement];

  return (
    <aside className="conversion-card" data-placement={placement}>
      <div>
        <span className="conversion-card__icon">
          <SparkIcon />
        </span>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>
      <div className="conversion-card__actions">
        <Link className="button button--light" href="/pricing">
          {copy.action}
          <ArrowIcon />
        </Link>
        <span>No charge today. Founding access opens soon.</span>
      </div>
    </aside>
  );
}

import Link from "next/link";

import { ArrowIcon, SparkIcon } from "@/components/ui/icons";

type ConversionCardProps = {
  placement: "homepage" | "tool" | "guide";
};

const content = {
  homepage: {
    eyebrow: "Founding Member updates",
    title: "Choose the plan that fits your rhythm.",
    description:
      "DeepFlow stays free to start, with optional Stripe-managed plans for people who want account billing.",
    action: "See pricing",
  },
  tool: {
    eyebrow: "Keep the momentum",
    title: "Turn one good session into a repeatable rhythm.",
    description:
      "Save session history, build weekly goals, and return to the routines that help you do your best work.",
    action: "Create free account",
  },
  guide: {
    eyebrow: "Put the method into practice",
    title: "Make focused work easier to repeat.",
    description:
      "Move from reading about focus to planning sessions, protecting time, and learning from your attention.",
    action: "Start focusing",
  },
} as const;

const actionHref = {
  homepage: "/pricing",
  tool: "/signup",
  guide: "/workspace",
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
        <Link className="button button--light" href={actionHref[placement]}>
          {copy.action}
          <ArrowIcon />
        </Link>
        <span>Checkout and billing management are handled through Stripe.</span>
      </div>
    </aside>
  );
}

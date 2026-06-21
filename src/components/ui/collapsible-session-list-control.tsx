"use client";

import { hasHiddenSessionListItems } from "../../features/timer/collapsible-session-list";

type CollapsibleSessionListControlProps = {
  controlsId: string;
  expandLabel: string;
  collapseLabel: string;
  isExpanded: boolean;
  onExpandedChange: (isExpanded: boolean) => void;
  totalCount: number;
};

export function CollapsibleSessionListControl({
  collapseLabel,
  controlsId,
  expandLabel,
  isExpanded,
  onExpandedChange,
  totalCount,
}: CollapsibleSessionListControlProps) {
  if (!hasHiddenSessionListItems(totalCount)) return null;

  return (
    <button
      aria-controls={controlsId}
      aria-expanded={isExpanded}
      className="session-list-toggle"
      onClick={() => onExpandedChange(!isExpanded)}
      type="button"
    >
      {isExpanded ? collapseLabel : expandLabel}
    </button>
  );
}

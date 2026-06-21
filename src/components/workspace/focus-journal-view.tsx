"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";

import { CollapsibleSessionListControl } from "@/components/ui/collapsible-session-list-control";
import { getVisibleSessionListItems } from "@/features/timer/collapsible-session-list";
import {
  FOCUS_JOURNAL_STORAGE_KEY,
  FOCUS_JOURNAL_UPDATED_EVENT,
  FREE_FOCUS_JOURNAL_VISIBLE_LIMIT,
  getVisibleFocusJournalEntries,
  readFocusJournalEntries,
  type FocusJournalEntry,
} from "@/features/timer/focus-journal";

type JournalGroup = {
  dateKey: string;
  label: string;
  entries: FocusJournalEntry[];
};

function getLocalDateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayLabel(dateKey: string, nowMs: number) {
  const todayKey = getLocalDateKey(new Date(nowMs).toISOString());
  const yesterday = new Date(nowMs);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday.toISOString());

  if (dateKey === todayKey) return "Today";
  if (dateKey === yesterdayKey) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function formatCompletionTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function groupJournalEntries(
  entries: FocusJournalEntry[],
  nowMs: number,
): JournalGroup[] {
  const groups = new Map<string, FocusJournalEntry[]>();

  for (const entry of entries) {
    const dateKey = getLocalDateKey(entry.completedAt);
    groups.set(dateKey, [...(groups.get(dateKey) ?? []), entry]);
  }

  return [...groups.entries()].map(([dateKey, groupEntries]) => ({
    dateKey,
    label: formatDayLabel(dateKey, nowMs),
    entries: groupEntries,
  }));
}

export function FocusJournalView() {
  const [entries, setEntries] = useState<FocusJournalEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isJournalExpanded, setIsJournalExpanded] = useState(false);
  const journalListId = useId();

  useEffect(() => {
    const refresh = () => {
      setEntries(readFocusJournalEntries());
      setHydrated(true);
    };

    const refreshId = window.setTimeout(refresh, 0);
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== FOCUS_JOURNAL_STORAGE_KEY) return;
      refresh();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(FOCUS_JOURNAL_UPDATED_EVENT, refresh);

    return () => {
      window.clearTimeout(refreshId);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(FOCUS_JOURNAL_UPDATED_EVENT, refresh);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const availableEntries = useMemo(
    () => getVisibleFocusJournalEntries(entries),
    [entries],
  );
  const visibleEntries = useMemo(
    () => getVisibleSessionListItems(availableEntries, isJournalExpanded),
    [availableEntries, isJournalExpanded],
  );
  const groups = useMemo(
    () => groupJournalEntries(visibleEntries, nowMs),
    [nowMs, visibleEntries],
  );

  return (
    <section className="workspace-journal-card" aria-labelledby="focus-journal-title">
      <div className="workspace-journal-card__header">
        <div>
          <span className="eyebrow">Focus Journal</span>
          <h2 id="focus-journal-title">Completed focus, captured automatically.</h2>
          <p>
            Every completed focus session with an intention becomes part of your
            private local journal.
          </p>
        </div>
        <span className="workspace-journal-card__badge">Stored locally</span>
      </div>

      {!hydrated || groups.length === 0 ? (
        <div className="workspace-journal-empty">
          <strong>Your completed focus sessions will appear here.</strong>
          <p>
            Start a timer, write what you&apos;re working on, and finish the
            session to build your journal.
          </p>
        </div>
      ) : (
        <div className="workspace-journal-groups" id={journalListId}>
          {groups.map((group) => (
            <section className="workspace-journal-day" key={group.dateKey}>
              <h3>{group.label}</h3>
              <ul>
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <strong>{entry.title}</strong>
                      <span>
                        {entry.durationMinutes}m
                        {" • "}
                        {entry.timerType}
                        {" • "}
                        {formatCompletionTime(entry.completedAt)}
                      </span>
                      {entry.routineName ? (
                        <span className="workspace-journal-routine">
                          Routine: {entry.routineName}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="workspace-journal-toggle">
        <CollapsibleSessionListControl
          collapseLabel="Collapse journal"
          controlsId={journalListId}
          expandLabel="Show all journal entries"
          isExpanded={isJournalExpanded}
          onExpandedChange={setIsJournalExpanded}
          totalCount={availableEntries.length}
        />
      </div>

      {entries.length > FREE_FOCUS_JOURNAL_VISIBLE_LIMIT ? (
        <aside className="workspace-upgrade-card workspace-journal-upgrade">
          <span className="workspace-upgrade-card__badge">Journal limit</span>
          <h3>Unlock your full focus history</h3>
          <p>
            Free users can view the {FREE_FOCUS_JOURNAL_VISIBLE_LIMIT} most
            recent journal entries. Founding Members get unlimited journal
            history, cloud sync, weekly reports, and advanced focus insights.
          </p>
          <Link className="button button--light" href="/pricing?source=workspace_upgrade#founding-member">
            Become a Founding Member
          </Link>
        </aside>
      ) : null}
    </section>
  );
}

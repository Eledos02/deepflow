"use client";

import { useMemo, useState } from "react";

import {
  calculateFocusJournalSummary,
  getJournalSessionsForPeriod,
  getSessionTaskName,
  groupFocusSessionsByDay,
  inferFocusCategory,
  type JournalPeriod,
} from "@/features/timer/session-journal";
import { useSessionJournal } from "@/features/timer/use-session-journal";
import { formatCompactDuration } from "@/lib/format";

function formatTotalHours(totalSeconds: number) {
  const hours = totalSeconds / 3600;
  if (hours === 0) return "0h";
  if (hours < 10) return `${hours.toFixed(1).replace(/\.0$/, "")}h`;
  return `${Math.round(hours)}h`;
}

function formatGroupLabel(dateKey: string, nowMs: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  const today = new Date(nowMs);
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  const yesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1,
  );
  const yesterdayKey = [
    yesterday.getFullYear(),
    String(yesterday.getMonth() + 1).padStart(2, "0"),
    String(yesterday.getDate()).padStart(2, "0"),
  ].join("-");

  if (dateKey === todayKey) return "Today";
  if (dateKey === yesterdayKey) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatCompletionTime(completedAtMs: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(completedAtMs));
}

export function SessionHistoryCard() {
  const [period, setPeriod] = useState<JournalPeriod>("today");
  const { hydrated, nowMs, sessions } = useSessionJournal();
  const summary = useMemo(
    () => calculateFocusJournalSummary(sessions),
    [sessions],
  );
  const periodSessions = useMemo(
    () => getJournalSessionsForPeriod(sessions, period, nowMs),
    [nowMs, period, sessions],
  );
  const groups = useMemo(
    () => groupFocusSessionsByDay(periodSessions),
    [periodSessions],
  );
  const todayCount = getJournalSessionsForPeriod(
    sessions,
    "today",
    nowMs,
  ).length;
  const weekCount = getJournalSessionsForPeriod(
    sessions,
    "week",
    nowMs,
  ).length;

  return (
    <section className="session-history-card" aria-labelledby="focus-journal-title">
      <header className="session-history-card__header">
        <div>
          <span className="eyebrow">Work journal</span>
          <h2 id="focus-journal-title">Focus history</h2>
        </div>
        <span className="session-history-card__privacy">Stored locally</span>
      </header>

      <div className="session-history-summary" aria-label="All-time focus totals">
        <span>
          <strong>{summary.totalBlocks}</strong>
          <small>Total blocks</small>
        </span>
        <span>
          <strong>{formatTotalHours(summary.totalSeconds)}</strong>
          <small>Focus hours</small>
        </span>
        <span>
          <strong>{summary.mostCommonCategory ?? "None yet"}</strong>
          <small>Top category</small>
        </span>
      </div>

      <div className="session-history-tabs" role="tablist" aria-label="History range">
        <button
          aria-selected={period === "today"}
          onClick={() => setPeriod("today")}
          role="tab"
          type="button"
        >
          Today <span>{todayCount}</span>
        </button>
        <button
          aria-selected={period === "week"}
          onClick={() => setPeriod("week")}
          role="tab"
          type="button"
        >
          This week <span>{weekCount}</span>
        </button>
      </div>

      <div className="session-history-list" role="tabpanel">
        {!hydrated ? (
          <div className="session-history-empty">
            <span className="session-history-empty__mark" aria-hidden="true" />
            <p>Loading your local focus history...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="session-history-empty">
            <span className="session-history-empty__mark" aria-hidden="true" />
            <div>
              <strong>No completed sessions {period === "today" ? "today" : "this week"}.</strong>
              <p>Name your next focus block, finish the timer, and it will appear here.</p>
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <section className="session-history-day" key={group.dateKey}>
              <header>
                <h3>{formatGroupLabel(group.dateKey, nowMs)}</h3>
                <span>{formatCompactDuration(
                  group.sessions.reduce(
                    (total, session) => total + session.durationSeconds,
                    0,
                  ),
                )}</span>
              </header>
              <ul>
                {group.sessions.map((session) => {
                  const category =
                    session.category ??
                    inferFocusCategory(getSessionTaskName(session));

                  return (
                    <li key={session.id}>
                      <span className="session-history-entry__dot" aria-hidden="true" />
                      <span className="session-history-entry__task">
                        <strong>{getSessionTaskName(session)}</strong>
                        <small>
                          {formatCompletionTime(session.completedAtMs)}
                          <i aria-hidden="true" />
                          {category}
                        </small>
                      </span>
                      <span className="session-history-entry__duration">
                        {formatCompactDuration(session.durationSeconds)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </section>
  );
}

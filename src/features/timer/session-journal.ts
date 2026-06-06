import type {
  CompletedTimerSession,
  FocusCategory,
} from "./timer-storage";

export type JournalPeriod = "today" | "week";

export type FocusJournalSummary = {
  totalBlocks: number;
  totalSeconds: number;
  mostCommonCategory: FocusCategory | null;
};

export type FocusSessionGroup = {
  dateKey: string;
  sessions: CompletedTimerSession[];
};

const categoryMatchers: Array<{
  category: Exclude<FocusCategory, "General">;
  terms: string[];
}> = [
  {
    category: "Research",
    terms: [
      "research",
      "supplier",
      "source",
      "market",
      "competitor",
      "analysis",
      "analyze",
      "investigate",
    ],
  },
  {
    category: "Writing",
    terms: [
      "write",
      "writing",
      "draft",
      "article",
      "essay",
      "proposal",
      "report",
      "copy",
      "chapter",
    ],
  },
  {
    category: "Development",
    terms: [
      "code",
      "coding",
      "develop",
      "development",
      "debug",
      "program",
      "build",
      "refactor",
      "test",
    ],
  },
  {
    category: "Study",
    terms: [
      "study",
      "learn",
      "learning",
      "review",
      "read",
      "exam",
      "course",
      "practice",
      "homework",
    ],
  },
  {
    category: "Planning",
    terms: [
      "plan",
      "planning",
      "strategy",
      "roadmap",
      "prioritize",
      "outline",
      "schedule",
      "goals",
    ],
  },
  {
    category: "Design",
    terms: [
      "design",
      "figma",
      "wireframe",
      "prototype",
      "visual",
      "illustration",
      "brand",
      "layout",
    ],
  },
  {
    category: "Admin",
    terms: [
      "email",
      "inbox",
      "admin",
      "invoice",
      "budget",
      "organize",
      "meeting",
      "expenses",
    ],
  },
];

function startOfLocalDay(timestampMs: number) {
  const date = new Date(timestampMs);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function startOfLocalWeek(timestampMs: number) {
  const date = new Date(timestampMs);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - daysSinceMonday,
  ).getTime();
}

export function getLocalDateKey(timestampMs: number) {
  const date = new Date(timestampMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getSessionTaskName(session: CompletedTimerSession) {
  return (
    session.taskName?.trim() ||
    session.intention?.trim() ||
    "Untitled focus session"
  );
}

export function inferFocusCategory(taskName?: string): FocusCategory {
  const normalized = taskName?.toLowerCase().trim() ?? "";

  for (const matcher of categoryMatchers) {
    if (matcher.terms.some((term) => normalized.includes(term))) {
      return matcher.category;
    }
  }

  return "General";
}

export function getFocusSessions(sessions: CompletedTimerSession[]) {
  return sessions
    .filter((session) => session.countsAsFocus)
    .sort((a, b) => b.completedAtMs - a.completedAtMs);
}

export function getJournalSessionsForPeriod(
  sessions: CompletedTimerSession[],
  period: JournalPeriod,
  nowMs = Date.now(),
) {
  const periodStart =
    period === "today" ? startOfLocalDay(nowMs) : startOfLocalWeek(nowMs);

  return getFocusSessions(sessions).filter(
    (session) => session.completedAtMs >= periodStart,
  );
}

export function groupFocusSessionsByDay(
  sessions: CompletedTimerSession[],
): FocusSessionGroup[] {
  const groups = new Map<string, CompletedTimerSession[]>();

  for (const session of getFocusSessions(sessions)) {
    const dateKey =
      session.completedDate ?? getLocalDateKey(session.completedAtMs);
    const existing = groups.get(dateKey) ?? [];
    existing.push(session);
    groups.set(dateKey, existing);
  }

  return Array.from(groups, ([dateKey, groupedSessions]) => ({
    dateKey,
    sessions: groupedSessions,
  }));
}

export function calculateFocusJournalSummary(
  sessions: CompletedTimerSession[],
): FocusJournalSummary {
  const focusSessions = getFocusSessions(sessions);
  const categories = new Map<
    FocusCategory,
    { count: number; latestAtMs: number }
  >();

  for (const session of focusSessions) {
    const category =
      session.category ?? inferFocusCategory(getSessionTaskName(session));
    const current = categories.get(category);
    categories.set(category, {
      count: (current?.count ?? 0) + 1,
      latestAtMs: Math.max(current?.latestAtMs ?? 0, session.completedAtMs),
    });
  }

  const mostCommonCategory =
    Array.from(categories.entries()).sort(
      ([, first], [, second]) =>
        second.count - first.count ||
        second.latestAtMs - first.latestAtMs,
    )[0]?.[0] ?? null;

  return {
    totalBlocks: focusSessions.length,
    totalSeconds: focusSessions.reduce(
      (total, session) => total + session.durationSeconds,
      0,
    ),
    mostCommonCategory,
  };
}

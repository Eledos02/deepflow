import type {
  FocusMomentum,
  WorkspaceAnalytics,
} from "./workspace-analytics";
import { formatFocusDuration } from "./workspace-analytics";

export type SessionQuality = {
  label: "Deep sessions" | "Steady sessions" | "Quick focus";
  description: string;
};

export type FocusPersonality = {
  label:
    | "Morning Builder"
    | "Night Creator"
    | "Consistent Performer"
    | "Weekend Explorer"
    | "Deep Worker";
  description: string;
};

export type WeeklyReflection = {
  title: string;
  description: string;
};

export type WorkspaceFocusIntelligence = {
  hasRecentFocus: boolean;
  hasEnoughRecentPatternData: boolean;
  bestFocusTime: string | null;
  mostProductiveDay: string | null;
  momentum: FocusMomentum;
  sessionQuality: SessionQuality | null;
  personality: FocusPersonality | null;
  reflection: WeeklyReflection | null;
};

export function getSessionQuality(
  analytics: WorkspaceAnalytics,
): SessionQuality | null {
  if (!analytics.hasEnoughRecentFocusPatternData) return null;

  if (analytics.averageSessionLengthLastSevenDays >= 60) {
    return {
      label: "Deep sessions",
      description: `Your ${formatFocusDuration(analytics.averageSessionLengthLastSevenDays)} recent average leaves room for meaningful, uninterrupted work.`,
    };
  }

  if (analytics.averageSessionLengthLastSevenDays >= 30) {
    return {
      label: "Steady sessions",
      description: `Your ${formatFocusDuration(analytics.averageSessionLengthLastSevenDays)} recent average is a dependable rhythm for focused progress.`,
    };
  }

  return {
    label: "Quick focus",
    description:
      "Your average session length suggests the kind of focus block that is easiest to repeat.",
  };
}

export function getFocusPersonality(
  analytics: WorkspaceAnalytics,
): FocusPersonality | null {
  if (!analytics.hasEnoughRecentFocusPatternData) return null;

  if (
    analytics.weekendFocusMinutesLastSevenDays > 0 &&
    analytics.weekendFocusMinutesLastSevenDays >
      analytics.weekdayFocusMinutesLastSevenDays / 2
  ) {
    return {
      label: "Weekend Explorer",
      description: "More open days are becoming an important source of focus energy for you.",
    };
  }

  if (analytics.averageSessionLengthLastSevenDays >= 60) {
    return {
      label: "Deep Worker",
      description: "Longer, uninterrupted blocks are becoming the place where your best attention gathers.",
    };
  }

  if (
    analytics.activeFocusDaysLastSevenDays >= 4 ||
    analytics.currentStreak >= 4
  ) {
    return {
      label: "Consistent Performer",
      description: "Consistency is becoming a stronger advantage than intensity.",
    };
  }

  if ((analytics.bestFocusHourIndexLastSevenDays ?? 12) >= 18) {
    return {
      label: "Night Creator",
      description: "Your clearest attention seems to emerge as the day becomes quieter.",
    };
  }

  return {
    label: "Morning Builder",
    description: "Fresh morning energy is becoming a reliable part of your focus rhythm.",
  };
}

export function getWeeklyReflection(
  analytics: WorkspaceAnalytics,
): WeeklyReflection | null {
  if (analytics.sessionsLastSevenDays === 0) return null;

  if (!analytics.hasEnoughRecentFocusPatternData) {
    return {
      title: "Your rhythm is starting to take shape.",
      description:
        "Complete a few more sessions and DeepFlow will begin to surface your strongest focus patterns.",
    };
  }

  const focusObservation =
    analytics.bestFocusDayLastSevenDays && analytics.bestFocusHourLastSevenDays
      ? `${analytics.bestFocusDayLastSevenDays} emerged as your strongest focus day, while your sharpest attention window appeared around ${analytics.bestFocusHourLastSevenDays}.`
      : analytics.bestFocusDayLastSevenDays
        ? `${analytics.bestFocusDayLastSevenDays} emerged as your strongest focus day.`
        : analytics.bestFocusHourLastSevenDays
          ? `Your sharpest attention window appeared around ${analytics.bestFocusHourLastSevenDays}.`
          : "A clearer focus pattern is beginning to emerge.";

  if (!analytics.momentum.hasBaseline) {
    return {
      title: "Your rhythm is taking shape.",
      description:
        "A few completed sessions are beginning to form a useful pattern. Give the next week a little more focus time and DeepFlow can begin comparing your momentum with care.",
    };
  }

  if (analytics.momentum.state === "rising") {
    return {
      title: "Your rhythm is building.",
      description: `Your attention found a steadier rhythm this week. Momentum is beginning to build naturally from repeated focus sessions. ${focusObservation}`,
    };
  }

  if (analytics.momentum.state === "slowing") {
    return {
      title: "A gentle reset is enough.",
      description: `Your attention met a quieter rhythm this week. A small, clear focus block can help momentum gather again. ${focusObservation}`,
    };
  }

  return {
    title: "Steady progress.",
    description: `Your attention held a steady rhythm this week. Repeated focus sessions are giving your momentum a durable shape. ${focusObservation}`,
  };
}

export function buildWorkspaceFocusIntelligence(
  analytics: WorkspaceAnalytics,
): WorkspaceFocusIntelligence {
  const hasRecentFocus = analytics.sessionsLastSevenDays > 0;
  const sessionQuality = getSessionQuality(analytics);
  const personality = getFocusPersonality(analytics);

  return {
    hasRecentFocus,
    hasEnoughRecentPatternData: analytics.hasEnoughRecentFocusPatternData,
    bestFocusTime: analytics.bestFocusHourLastSevenDays,
    mostProductiveDay: analytics.bestFocusDayLastSevenDays,
    momentum: analytics.momentum,
    sessionQuality,
    personality,
    reflection: getWeeklyReflection(analytics),
  };
}

import { getTimerPath, timers } from "../config/timers";
import { guides } from "../content/guides";
import { getTimerToolPath, timerTools } from "../content/timer-tools";

export type IndexableRoute = {
  path: string;
  changeFrequency: "weekly" | "monthly";
  priority: number;
};

const staticRoutes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/timers", changeFrequency: "weekly", priority: 0.95 },
  { path: "/adhd-timer", changeFrequency: "monthly", priority: 0.9 },
  { path: "/guides", changeFrequency: "weekly", priority: 0.85 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.7 },
] satisfies IndexableRoute[];

export function getIndexableRoutes(): IndexableRoute[] {
  return [
    ...staticRoutes,
    ...timerTools
      .map((tool) => ({
        path: getTimerToolPath(tool.slug),
        changeFrequency: "monthly" as const,
        priority: 0.9,
      })),
    ...timers.map((minutes) => ({
      path: getTimerPath(minutes),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...guides.map((guide) => ({
      path: `/guides/${guide.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
  ];
}

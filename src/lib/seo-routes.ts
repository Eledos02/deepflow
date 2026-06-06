import { getTimerPath, timers } from "../config/timers";
import { guides } from "../content/guides";
import { timerTools } from "../content/timer-tools";

export type IndexableRoute = {
  path: string;
  changeFrequency: "weekly" | "monthly";
  priority: number;
};

const staticRoutes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.7 },
] satisfies IndexableRoute[];

export function getIndexableRoutes(): IndexableRoute[] {
  return [
    ...staticRoutes,
    ...timerTools.map((tool) => ({
      path: `/tools/${tool.slug}`,
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

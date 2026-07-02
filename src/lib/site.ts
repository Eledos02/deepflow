export const productionSiteUrl = "https://deepflownow.com";

export function normalizeSiteUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Site URL must be an absolute URL: ${value}`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Site URL must use http or https: ${value}`);
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      `Site URL cannot include credentials, query parameters, or a hash: ${value}`,
    );
  }

  url.pathname = "/";
  return url.toString().replace(/\/$/, "");
}

export const siteConfig = {
  name: "DeepFlow",
  title: "DeepFlow - Calm Focus Workspace for Deep Work",
  description:
    "DeepFlow is a calm focus workspace with focus timers, routines, goals, a private Focus Journal, and quiet insights for deep work.",
  socialImage: "/deepflow-og.png",
  url: normalizeSiteUrl(productionSiteUrl),
  email: "hello@deepflownow.com",
  navigation: [
    { label: "Product", href: "/#product" },
    { label: "Workspace", href: "/workspace" },
    { label: "Guides", href: "/guides" },
    { label: "Pricing", href: "/pricing" },
  ],
  timerNavigation: [
    { label: "All Timers", href: "/timers" },
    { label: "Focus Timer", href: "/tools/focus-timer" },
    { label: "Countdown Timer", href: "/tools/countdown-timer" },
    { label: "Study Timer", href: "/tools/study-timer" },
    { label: "Pomodoro Timer", href: "/pomodoro-timer" },
    { label: "ADHD Timer", href: "/adhd-timer" },
  ],
} as const;

export function absoluteUrl(path = "/") {
  if (!path.startsWith("/")) {
    throw new Error(`Site-relative URLs must start with "/": ${path}`);
  }

  return new URL(path, siteConfig.url).toString();
}

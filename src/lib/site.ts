const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://deepflow.app";

export function normalizeSiteUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`NEXT_PUBLIC_SITE_URL must be an absolute URL: ${value}`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must use http or https: ${value}`,
    );
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL cannot include credentials, query parameters, or a hash: ${value}`,
    );
  }

  url.pathname = "/";
  return url.toString().replace(/\/$/, "");
}

export const siteConfig = {
  name: "DeepFlow",
  title: "DeepFlow - Focus better. Finish what matters.",
  description:
    "A calm focus timer for deep work, Pomodoro sessions, and distraction-free productivity.",
  url: normalizeSiteUrl(configuredSiteUrl),
  email: "hello@deepflow.app",
  navigation: [
    { label: "Product", href: "/#product" },
    { label: "Focus timer", href: "/tools/focus-timer" },
    { label: "Pomodoro", href: "/tools/pomodoro-timer" },
    { label: "Guides", href: "/guides/deep-work" },
  ],
} as const;

export function absoluteUrl(path = "/") {
  if (!path.startsWith("/")) {
    throw new Error(`Site-relative URLs must start with "/": ${path}`);
  }

  return new URL(path, siteConfig.url).toString();
}

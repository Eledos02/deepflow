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
  title: "DeepFlow — Focus better. Finish what matters.",
  description:
    "Calm focus timers, deep work sessions, Pomodoro, and distraction-free productivity.",
  socialImage: "/deepflow-og.png",
  url: normalizeSiteUrl(productionSiteUrl),
  email: "hello@deepflownow.com",
  navigation: [
    { label: "Product", href: "/#product" },
    { label: "Focus timer", href: "/tools/focus-timer" },
    { label: "Pomodoro", href: "/pomodoro-timer" },
    { label: "Guides", href: "/guides/deep-work" },
  ],
} as const;

export function absoluteUrl(path = "/") {
  if (!path.startsWith("/")) {
    throw new Error(`Site-relative URLs must start with "/": ${path}`);
  }

  return new URL(path, siteConfig.url).toString();
}

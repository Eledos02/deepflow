export const footerGroups = [
  {
    title: "Timers",
    links: [
      { label: "All Timers", href: "/timers" },
      { label: "Focus Timer", href: "/tools/focus-timer" },
      { label: "Countdown Timer", href: "/tools/countdown-timer" },
      { label: "Study Timer", href: "/tools/study-timer" },
      { label: "Pomodoro Timer", href: "/tools/pomodoro-timer" },
      { label: "ADHD Timer", href: "/adhd-timer" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "Deep work guide", href: "/guides/deep-work" },
      { label: "Pomodoro method", href: "/guides/pomodoro-technique" },
      { label: "Focus better", href: "/guides/focus-better" },
      { label: "Workspace", href: "/workspace" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
] as const;

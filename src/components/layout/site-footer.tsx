import Link from "next/link";

import { Brand } from "@/components/ui/brand";

const footerGroups = [
  {
    title: "Timers",
    links: [
      { label: "All Timers", href: "/timers" },
      { label: "Focus Timer", href: "/tools/focus-timer" },
      { label: "Countdown Timer", href: "/tools/countdown-timer" },
      { label: "Study Timer", href: "/tools/study-timer" },
      { label: "Pomodoro Timer", href: "/pomodoro-timer" },
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
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__grid">
        <div className="footer-brand">
          <Brand variant="inverse" />
          <p>Quiet tools for ambitious minds.</p>
        </div>
        {footerGroups.map((group) => (
          <div className="footer-group" key={group.title}>
            <h2>{group.title}</h2>
            {group.links.map((link) => (
              <Link href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
        <div className="footer-note">
          <p>Built for the work that deserves your full attention.</p>
          <span>&copy; {new Date().getFullYear()} DeepFlow</span>
        </div>
      </div>
    </footer>
  );
}

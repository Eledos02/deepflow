import Link from "next/link";

import { Brand } from "@/components/ui/brand";

const footerGroups = [
  {
    title: "Tools",
    links: [
      { label: "Focus timer", href: "/tools/focus-timer" },
      { label: "Pomodoro timer", href: "/pomodoro-timer" },
      { label: "Countdown timer", href: "/tools/countdown-timer" },
      { label: "25 minute timer", href: "/timer/25" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "Deep work guide", href: "/guides/deep-work" },
      { label: "Pomodoro method", href: "/guides/pomodoro-technique" },
      { label: "Focus better", href: "/guides/focus-better" },
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

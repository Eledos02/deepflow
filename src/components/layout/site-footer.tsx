import Link from "next/link";

import { Brand } from "@/components/ui/brand";
import { footerGroups } from "./site-footer-links";

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

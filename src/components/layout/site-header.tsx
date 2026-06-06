import Link from "next/link";

import { Brand } from "@/components/ui/brand";
import { MenuIcon } from "@/components/ui/icons";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          {siteConfig.navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link className="text-link text-link--muted" href="/pricing">
            Pricing
          </Link>
          <Link className="button button--small button--dark" href="/tools/focus-timer">
            Start free
          </Link>
          <details className="mobile-menu">
            <summary aria-label="Open navigation">
              <MenuIcon />
            </summary>
            <div className="mobile-menu__panel">
              <nav aria-label="Mobile navigation">
                {siteConfig.navigation.map((item) => (
                  <Link href={item.href} key={item.href}>
                    {item.label}
                  </Link>
                ))}
                <Link href="/tools/countdown-timer">Countdown timer</Link>
                <Link href="/pricing">Pricing</Link>
              </nav>
              <Link className="button button--dark button--full" href="/tools/focus-timer">
                Start a focus session
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

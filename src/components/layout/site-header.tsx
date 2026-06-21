"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Brand } from "@/components/ui/brand";
import { MenuIcon } from "@/components/ui/icons";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  const mobileMenuId = useId();
  const mobileMenuRef = useRef<HTMLDetailsElement | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    if (mobileMenuRef.current) mobileMenuRef.current.open = false;
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const details = mobileMenuRef.current;
      if (!details?.open) return;
      if (event.target instanceof Node && details.contains(event.target)) {
        return;
      }

      closeMobileMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
          <Link className="button button--small button--dark" href="/tools/focus-timer">
            Start free
          </Link>
          <details
            className="mobile-menu"
            onToggle={(event) =>
              setIsMobileMenuOpen(event.currentTarget.open)
            }
            ref={mobileMenuRef}
          >
            <summary
              aria-controls={mobileMenuId}
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"}
            >
              <MenuIcon />
            </summary>
            <div className="mobile-menu__panel" id={mobileMenuId}>
              <nav aria-label="Mobile navigation">
                {siteConfig.navigation.map((item) => (
                  <Link
                    href={item.href}
                    key={item.href}
                    onClick={closeMobileMenu}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <Link
                className="button button--dark button--full"
                href="/tools/focus-timer"
                onClick={closeMobileMenu}
              >
                Start a focus session
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

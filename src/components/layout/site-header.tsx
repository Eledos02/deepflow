"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Brand } from "@/components/ui/brand";
import { useAuth } from "@/features/auth/auth-provider";
import { getAvatarInitial } from "@/features/auth/profile";
import { MenuIcon } from "@/components/ui/icons";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  const mobileMenuId = useId();
  const timersMenuId = useId();
  const accountMenuId = useId();
  const mobileMenuRef = useRef<HTMLDetailsElement | null>(null);
  const timersMenuRef = useRef<HTMLDetailsElement | null>(null);
  const accountMenuRef = useRef<HTMLDetailsElement | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTimersMenuOpen, setIsTimersMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const { isLoading, profile, signOut, user } = useAuth();
  const router = useRouter();

  const closeMobileMenu = () => {
    if (mobileMenuRef.current) mobileMenuRef.current.open = false;
    setIsMobileMenuOpen(false);
  };

  const closeTimersMenu = () => {
    if (timersMenuRef.current) timersMenuRef.current.open = false;
    setIsTimersMenuOpen(false);
  };

  const closeAccountMenu = () => {
    if (accountMenuRef.current) accountMenuRef.current.open = false;
    setIsAccountMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    closeAccountMenu();
    closeMobileMenu();
    router.push("/");
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;

      const mobileMenu = mobileMenuRef.current;
      if (mobileMenu?.open && !mobileMenu.contains(event.target)) {
        closeMobileMenu();
      }

      const timersMenu = timersMenuRef.current;
      if (timersMenu?.open && !timersMenu.contains(event.target)) {
        closeTimersMenu();
      }

      const accountMenu = accountMenuRef.current;
      if (accountMenu?.open && !accountMenu.contains(event.target)) {
        closeAccountMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileMenu();
        closeTimersMenu();
        closeAccountMenu();
      }
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
          {siteConfig.navigation.slice(0, 2).map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          <details
            className="timers-menu"
            onToggle={(event) => setIsTimersMenuOpen(event.currentTarget.open)}
            ref={timersMenuRef}
          >
            <summary
              aria-controls={timersMenuId}
              aria-expanded={isTimersMenuOpen}
            >
              Timers
            </summary>
            <div className="timers-menu__panel" id={timersMenuId}>
              {siteConfig.timerNavigation.map((item) => (
                <Link href={item.href} key={item.href} onClick={closeTimersMenu}>
                  {item.label}
                </Link>
              ))}
            </div>
          </details>
          {siteConfig.navigation.slice(2).map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          {!isLoading && user ? (
            <details
              className="account-menu"
              onToggle={(event) => setIsAccountMenuOpen(event.currentTarget.open)}
              ref={accountMenuRef}
            >
              <summary aria-controls={accountMenuId} aria-expanded={isAccountMenuOpen}>
                <span className="account-menu__avatar" aria-hidden="true">
                  {getAvatarInitial(profile?.displayName, user.email)}
                </span>
                <span className="account-menu__label">
                  {profile?.displayName || user.email}
                </span>
              </summary>
              <div className="account-menu__panel" id={accountMenuId}>
                <div className="account-menu__identity">
                  <strong>{profile?.displayName || "DeepFlow member"}</strong>
                  <span>{user.email}</span>
                </div>
                <Link href="/account" onClick={closeAccountMenu}>Account</Link>
                <Link href="/workspace" onClick={closeAccountMenu}>Workspace</Link>
                <button onClick={() => void handleSignOut()} type="button">Log out</button>
              </div>
            </details>
          ) : (
            <>
              <Link className="header-actions__login" href="/login">Log in</Link>
              <Link className="button button--small button--dark" href="/tools/focus-timer">
                Start free
              </Link>
            </>
          )}
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
                {[
                  ...siteConfig.navigation.slice(0, 2),
                  ...siteConfig.timerNavigation,
                  ...siteConfig.navigation.slice(2),
                ].map((item) => (
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
              {!isLoading && user ? (
                <div className="mobile-menu__account-links">
                  <Link href="/account" onClick={closeMobileMenu}>Account</Link>
                  <button onClick={() => void handleSignOut()} type="button">Log out</button>
                </div>
              ) : (
                <div className="mobile-menu__account-links">
                  <Link href="/login" onClick={closeMobileMenu}>Log in</Link>
                  <Link href="/signup" onClick={closeMobileMenu}>Create account</Link>
                </div>
              )}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

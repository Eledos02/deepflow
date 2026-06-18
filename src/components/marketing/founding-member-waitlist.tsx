"use client";

import { FormEvent, useEffect, useId, useState } from "react";

import { trackFoundingMemberWaitlistJoined } from "@/lib/analytics";

const WAITLIST_STORAGE_KEY = "deepflow:founding-member-waitlist:v1";

type WaitlistEntry = {
  email: string;
  joinedAt: string;
  plan: "founding_member";
  price: 19;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readEntries(): WaitlistEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(WAITLIST_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry): entry is WaitlistEntry => {
      if (!entry || typeof entry !== "object") return false;
      const candidate = entry as Partial<WaitlistEntry>;
      return (
        typeof candidate.email === "string" &&
        typeof candidate.joinedAt === "string" &&
        candidate.plan === "founding_member" &&
        candidate.price === 19
      );
    });
  } catch {
    return [];
  }
}

function saveEntry(entry: WaitlistEntry) {
  if (typeof window === "undefined") return;

  const entries = readEntries();
  const nextEntries = entries.some((existing) => existing.email === entry.email)
    ? entries
    : [...entries, entry];

  // TODO: Replace localStorage MVP waitlist storage with Supabase,
  // ConvertKit, Mailchimp, Resend, or a backend API before launch.
  window.localStorage.setItem(
    WAITLIST_STORAGE_KEY,
    JSON.stringify(nextEntries),
  );
}

export function FoundingMemberWaitlist() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    const hydrationId = window.setTimeout(() => {
      setIsJoined(readEntries().length > 0);
    }, 0);

    return () => window.clearTimeout(hydrationId);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setError("Enter your email address to join the waitlist.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError("Use a valid email address, like you@example.com.");
      return;
    }

    const existingEntries = readEntries();
    if (existingEntries.some((entry) => entry.email === normalizedEmail)) {
      setIsJoined(true);
      setError("");
      return;
    }

    saveEntry({
      email: normalizedEmail,
      joinedAt: new Date().toISOString(),
      plan: "founding_member",
      price: 19,
    });
    trackFoundingMemberWaitlistJoined();
    setIsJoined(true);
    setError("");
  };

  if (isJoined) {
    return (
      <div className="founding-waitlist__success" role="status">
        <strong>You&apos;re on the list.</strong>
        <p>
          We&apos;ll notify you before Founding Member access opens and before
          the lifetime launch pricing expires.
        </p>
      </div>
    );
  }

  return (
    <form className="founding-waitlist__form" onSubmit={handleSubmit}>
      <label htmlFor={emailId}>Email Address</label>
      <div className="founding-waitlist__control">
        <input
          autoComplete="email"
          id={emailId}
          inputMode="email"
          onChange={(event) => {
            setEmail(event.target.value);
            if (error) setError("");
          }}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
        <button className="button button--light" type="submit">
          Join the Founding Member Waitlist
        </button>
      </div>
      {error ? (
        <p className="founding-waitlist__error" role="alert">
          {error}
        </p>
      ) : (
        <p className="founding-waitlist__privacy">
          No payment today. We&apos;ll only use this email for Founding Member
          access updates.
        </p>
      )}
    </form>
  );
}

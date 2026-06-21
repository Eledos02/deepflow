"use client";

import { FormEvent, useEffect, useId, useState } from "react";

import { trackFoundingMemberWaitlistJoined } from "@/lib/analytics";

const WAITLIST_STORAGE_KEY = "deepflow:founding-member-waitlist:v1";

type WaitlistEntry = {
  email: string;
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

    return parsed.flatMap((entry) => {
      if (typeof entry === "string") {
        return isValidEmail(entry) ? [{ email: normalizeEmail(entry) }] : [];
      }
      if (!entry || typeof entry !== "object") return [];
      const candidate = entry as Partial<WaitlistEntry>;
      return typeof candidate.email === "string" && isValidEmail(candidate.email)
        ? [{ email: normalizeEmail(candidate.email) }]
        : [];
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

  // UI-only duplicate prevention. Waitlist records are stored by /api/waitlist.
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const hydrationId = window.setTimeout(() => {
      setIsJoined(readEntries().length > 0);
    }, 0);

    return () => window.clearTimeout(hydrationId);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          source: "pricing",
          plan: "founding_member",
        }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "detail" in payload &&
          typeof payload.detail === "string"
            ? payload.detail
            : "We could not save your place on the waitlist. Please try again.";
        setError(message);
        return;
      }

      saveEntry({ email: normalizedEmail });
      trackFoundingMemberWaitlistJoined();
      setIsJoined(true);
      setError("");
    } catch {
      setError("We could not reach the waitlist right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
        <button className="button button--light" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Joining..." : "Join the Founding Member Waitlist"}
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

"use client";

import { FormEvent, useId, useRef, useState } from "react";

import type { WaitlistSource } from "@/features/waitlist/waitlist";
import {
  getWaitlistEmailSubmissionStatus,
  saveWaitlistSubmissionEmail,
} from "@/features/waitlist/waitlist-submissions";
import { trackFoundingMemberWaitlistJoined } from "@/lib/analytics";

type FoundingMemberWaitlistProps = {
  source?: WaitlistSource;
  variant?: "default" | "compact";
};

const sourceOverrides = new Set<WaitlistSource>([
  "workspace_upgrade",
]);

function resolveSubmissionSource(source: WaitlistSource) {
  if (typeof window === "undefined") return source;

  const requestedSource = new URLSearchParams(window.location.search).get("source");
  return requestedSource && sourceOverrides.has(requestedSource as WaitlistSource)
    ? (requestedSource as WaitlistSource)
    : source;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function FoundingMemberWaitlist({
  source = "pricing_founding_member",
  variant = "default",
}: FoundingMemberWaitlistProps) {
  const emailId = useId();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successState, setSuccessState] = useState<"joined" | "duplicate" | null>(
    null,
  );
  const [emailSent, setEmailSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(email);
    const submissionSource = resolveSubmissionSource(source);

    if (!normalizedEmail) {
      setError("Enter your email address to join the waitlist.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError("Use a valid email address, like you@example.com.");
      return;
    }

    if (
      getWaitlistEmailSubmissionStatus(
        window.localStorage,
        normalizedEmail,
      ) === "duplicate"
    ) {
      setSuccessState("duplicate");
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
          source: submissionSource,
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

      saveWaitlistSubmissionEmail(window.localStorage, normalizedEmail);
      const isAlreadyJoined =
        payload &&
        typeof payload === "object" &&
        "status" in payload &&
        payload.status === "already_joined";
      const confirmationWasSent =
        payload &&
        typeof payload === "object" &&
        "emailSent" in payload &&
        payload.emailSent === true
          ? true
          : false;

      if (!isAlreadyJoined) {
        trackFoundingMemberWaitlistJoined(submissionSource);
      }
      setEmailSent(confirmationWasSent);
      setSuccessState(isAlreadyJoined ? "duplicate" : "joined");
      setError("");
    } catch {
      setError("We could not reach the waitlist right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successState) {
    const isDuplicate = successState === "duplicate";

    return (
      <div
        className={`founding-waitlist__success founding-waitlist__success--${variant}`}
        role="status"
      >
        <strong>
          {isDuplicate
            ? "You're already on the Founding Member list."
            : "You're on the Founding Member list."}
        </strong>
        <p>
          {isDuplicate
            ? "No payment is needed to stay on the update list."
            : "No payment today. We'll email you about Founder availability and product updates."}
        </p>
        {emailSent ? (
          <p className="founding-waitlist__email-hint">
            Check your inbox for a confirmation email.
          </p>
        ) : null}
        <button
          className="founding-waitlist__alternate-email"
          onClick={() => {
            setEmail("");
            setError("");
            setEmailSent(false);
            setSuccessState(null);
            window.requestAnimationFrame(() => emailInputRef.current?.focus());
          }}
          type="button"
        >
          Use another email
        </button>
      </div>
    );
  }

  return (
    <form
      className={`founding-waitlist__form founding-waitlist__form--${variant}`}
      onSubmit={handleSubmit}
    >
      <label className={variant === "compact" ? "sr-only" : undefined} htmlFor={emailId}>
        Email Address
      </label>
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
          ref={emailInputRef}
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
          availability and product updates.
        </p>
      )}
    </form>
  );
}

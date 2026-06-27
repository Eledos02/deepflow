"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { getAvatarInitial, validateDisplayName } from "@/features/auth/profile";
import { useCloudSync } from "@/features/sync/cloud-sync-provider";
import { getCloudSyncCardState } from "@/features/sync/sync-status";

function AuthUnavailable() {
  return (
    <div className="auth-message" role="status">
      <strong>Accounts are not configured in this environment yet.</strong>
      <p>You can still use DeepFlow freely without an account. Add the public Supabase Auth variables to enable sign-in.</p>
    </div>
  );
}

function AuthLoading() {
  return <p className="auth-loading" role="status">Checking your account…</p>;
}

function OnboardingForm() {
  const router = useRouter();
  const { profile, updateDisplayName, user } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateDisplayName(displayName);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setIsSubmitting(true);
    const result = await updateDisplayName(validation.value);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push("/workspace");
  };

  return (
    <section className="auth-page">
      <div className="auth-card auth-card--onboarding">
        <span className="eyebrow">Welcome</span>
        <h1>Welcome to DeepFlow.</h1>
        <p>What should we call you?</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="display-name">Your name</label>
          <input
            autoComplete="name"
            id="display-name"
            maxLength={40}
            onChange={(event) => {
              setDisplayName(event.target.value);
              if (error) setError("");
            }}
            placeholder="Your name"
            value={displayName}
          />
          {error ? <p className="auth-form__error" role="alert">{error}</p> : null}
          <button className="button button--dark button--full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving…" : "Continue to Workspace"}
          </button>
        </form>
        <p className="auth-card__note">Your current workspace stays stored locally on this device. Cloud sync is coming later.</p>
        {user?.email ? <small>{user.email}</small> : null}
      </div>
    </section>
  );
}

export function SignupPageContent() {
  const { isConfigured, isLoading, profile, signUp, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await signUp(email.trim(), password);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError("");
    setNeedsConfirmation(Boolean(result.requiresEmailConfirmation));
  };

  if (isLoading) return <AuthLoading />;
  if (!isConfigured) return <section className="auth-page"><AuthUnavailable /></section>;
  if (user && !profile?.onboardingCompleted) return <OnboardingForm />;
  if (user && profile?.onboardingCompleted) {
    return (
      <section className="auth-page">
        <div className="auth-card auth-message">
          <strong>Your account is ready.</strong>
          <p>Return to the place where your focus rhythm lives.</p>
          <Link className="button button--dark" href="/workspace">Open Workspace</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">DeepFlow account</span>
        <h1>Create your DeepFlow account.</h1>
        <p>Save your identity now. Cloud sync and Pro features will build from here.</p>
        {needsConfirmation ? (
          <div className="auth-message" role="status">
            <strong>Check your inbox to confirm your email.</strong>
            <p>Once confirmed, sign in to choose your display name and continue to Workspace.</p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="signup-email">Email address</label>
            <input autoComplete="email" id="signup-email" inputMode="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} />
            <label htmlFor="signup-password">Password</label>
            <input autoComplete="new-password" id="signup-password" minLength={8} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required type="password" value={password} />
            {error ? <p className="auth-form__error" role="alert">{error}</p> : null}
            <button className="button button--dark button--full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}
        <p className="auth-card__footer">Already have an account? <Link href="/login">Sign in</Link></p>
      </div>
    </section>
  );
}

export function LoginPageContent() {
  const router = useRouter();
  const { isConfigured, isLoading, signIn, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push("/signup");
  };

  if (isLoading) return <AuthLoading />;
  if (!isConfigured) return <section className="auth-page"><AuthUnavailable /></section>;
  if (user) {
    return (
      <section className="auth-page">
        <div className="auth-card auth-message">
          <strong>You&apos;re already signed in.</strong>
          <Link className="button button--dark" href="/workspace">Open Workspace</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">DeepFlow account</span>
        <h1>Welcome back.</h1>
        <p>Return to your DeepFlow workspace.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email address</label>
          <input autoComplete="email" id="login-email" inputMode="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} />
          <label htmlFor="login-password">Password</label>
          <input autoComplete="current-password" id="login-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          {error ? <p className="auth-form__error" role="alert">{error}</p> : null}
          <button className="button button--dark button--full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="auth-card__footer">New to DeepFlow? <Link href="/signup">Create an account</Link></p>
      </div>
    </section>
  );
}

export function AccountPageContent() {
  const { isConfigured, isLoading, profile, signOut, updateDisplayName, user } = useAuth();
  const {
    isAvailable,
    migration,
    saveDeviceDataToAccount,
    status,
    statusLabel,
    syncNow,
  } = useCloudSync();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const syncId = window.setTimeout(() => {
      setDisplayName(profile?.displayName ?? "");
    }, 0);

    return () => window.clearTimeout(syncId);
  }, [profile?.displayName]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    const result = await updateDisplayName(displayName);
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1_800);
  };

  if (isLoading) return <AuthLoading />;
  if (!isConfigured) return <section className="auth-page"><AuthUnavailable /></section>;
  if (!user) {
    return (
      <section className="auth-page">
        <div className="auth-card auth-message">
          <strong>Sign in to see your account.</strong>
          <p>DeepFlow remains fully usable without one.</p>
          <Link className="button button--dark" href="/login">Sign in</Link>
        </div>
      </section>
    );
  }

  const memberSince = profile?.createdAt
    ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(profile.createdAt))
    : "Recently";
  const canSaveDeviceData =
    isAvailable &&
    migration.summary.hasData &&
    migration.status !== "completed";
  const migrationTitle =
    migration.status === "completed"
      ? "Saved to your DeepFlow account."
      : migration.status === "error"
        ? "Saved locally. Cloud save will retry."
        : migration.summary.hasData
          ? "Save this device data"
          : "This device is already synced.";
  const migrationDescription =
    migration.summary.hasData
      ? "You have focus history on this device. Save it to your DeepFlow account so it can be restored later."
      : "There is no local focus history, routine, or goal waiting to be saved from this device.";

  return (
    <section className="auth-page">
      <div className="account-page">
        <div className="account-page__heading">
          <span className="eyebrow">Account</span>
          <h1>Your DeepFlow account.</h1>
          <p>A simple identity for your focus rhythm.</p>
        </div>
        <div className="account-profile-card">
          <div className="account-profile-card__identity">
            <span className="account-avatar" aria-hidden="true">{getAvatarInitial(profile?.displayName, user.email)}</span>
            <div>
              <strong>{profile?.displayName || "DeepFlow member"}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="account-display-name">Display name</label>
            <input id="account-display-name" maxLength={40} onChange={(event) => { setDisplayName(event.target.value); setSaved(false); if (error) setError(""); }} value={displayName} />
            {error ? <p className="auth-form__error" role="alert">{error}</p> : null}
            <button className="button button--dark" disabled={isSaving} type="submit">
              {isSaving ? "Saving…" : saved ? "Saved" : "Save name"}
            </button>
          </form>
        </div>
        <div className="account-detail-grid">
          <article><span>Member since</span><strong>{memberSince}</strong></article>
          <article><span>Current plan</span><strong>Free</strong></article>
          <article><span>Founding Member</span><strong>Not active yet</strong></article>
        </div>
        <aside className="account-cloud-sync-card" data-state={status.state}>
          <div>
            <span className="eyebrow">Cloud sync</span>
            <strong>{getCloudSyncCardState(status.state, Boolean(user))}</strong>
            <p>
              Your focus sessions, routines, and goals can sync to your
              DeepFlow account. Notes Canvas sync is coming later.
            </p>
            <small>{statusLabel}</small>
            {!isAvailable ? (
              <small>Cloud sync is unavailable in this environment.</small>
            ) : null}
          </div>
          <button
            className="button button--dark"
            disabled={!isAvailable || status.state === "syncing"}
            onClick={() => void syncNow()}
            type="button"
          >
            {status.state === "syncing" ? "Syncing..." : "Sync now"}
          </button>
        </aside>
        <aside className="account-migration-card" data-state={migration.status}>
          <div>
            <span className="eyebrow">Device data</span>
            <strong>{migrationTitle}</strong>
            <p>{migrationDescription}</p>
            <dl className="account-migration-card__summary" aria-label="Local data found">
              <div>
                <dt>Sessions found</dt>
                <dd>{migration.summary.sessionsFound}</dd>
              </div>
              <div>
                <dt>Routines found</dt>
                <dd>{migration.summary.routinesFound}</dd>
              </div>
              <div>
                <dt>Goal found</dt>
                <dd>{migration.summary.goalFound ? "Yes" : "No"}</dd>
              </div>
            </dl>
            <small>
              DeepFlow keeps your work local first. Saving to your account
              creates a cloud backup without deleting anything from this device.
            </small>
          </div>
          {migration.summary.hasData ? (
            <button
              className="button button--dark"
              disabled={!canSaveDeviceData || migration.status === "saving"}
              onClick={() => void saveDeviceDataToAccount()}
              type="button"
            >
              {migration.status === "saving"
                ? "Saving your device data..."
                : migration.status === "completed"
                  ? "Saved"
                  : "Save to my account"}
            </button>
          ) : null}
        </aside>
        <aside className="account-local-note">
          <strong>Local-first by design</strong>
          <p>Your work is saved locally first. Cloud sync keeps a backup for your account.</p>
        </aside>
        <button className="button button--ghost" onClick={() => void signOut()} type="button">Sign out</button>
      </div>
    </section>
  );
}

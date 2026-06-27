"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  PASSWORD_RESET_EXPIRED_MESSAGE,
  PASSWORD_RESET_SENT_MESSAGE,
  PASSWORD_UPDATE_SUCCESS_MESSAGE,
  getPasswordResetRedirectTo,
  sendPasswordResetLink,
  updateRecoveredPassword,
} from "@/features/auth/password-recovery";
import { getAvatarInitial, validateDisplayName } from "@/features/auth/profile";
import { useCloudSync } from "@/features/sync/cloud-sync-provider";

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
        <p className="auth-card__note">Your current workspace stays on this device. You can save sessions, routines, and goals to your account from Account.</p>
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
        <p>Create a simple DeepFlow identity for cloud backup and account recovery.</p>
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
          <Link className="auth-form__subtle-link" href="/forgot-password">Forgot your password?</Link>
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

export function ForgotPasswordPageContent() {
  const { isConfigured, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await sendPasswordResetLink({
      email,
      redirectTo: getPasswordResetRedirectTo(window.location),
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError("");
    setIsSent(true);
  };

  if (isLoading) return <AuthLoading />;
  if (!isConfigured) return <section className="auth-page"><AuthUnavailable /></section>;

  return (
    <section className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">Password recovery</span>
        <h1>Reset your password.</h1>
        <p>Enter your email and we will send a reset link if the account exists.</p>
        {isSent ? (
          <div className="auth-message" role="status">
            <strong>Check your inbox.</strong>
            <p>{PASSWORD_RESET_SENT_MESSAGE}</p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="forgot-password-email">Email address</label>
            <input
              autoComplete="email"
              id="forgot-password-email"
              inputMode="email"
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) setError("");
              }}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
            {error ? <p className="auth-form__error" role="alert">{error}</p> : null}
            <button className="button button--dark button--full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Sending reset link..." : "Send reset link"}
            </button>
          </form>
        )}
        <p className="auth-card__footer">Remembered it? <Link href="/login">Sign in</Link></p>
      </div>
    </section>
  );
}

export function ResetPasswordPageContent() {
  const { isConfigured, isLoading, user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await updateRecoveredPassword({ password, confirmation });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError("");
    setIsUpdated(true);
    setPassword("");
    setConfirmation("");
  };

  if (isLoading) return <AuthLoading />;
  if (!isConfigured) return <section className="auth-page"><AuthUnavailable /></section>;
  if (!user) {
    return (
      <section className="auth-page">
        <div className="auth-card auth-message">
          <strong>{PASSWORD_RESET_EXPIRED_MESSAGE}</strong>
          <p>The reset link may have already been used or may be too old.</p>
          <Link className="button button--dark" href="/forgot-password">Request a new link</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">Password recovery</span>
        <h1>Choose a new password.</h1>
        <p>Use a password you do not use anywhere else.</p>
        {isUpdated ? (
          <div className="auth-message" role="status">
            <strong>{PASSWORD_UPDATE_SUCCESS_MESSAGE}</strong>
            <p>Your DeepFlow account is ready again.</p>
            <Link className="button button--dark" href="/workspace">Continue to DeepFlow</Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="reset-password-new">New password</label>
            <input
              autoComplete="new-password"
              id="reset-password-new"
              minLength={8}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError("");
              }}
              required
              type="password"
              value={password}
            />
            <label htmlFor="reset-password-confirm">Confirm password</label>
            <input
              autoComplete="new-password"
              id="reset-password-confirm"
              minLength={8}
              onChange={(event) => {
                setConfirmation(event.target.value);
                if (error) setError("");
              }}
              required
              type="password"
              value={confirmation}
            />
            {error ? <p className="auth-form__error" role="alert">{error}</p> : null}
            <button className="button button--dark button--full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Updating password..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

export function AccountPageContent() {
  const { isConfigured, isLoading, profile, signOut, updateDisplayName, user } = useAuth();
  const {
    dismissCloudRestore,
    health,
    isAvailable,
    migration,
    restore,
    restoreCloudData,
    saveDeviceDataToAccount,
    status,
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
          <strong>{health.title}</strong>
          <p>{health.body} Sign in when you want cloud backup for sessions, routines, and goals.</p>
          <Link className="button button--dark" href="/login">Sign in</Link>
        </div>
      </section>
    );
  }

  const memberSince = profile?.createdAt
    ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(profile.createdAt))
    : "Recently";
  const canSaveDeviceData = isAvailable && migration.summary.hasData && migration.status !== "saving";
  const canRestoreCloudData =
    isAvailable &&
    restore.summary.hasData &&
    restore.status !== "restoring";
  const shouldShowSaveAction =
    health.kind === "never-synced" ||
    (migration.summary.hasData && migration.status === "available");
  const shouldShowRestoreAction = health.kind === "restore-available";
  const syncActionLabel =
    health.kind === "error"
      ? "Try again"
      : status.state === "syncing"
        ? "Checking..."
        : "Sync now";

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
            <label htmlFor="account-display-name">Display name for DeepFlow</label>
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
          <article><span>Founding member</span><strong>Not active yet</strong></article>
        </div>
        <aside className="account-cloud-backup-card" data-state={health.kind}>
          <div className="account-cloud-backup-card__heading">
            <div>
              <span className="eyebrow">Cloud backup</span>
              <strong>{health.title}</strong>
              <p>{health.body}</p>
            </div>
            <span>{health.statusLine}</span>
          </div>
          <dl className="account-cloud-backup-card__metrics" aria-label="Cloud backup data summary">
            <div>
              <dt>Local sessions</dt>
              <dd>{migration.summary.sessionsFound}</dd>
            </div>
            <div>
              <dt>Local routines</dt>
              <dd>{migration.summary.routinesFound}</dd>
            </div>
            <div>
              <dt>Local goal</dt>
              <dd>{migration.summary.goalFound ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Cloud sessions</dt>
              <dd>{health.metadata.lastCloudSessionsCount}</dd>
            </div>
            <div>
              <dt>Cloud routines</dt>
              <dd>{health.metadata.lastCloudRoutinesCount}</dd>
            </div>
            <div>
              <dt>Cloud goal</dt>
              <dd>{health.metadata.lastCloudGoalFound ? "Yes" : "No"}</dd>
            </div>
          </dl>
          <dl className="account-cloud-backup-card__timeline" aria-label="Cloud backup activity">
            <div>
              <dt>Last saved to cloud</dt>
              <dd>{health.lastSavedLabel}</dd>
            </div>
            <div>
              <dt>Last restored here</dt>
              <dd>{health.lastRestoredLabel}</dd>
            </div>
            <div>
              <dt>Last checked</dt>
              <dd>{health.lastCheckedLabel}</dd>
            </div>
          </dl>
          {restore.summary.hasData ? (
            <dl className="account-cloud-backup-card__restore" aria-label="Cloud data available to restore">
              <div>
                <dt>Sessions to restore</dt>
                <dd>{restore.summary.sessionsAvailable}</dd>
              </div>
              <div>
                <dt>Routines to restore</dt>
                <dd>{restore.summary.routinesAvailable}</dd>
              </div>
              <div>
                <dt>Goal to restore</dt>
                <dd>{restore.summary.goalAvailable ? "Yes" : "No"}</dd>
              </div>
            </dl>
          ) : null}
          <small>
            Notes Canvas, canvas layout, audio preferences, and mind map data remain local-only.
          </small>
          <div className="account-cloud-backup-card__actions">
            {shouldShowRestoreAction ? (
              <>
                <button
                  className="button button--dark"
                  disabled={!canRestoreCloudData}
                  onClick={() => void restoreCloudData()}
                  type="button"
                >
                  {restore.status === "restoring" ? "Restoring..." : "Restore to this device"}
                </button>
                <button
                  className="button button--ghost"
                  onClick={dismissCloudRestore}
                  type="button"
                >
                  Not now
                </button>
              </>
            ) : shouldShowSaveAction ? (
              <button
                className="button button--dark"
                disabled={!canSaveDeviceData}
                onClick={() => void saveDeviceDataToAccount()}
                type="button"
              >
                {migration.status === "saving" ? "Saving..." : "Save to account"}
              </button>
            ) : (
              <button
                className="button button--dark"
                disabled={!isAvailable || status.state === "syncing"}
                onClick={() => void syncNow()}
                type="button"
              >
                {syncActionLabel}
              </button>
            )}
          </div>
        </aside>
        <button className="button button--ghost" onClick={() => void signOut()} type="button">Sign out of DeepFlow</button>
      </div>
    </section>
  );
}

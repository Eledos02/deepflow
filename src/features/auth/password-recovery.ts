"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { siteConfig } from "../../lib/site";

export const PASSWORD_RECOVERY_MIN_LENGTH = 8;
export const PASSWORD_RESET_SENT_MESSAGE =
  "If an account exists for this email, we sent a password reset link.";
export const PASSWORD_RESET_SEND_ERROR =
  "Could not send the reset link right now. Please try again.";
export const PASSWORD_RESET_EXPIRED_MESSAGE =
  "This password reset link has expired. Please request a new one.";
export const PASSWORD_UPDATE_SUCCESS_MESSAGE = "Your password has been updated.";
export const PASSWORD_UPDATE_ERROR =
  "Could not update your password right now. Please try again.";

type RecoveryResult = { ok: true } | { ok: false; error: string };

export function getPasswordResetRedirectTo(location?: Pick<Location, "origin" | "hostname">) {
  if (location && isLocalhost(location.hostname)) {
    return `${location.origin}/reset-password`;
  }

  return `${siteConfig.url}/reset-password`;
}

export function validatePasswordResetEmail(email: string): RecoveryResult {
  if (!email.trim()) {
    return { ok: false, error: "Enter the email address for your DeepFlow account." };
  }

  return { ok: true };
}

export function validateNewPassword(password: string, confirmation: string): RecoveryResult {
  if (!password) {
    return { ok: false, error: "Enter a new password." };
  }

  if (password.length < PASSWORD_RECOVERY_MIN_LENGTH) {
    return {
      ok: false,
      error: `Use at least ${PASSWORD_RECOVERY_MIN_LENGTH} characters for your new password.`,
    };
  }

  if (password !== confirmation) {
    return { ok: false, error: "Passwords do not match." };
  }

  return { ok: true };
}

export async function sendPasswordResetLink({
  email,
  redirectTo,
  supabase = getSupabaseBrowserClient(),
}: {
  email: string;
  redirectTo: string;
  supabase?: SupabaseClient | null;
}): Promise<RecoveryResult> {
  const validation = validatePasswordResetEmail(email);
  if (!validation.ok) return validation;

  if (!supabase) {
    return { ok: false, error: PASSWORD_RESET_SEND_ERROR };
  }

  // Supabase Auth redirect allow-list must include:
  // https://deepflownow.com/reset-password and the localhost reset URL used in development.
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });

  if (error) return { ok: false, error: PASSWORD_RESET_SEND_ERROR };
  return { ok: true };
}

export async function updateRecoveredPassword({
  password,
  confirmation,
  supabase = getSupabaseBrowserClient(),
}: {
  password: string;
  confirmation: string;
  supabase?: SupabaseClient | null;
}): Promise<RecoveryResult> {
  const validation = validateNewPassword(password, confirmation);
  if (!validation.ok) return validation;

  if (!supabase) {
    return { ok: false, error: PASSWORD_UPDATE_ERROR };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { ok: false, error: PASSWORD_UPDATE_ERROR };
  return { ok: true };
}

function isLocalhost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

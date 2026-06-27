import { describe, expect, it, vi } from "vitest";

import {
  PASSWORD_RESET_SEND_ERROR,
  PASSWORD_RESET_SENT_MESSAGE,
  PASSWORD_UPDATE_ERROR,
  PASSWORD_UPDATE_SUCCESS_MESSAGE,
  getPasswordResetRedirectTo,
  sendPasswordResetLink,
  updateRecoveredPassword,
  validateNewPassword,
  validatePasswordResetEmail,
} from "./password-recovery";

function createSupabaseAuthMock({
  resetError = null,
  updateError = null,
}: {
  resetError?: Error | null;
  updateError?: Error | null;
} = {}) {
  return {
    auth: {
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: resetError }),
      updateUser: vi.fn().mockResolvedValue({ error: updateError }),
    },
  };
}

describe("password recovery helpers", () => {
  it("uses production reset redirects by default and localhost redirects in development", () => {
    expect(getPasswordResetRedirectTo()).toBe("https://deepflownow.com/reset-password");
    expect(
      getPasswordResetRedirectTo({
        hostname: "localhost",
        origin: "http://localhost:3000",
      } as Location),
    ).toBe("http://localhost:3000/reset-password");
  });

  it("keeps the reset request response neutral so account existence is not revealed", async () => {
    const supabase = createSupabaseAuthMock();

    const result = await sendPasswordResetLink({
      email: "member@example.com",
      redirectTo: "https://deepflownow.com/reset-password",
      supabase: supabase as never,
    });

    expect(result).toEqual({ ok: true });
    expect(PASSWORD_RESET_SENT_MESSAGE).toBe(
      "If an account exists for this email, we sent a password reset link.",
    );
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "member@example.com",
      { redirectTo: "https://deepflownow.com/reset-password" },
    );
  });

  it("handles empty email without calling Supabase", async () => {
    const supabase = createSupabaseAuthMock();

    expect(validatePasswordResetEmail("   ")).toMatchObject({ ok: false });
    const result = await sendPasswordResetLink({
      email: "   ",
      redirectTo: "https://deepflownow.com/reset-password",
      supabase: supabase as never,
    });

    expect(result).toMatchObject({ ok: false });
    expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("uses a calm generic message if Supabase cannot send the reset link", async () => {
    const supabase = createSupabaseAuthMock({ resetError: new Error("raw provider error") });

    await expect(
      sendPasswordResetLink({
        email: "member@example.com",
        redirectTo: "https://deepflownow.com/reset-password",
        supabase: supabase as never,
      }),
    ).resolves.toEqual({ ok: false, error: PASSWORD_RESET_SEND_ERROR });
  });

  it("validates new passwords before update", () => {
    expect(validateNewPassword("", "")).toMatchObject({ ok: false });
    expect(validateNewPassword("short", "short")).toMatchObject({ ok: false });
    expect(validateNewPassword("long-enough", "different")).toEqual({
      ok: false,
      error: "Passwords do not match.",
    });
    expect(validateNewPassword("long-enough", "long-enough")).toEqual({ ok: true });
  });

  it("updates a recovered password through Supabase Auth only", async () => {
    const supabase = createSupabaseAuthMock();

    const result = await updateRecoveredPassword({
      password: "new-secure-password",
      confirmation: "new-secure-password",
      supabase: supabase as never,
    });

    expect(result).toEqual({ ok: true });
    expect(PASSWORD_UPDATE_SUCCESS_MESSAGE).toBe("Your password has been updated.");
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      password: "new-secure-password",
    });
  });

  it("uses a calm generic message if Supabase cannot update the password", async () => {
    const supabase = createSupabaseAuthMock({ updateError: new Error("raw update error") });

    await expect(
      updateRecoveredPassword({
        password: "new-secure-password",
        confirmation: "new-secure-password",
        supabase: supabase as never,
      }),
    ).resolves.toEqual({ ok: false, error: PASSWORD_UPDATE_ERROR });
  });
});

"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getSupabaseBrowserClient,
  getSupabaseBrowserConfig,
} from "@/lib/supabase/browser";

import {
  parseProfile,
  validateDisplayName,
  type Profile,
} from "./profile";

type AuthResult =
  | { ok: true; requiresEmailConfirmation?: boolean }
  | { ok: false; error: string };

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const PROFILE_SELECT_COLUMNS =
  "id,email,display_name,avatar_color,onboarding_completed,created_at,updated_at";

function logAuthDiagnostic(operation: string, payload: unknown) {
  // Temporary V7 diagnostics. Never log Supabase sessions because they contain tokens.
  console.info(`[DeepFlow auth diagnostic] ${operation}`, payload);
}

function safeSessionSummary(user: User | null | undefined) {
  return user
    ? { hasSession: true, userId: user.id, email: user.email ?? null }
    : { hasSession: false };
}

function authError(message: string | undefined) {
  return message?.trim().slice(0, 240) || "Something went wrong. Please try again.";
}

async function readProfile(userId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    logAuthDiagnostic("readProfile skipped", {
      reason: "Supabase browser client is unavailable",
      userId,
    });
    return null;
  }

  const response = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  logAuthDiagnostic("readProfile response", {
    request: {
      table: "public.profiles",
      operation: "select",
      columns: PROFILE_SELECT_COLUMNS,
      filter: { id: `eq.${userId}` },
      mode: "maybeSingle",
    },
    response,
  });

  return parseProfile(response.data);
}

async function createProfileIfMissing(user: User) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    logAuthDiagnostic("createProfile skipped", {
      reason: "Supabase browser client is unavailable",
      userId: user.id,
    });
    return null;
  }

  const existingProfile = await readProfile(user.id);
  if (existingProfile) return existingProfile;

  const response = await supabase.from("profiles").insert({
    id: user.id,
    email: user.email ?? null,
  });

  logAuthDiagnostic("createProfile response", {
    request: {
      table: "public.profiles",
      operation: "insert",
      values: { id: user.id, email: user.email ?? null },
    },
    response,
  });

  if (response.error && response.error.code !== "23505") return null;
  return readProfile(user.id);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const isConfigured = Boolean(getSupabaseBrowserConfig());
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(isConfigured);

  const syncUser = useCallback(async (nextUser: User | null) => {
    setUser(nextUser);

    if (!nextUser) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    const nextProfile = await createProfileIfMissing(nextUser);
    setProfile(nextProfile);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    logAuthDiagnostic("authProvider initialization", {
      isConfigured,
      hasBrowserClient: Boolean(supabase),
    });
    if (!supabase) {
      return;
    }

    void supabase.auth.getSession().then((response) => {
      logAuthDiagnostic("authProvider getSession response", {
        response: {
          data: safeSessionSummary(response.data.session?.user),
          error: response.error,
        },
      });
      return syncUser(response.data.session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      logAuthDiagnostic("authProvider auth-state change", {
        event,
        session: safeSessionSummary(session?.user),
      });
      void syncUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, [isConfigured, syncUser]);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { ok: false, error: "Account setup is not available yet. Please try again later." };
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { ok: false, error: authError(error.message) };

    if (data.user && data.session) {
      await syncUser(data.user);
    }

    return { ok: true, requiresEmailConfirmation: !data.session };
  }, [syncUser]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { ok: false, error: "Account setup is not available yet. Please try again later." };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: authError(error.message) };

    await syncUser(data.user);
    return { ok: true };
  }, [syncUser]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsLoading(false);
  }, []);

  const updateDisplayName = useCallback(async (displayName: string): Promise<AuthResult> => {
    if (!user) return { ok: false, error: "Sign in to update your profile." };
    const validation = validateDisplayName(displayName);
    if (!validation.valid) return { ok: false, error: validation.error };

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { ok: false, error: "Account setup is not available yet. Please try again later." };
    }

    const response = await supabase
      .from("profiles")
      .update({
        display_name: validation.value,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    logAuthDiagnostic("updateProfile response", {
      request: {
        table: "public.profiles",
        operation: "update",
        values: {
          display_name: validation.value,
          onboarding_completed: true,
        },
        filter: { id: `eq.${user.id}` },
      },
      response,
    });

    if (response.error) return { ok: false, error: authError(response.error.message) };

    setProfile(await readProfile(user.id));
    return { ok: true };
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    profile,
    isLoading,
    isConfigured,
    signUp,
    signIn,
    signOut,
    updateDisplayName,
  }), [isConfigured, isLoading, profile, signIn, signOut, signUp, updateDisplayName, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}

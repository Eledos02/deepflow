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

function authError(message: string | undefined) {
  return message?.trim().slice(0, 240) || "Something went wrong. Please try again.";
}

async function readProfile(userId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id,email,display_name,avatar_color,onboarding_completed,created_at,updated_at")
    .eq("id", userId)
    .maybeSingle();

  return parseProfile(data);
}

async function createProfileIfMissing(user: User) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const existingProfile = await readProfile(user.id);
  if (existingProfile) return existingProfile;

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    email: user.email ?? null,
  });

  if (error && error.code !== "23505") return null;
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
    if (!supabase) {
      return;
    }

    void supabase.auth.getSession().then(({ data }) => syncUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, [syncUser]);

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

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: validation.value,
        onboarding_completed: true,
      })
      .eq("id", user.id);
    if (error) return { ok: false, error: authError(error.message) };

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

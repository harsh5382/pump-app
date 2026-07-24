"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { UserProfile, UserRole } from "@/types";

// Normalized client identity. We expose `uid` (not Supabase's `id`) so the rest
// of the app keeps using the same shape it did under Firebase.
export interface AuthUser {
  uid: string;
  email: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  /** Set when the profile could not be loaded — authorization must fail closed. */
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createUser: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>;
  refetchProfile: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  phone: string | null;
  accepted_terms_version: string | null;
  accepted_privacy_version: string | null;
  created_at: string;
  updated_at: string;
};

function mapProfile(row: ProfileRow): UserProfile {
  return {
    uid: row.id,
    email: row.email,
    displayName: row.display_name,
    phone: row.phone ?? undefined,
    acceptedTermsVersion: row.accepted_terms_version ?? undefined,
    acceptedPrivacyVersion: row.accepted_privacy_version ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  async function loadProfile(uid: string) {
    // FAIL CLOSED: never invent a profile (or a role) on the client. A missing
    // profile means "no access yet"; a read error must NOT grant any authority.
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      setProfile(data ? mapProfile(data as ProfileRow) : null);
      setAuthError(null);
    } catch (err) {
      setProfile(null);
      setAuthError(
        err instanceof Error ? err.message : "Could not load your account. Please retry.",
      );
    }
  }

  useEffect(() => {
    let active = true;

    // Prime from the current session, then subscribe to changes. Supabase
    // persists the session in cookies/localStorage across browser sessions.
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      const u = data.user;
      if (u) {
        setUser({ uid: u.id, email: u.email ?? null });
        await loadProfile(u.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      const u = session?.user ?? null;
      if (u) {
        setUser({ uid: u.id, email: u.email ?? null });
        await loadProfile(u.id);
      } else {
        setUser(null);
        setProfile(null);
        setAuthError(null);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const createUser = async (
    email: string,
    password: string,
    displayName: string,
    _role: UserRole, // legacy global role is no longer stored; authority is per-org
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
    // The profiles row is created by the on_auth_user_created DB trigger.
  };

  const refetchProfile = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) await loadProfile(data.user.id);
  };

  const hasRole = (...roles: UserRole[]) => {
    return profile?.role ? roles.includes(profile.role) : false;
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, authError, signIn, signOut, createUser, refetchProfile, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

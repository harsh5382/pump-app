"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserProfile, UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createUser: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>;
  refetchProfile: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const fallbackProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? "",
          displayName: firebaseUser.displayName ?? firebaseUser.email?.split("@")[0] ?? "User",
          role: "staff",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          const profileRef = doc(db, "users", firebaseUser.uid);
          const snap = await getDoc(profileRef);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            await setDoc(profileRef, fallbackProfile);
            setProfile(fallbackProfile);
          }
        } catch {
          // Firestore read/write failed (e.g. rules, network) – use in-memory profile so login still works
          setProfile(fallbackProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const createUser = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole
  ) => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
    const now = new Date().toISOString();
    const userProfile: UserProfile = {
      uid: newUser.uid,
      email: newUser.email!,
      displayName,
      role,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, "users", newUser.uid), userProfile);
  };

  const refetchProfile = async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      try {
        const profileRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(profileRef);
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      } catch {
        setProfile(null);
      }
    }
  };

  const hasRole = (...roles: UserRole[]) => {
    return profile ? roles.includes(profile.role) : false;
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signOut, createUser, refetchProfile, hasRole }}
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

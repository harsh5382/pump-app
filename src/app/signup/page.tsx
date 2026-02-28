"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDocs, collection } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import type { UserProfile, UserRole } from "@/types";
import { Fuel } from "lucide-react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refetchProfile } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
      const now = new Date().toISOString();
      const usersSnap = await getDocs(collection(db, "users"));
      const isFirstUser = usersSnap.empty;
      const role: UserRole = isFirstUser ? "admin" : "staff";
      const userProfile: UserProfile = {
        uid: newUser.uid,
        email: newUser.email!,
        displayName: displayName.trim() || newUser.email!.split("@")[0],
        role,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, "users", newUser.uid), userProfile);
      await refetchProfile();
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign up failed";
      if (message.includes("configuration-not-found")) {
        setError(
          "Firebase Auth is not configured. In Firebase Console: enable Authentication, turn on Email/Password sign-in, and add 'localhost' to Authorized domains."
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 p-4 sm:p-6">
      <div className="absolute inset-0 opacity-[0.05] bg-grid-pattern-auth" aria-hidden />
      <div className="card w-full max-w-md relative z-10 shadow-soft border-white/10 bg-white/95 backdrop-blur-sm dark:bg-slate-800/95 dark:border-sky-500/20 animate-slide-up">
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/50">
            <Fuel className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          </div>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-6">
          Create account
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signup-display-name" className="label">
              Display name
            </label>
            <input
              id="signup-display-name"
              type="text"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              aria-label="Display name"
            />
          </div>
          <div>
            <label htmlFor="signup-email" className="label">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Email"
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="label">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              aria-label="Password"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary w-full min-h-[48px]"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-500">
          <Link href="/" className="text-sky-500 hover:underline dark:text-sky-400">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}

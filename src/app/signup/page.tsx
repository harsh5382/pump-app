"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDocs, collection } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import type { UserProfile, UserRole } from "@/types";

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
      const { user: newUser } = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
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
          "Firebase Auth is not configured. In Firebase Console: enable Authentication, turn on Email/Password sign-in, and add 'localhost' to Authorized domains.",
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="hidden lg:flex flex-col justify-between p-12 bg-ink-900 text-[#faf8f5] relative overflow-hidden">
        <Link href="/" className="flex items-center gap-2.5 serif text-[22px]">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-[7px] bg-accent text-white text-[17px] serif">
            P
          </span>
          Pumpline
        </Link>
        <div>
          <h2 className="serif text-[clamp(34px,4vw,52px)] leading-[1.05] mb-5">
            Set up your
            <br />
            forecourt
            <br />
            <em className="text-ink-400" style={{ fontStyle: "italic" }}>
              in minutes.
            </em>
          </h2>
          <p className="text-[#94a3b8] text-sm max-w-sm leading-relaxed">
            One outlet free, forever. Add tanks, nozzles and fuel types once, then
            close every day with the numbers that reconcile.
          </p>
        </div>
        <p className="text-xs text-[#64748b]">
          © 2026 Pumpline · Built for the Indian forecourt
        </p>
      </aside>

      {/* Form panel */}
      <section className="flex items-center justify-center p-6 sm:p-10 bg-bg">
        <div className="w-full max-w-[400px] animate-slide-up">
          <Link
            href="/"
            className="lg:hidden inline-flex items-center gap-2.5 serif text-[22px] mb-10"
          >
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-[7px] bg-accent text-white text-[17px] serif">
              P
            </span>
            Pumpline
          </Link>
          <h1 className="serif text-[32px] leading-tight mb-1">
            Create your account
          </h1>
          <p className="text-sm text-ink-500 mb-7">
            Free for one outlet · no card needed.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="field">
              <label htmlFor="signup-display-name" className="field-label">
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
            <div className="field">
              <label htmlFor="signup-email" className="field-label">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Email"
              />
            </div>
            <div className="field">
              <label htmlFor="signup-password" className="field-label">
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
              <p className="text-[13px] rounded-[7px] px-3 py-2.5 bg-[var(--danger-soft)] border border-[#fecaca] text-[#b91c1c]">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="my-6 divider" />
          <p className="text-center text-sm text-ink-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-ink-900 font-medium underline underline-offset-2"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

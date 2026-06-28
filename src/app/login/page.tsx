"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (user && profile) {
      router.replace("/dashboard");
    }
  }, [user, profile, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (message.includes("configuration-not-found")) {
        setError(
          "Firebase Auth not configured. In Firebase Console: enable Authentication, turn on Email/Password, and add 'localhost' to Authorized domains.",
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
            Every litre,
            <br />
            every shift,
            <br />
            <em className="text-ink-400 not-italic" style={{ fontStyle: "italic" }}>
              accounted for.
            </em>
          </h2>
          <p className="text-[#94a3b8] text-sm max-w-sm leading-relaxed">
            Sign in to close the day cleanly — meter readings, payments, stock and
            shifts, all reconciled in one ledger.
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
          <h1 className="serif text-[32px] leading-tight mb-1">Welcome back</h1>
          <p className="text-sm text-ink-500 mb-7">
            Sign in to your pump dashboard.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="field">
              <label htmlFor="login-email" className="field-label">
                Email
              </label>
              <input
                id="login-email"
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
              <label htmlFor="login-password" className="field-label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
              {loading ? (
                <>
                  <span
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"
                    aria-hidden
                  />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="my-6 divider" />
          <p className="text-center text-sm text-ink-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-ink-900 font-medium underline underline-offset-2"
            >
              Sign up free
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

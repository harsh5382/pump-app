"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Fuel } from "lucide-react";

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
          "Firebase Auth not configured. In Firebase Console: enable Authentication, turn on Email/Password, and add 'localhost' to Authorized domains."
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
          Sign In
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="label">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Email"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="label">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-semibold hover:underline"
          >
            Sign up
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

import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 text-white p-4 sm:p-6">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.06] bg-grid-pattern-hero"
        aria-hidden
      />
      <div className="text-center max-w-lg w-full relative z-10 animate-fade-in">
        <div className="inline-flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-6 overflow-hidden">
          <Image
            src="/icons/logo.png"
            alt="Petrol Pump"
            width={112}
            height={112}
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Petrol Pump Management
        </h1>
        <p className="text-slate-400 dark:text-slate-300 mb-8 text-sm sm:text-base max-w-md mx-auto">
          Fuel sales, stock, meter readings & reporting — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-6 py-3.5 font-semibold text-white hover:bg-sky-400 transition-all shadow-lg shadow-sky-500/25 min-h-[48px]"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl border-2 border-slate-500 px-6 py-3.5 font-semibold text-white hover:bg-white/10 hover:border-slate-400 transition-all min-h-[48px]"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}

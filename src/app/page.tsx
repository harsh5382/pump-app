import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-white p-4">
      <div className="text-center max-w-lg">
        <h1 className="text-4xl font-bold mb-2">Petrol Pump Management</h1>
        <p className="text-slate-300 mb-8">Fuel sales, stock, meter readings & reporting</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg bg-sky-600 px-6 py-3 font-medium text-white hover:bg-sky-500 transition"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center rounded-lg border border-slate-400 px-6 py-3 font-medium text-white hover:bg-slate-700 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}

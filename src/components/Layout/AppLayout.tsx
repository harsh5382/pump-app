"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Fuel,
  Container,
  Droplets,
  Gauge,
  Truck,
  Receipt,
  CreditCard,
  Wallet,
  Users,
  FileText,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/tanks", label: "Tanks", icon: Container },
  { href: "/dashboard/nozzles", label: "Nozzles", icon: Gauge },
  { href: "/dashboard/meter-readings", label: "Meter Readings", icon: Fuel },
  { href: "/dashboard/tanker-deliveries", label: "Tanker Deliveries", icon: Truck },
  { href: "/dashboard/sales", label: "Sales", icon: Receipt },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/expenses", label: "Expenses", icon: Wallet },
  { href: "/dashboard/shifts", label: "Shifts", icon: Users },
  { href: "/dashboard/stock", label: "Stock", icon: Droplets },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/notifications", label: "Alerts", icon: Bell },
];

const adminNav = [
  { href: "/dashboard/fuel-types", label: "Fuel Types", icon: Fuel },
  { href: "/dashboard/users", label: "Users", icon: Users },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut, hasRole } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col fixed h-full">
        <div className="p-4 border-b">
          <Link href="/dashboard" className="font-bold text-slate-800">
            Petrol Pump
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                pathname === item.href
                  ? "bg-sky-50 text-sky-700 font-medium"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
          {hasRole("admin") && (
            <>
              <div className="my-2 border-t border-slate-200 pt-2">
                <p className="px-3 text-xs font-semibold text-slate-400 uppercase">Admin</p>
              </div>
              {adminNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                    pathname === item.href
                      ? "bg-sky-50 text-sky-700 font-medium"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>
      </aside>
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-slate-800 capitalize">
            {profile?.role ?? "User"}
          </h1>
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-100"
            >
              <span className="text-sm font-medium">{profile?.displayName ?? profile?.email}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                  aria-hidden
                />
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-white py-1 shadow-lg z-20">
                  <Link
                    href="/dashboard/notifications"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Bell className="h-4 w-4" />
                    Alerts
                  </Link>
                  {hasRole("admin") && (
                    <Link
                      href="/dashboard/users"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Users
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleSignOut();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

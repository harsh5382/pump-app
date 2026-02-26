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
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const closeSidebar = () => setSidebarOpen(false);

  const navLinks = (
    <>
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={closeSidebar}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
            pathname === item.href
              ? "bg-sky-50 text-sky-700 shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
          )}
        >
          <item.icon
            className={cn("h-4 w-4 shrink-0", pathname === item.href ? "text-sky-600" : "text-slate-500")}
          />
          {item.label}
        </Link>
      ))}
      {hasRole("admin") && (
        <>
          <div className="my-3 border-t border-slate-200 pt-3">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Admin
            </p>
          </div>
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeSidebar}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                pathname === item.href
                  ? "bg-sky-50 text-sky-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              )}
            >
              <item.icon
                className={cn("h-4 w-4 shrink-0", pathname === item.href ? "text-sky-600" : "text-slate-500")}
              />
              {item.label}
            </Link>
          ))}
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex bg-[var(--surface)]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "w-64 border-r border-slate-200/80 bg-white flex flex-col fixed h-full z-40 transition-transform duration-200 ease-out shadow-card",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
          <Link
            href="/dashboard"
            onClick={closeSidebar}
            className="flex items-center gap-2 font-bold text-slate-800 text-lg"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-100 text-sky-600">
              <Fuel className="h-4 w-4" />
            </span>
            Petrol Pump
          </Link>
          <button
            type="button"
            onClick={closeSidebar}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">{navLinks}</nav>
      </aside>
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64 min-w-0">
        <header className="h-14 border-b border-slate-200/80 bg-white flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-card">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6 text-slate-700" />
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-slate-800 capitalize truncate ml-2 lg:ml-0">
            {profile?.role ?? "User"}
          </h1>
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1 sm:gap-2 rounded-xl px-2 sm:px-3 py-2 hover:bg-slate-50 transition-colors min-w-0 border border-transparent hover:border-slate-200"
            >
              <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-none text-slate-700">
                {profile?.displayName ?? profile?.email}
              </span>
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", userMenuOpen && "rotate-180")}
              />
            </button>
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                  aria-hidden
                />
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-soft z-20 animate-fade-in">
                  <Link
                    href="/dashboard/notifications"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg mx-1"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Bell className="h-4 w-4 text-slate-500" />
                    Alerts
                  </Link>
                  {hasRole("admin") && (
                    <Link
                      href="/dashboard/users"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg mx-1"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4 text-slate-500" />
                      Users
                    </Link>
                  )}
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleSignOut();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg mx-1"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

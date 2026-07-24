"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import type { Capability } from "@/lib/capabilities";
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
  UserPlus,
  FileText,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect } from "react";

type NavItem = { href: string; label: string; icon: LucideIcon };

const nav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
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

type AdminNavItem = NavItem & { capability: Capability };

const adminNav: AdminNavItem[] = [
  { href: "/dashboard/team", label: "Team", icon: UserPlus, capability: "org.manage_members" },
  { href: "/dashboard/fuel-types", label: "Fuel Types", icon: Fuel, capability: "outlet.manage_assets" },
  { href: "/dashboard/users", label: "Users", icon: Users, capability: "org.manage_members" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, capability: "outlet.manage_settings" },
];

// Topbar title + subtitle per route
const TITLES: Record<string, [string, string]> = {
  "/dashboard": ["Overview", "Today's pump at a glance"],
  "/dashboard/tanks": ["Tanks", "Storage tanks & daily dips"],
  "/dashboard/nozzles": ["Nozzles", "Dispensing machines"],
  "/dashboard/meter-readings": ["Meter Readings", "Daily fuel sales by nozzle"],
  "/dashboard/tanker-deliveries": ["Tanker Deliveries", "Incoming stock"],
  "/dashboard/sales": ["Sales", "Daily sales summary"],
  "/dashboard/payments": ["Payments", "Collections & reconciliation"],
  "/dashboard/expenses": ["Expenses", "Outlet costs"],
  "/dashboard/shifts": ["Shifts", "Staff shifts & cash"],
  "/dashboard/stock": ["Stock", "System vs dip reconciliation"],
  "/dashboard/reports": ["Reports", "Exports & analytics"],
  "/dashboard/notifications": ["Alerts", "Stock, meter & payment alerts"],
  "/dashboard/fuel-types": ["Fuel Types", "Petrol, diesel & more"],
  "/dashboard/users": ["Users", "Team & roles"],
  "/dashboard/team": ["Team", "Invite managers & staff"],
  "/dashboard/settings": ["Settings", "Outlet preferences"],
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { currentOrg, hasCapability, currentOutletId } = useOrg();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Admin section items the current user is allowed to see (capability-based).
  const visibleAdminNav = adminNav.filter((item) =>
    hasCapability(item.capability),
  );

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (sidebarOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [sidebarOpen]);

  const closeSidebar = () => setSidebarOpen(false);

  const isActive = (href: string) => {
    const path = pathname.replace(/\/$/, "") || "/";
    const base = href.replace(/\/$/, "") || "/";
    if (base === "/dashboard") return path === "/dashboard";
    return path === base || path.startsWith(base + "/");
  };

  const cleanPath = pathname.replace(/\/$/, "") || "/dashboard";
  const [title, sub] = TITLES[cleanPath] ?? ["Dashboard", ""];

  const renderItem = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={closeSidebar}
        className={cn(
          "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-accent text-white"
            : "text-ink-700 hover:bg-[var(--bg-overlay)] hover:text-ink-900",
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {item.label}
      </Link>
    );
  };

  const sidebarInner = (
    <>
      <div className="flex items-center gap-2.5 px-3 pb-5 mb-3 border-b border-line">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-white serif text-xl">
          P
        </span>
        <div className="min-w-0">
          <div className="serif text-xl leading-none">Pumpline</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-ink-500 mt-0.5 truncate">
            {currentOrg?.organisationName ?? "Fuel Ledger"}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
        {nav.map(renderItem)}
        {visibleAdminNav.length > 0 && (
          <>
            <div className="px-3 pt-5 pb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-500">
              Admin
            </div>
            {visibleAdminNav.map(renderItem)}
          </>
        )}
      </nav>

      <div className="mt-auto pt-4 border-t border-line">
        <div className="flex items-center gap-2.5 px-1">
          <Avatar name={profile?.displayName ?? profile?.email ?? "User"} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate">
              {profile?.displayName ?? profile?.email}
            </div>
            <div className="text-[11px] text-ink-500 capitalize">
              {currentOrg?.organisationRole?.replace(/_/g, " ") ??
                profile?.role ??
                "member"}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="icon-btn w-8 h-8"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-bg">
      {/* Mobile scrim */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 w-60 z-50 flex flex-col bg-bg border-r border-line px-4 py-6 transition-transform duration-200 ease-out",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <button
          type="button"
          onClick={closeSidebar}
          className="lg:hidden absolute top-4 right-4 icon-btn w-8 h-8"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
        {sidebarInner}
      </aside>

      {/* Main */}
      <div className="lg:pl-60 min-w-0 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-16 flex items-center gap-4 px-5 sm:px-8 bg-bg/90 backdrop-blur-md border-b border-line">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden icon-btn w-9 h-9"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="serif text-[22px] leading-none truncate">{title}</div>
            {sub && (
              <div className="text-xs text-ink-500 mt-1 truncate">{sub}</div>
            )}
          </div>
          <Link
            href="/dashboard/notifications"
            className="icon-btn w-9 h-9"
            aria-label="Alerts"
            title="Alerts"
          >
            <Bell className="h-4 w-4" />
          </Link>
        </header>

        {/* key on the active outlet so switching outlets remounts the page,
            re-fetching all data for the newly-selected outlet. */}
        <main key={currentOutletId} className="flex-1 px-5 sm:px-8 py-6 sm:py-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

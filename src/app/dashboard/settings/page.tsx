"use client";

import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  if (!isAdmin) {
    return (
      <div className="page space-y-6">
        <div className="card">
          <p className="text-ink-500">Only admin can access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page space-y-6">
      <div className="card">
        <div className="card-title mb-2">Outlet preferences</div>
        <p className="text-ink-500 text-sm">
          Settings and preferences will appear here.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useAuth } from "@/context/AuthContext";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="page-title">Settings</h1>
        <div className="card">
          <p className="text-slate-600 dark:text-slate-400">Only admin can access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title flex items-center gap-2">
        <Settings className="h-7 w-7 text-slate-600 dark:text-slate-400" />
        Settings
      </h1>
      <div className="card">
        <p className="text-slate-600 dark:text-slate-400">Settings and preferences.</p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getNotifications, markNotificationRead } from "@/lib/db";
import type { Notification } from "@/types";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, Info } from "lucide-react";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotifications(user?.uid).then(setNotifications).finally(() => setLoading(false));
  }, [user?.uid]);

  async function markRead(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Alerts & Notifications</h1>
      <div className="card">
        <p className="text-sm text-slate-600 mb-4">
          Low stock, meter not entered today, and payment mismatch alerts appear here.
        </p>
        {notifications.length === 0 ? (
          <p className="text-slate-500">No notifications.</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  n.read ? "bg-slate-50 border-slate-100" : "bg-amber-50/50 border-amber-200"
                }`}
              >
                {n.type === "payment_mismatch" || n.type === "low_stock" || n.type === "meter_not_entered" ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <Info className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatDate(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <button
                    type="button"
                    className="btn btn-secondary text-sm shrink-0"
                    onClick={() => markRead(n.id)}
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

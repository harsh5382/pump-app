"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUsers } from "@/lib/db";
import type { UserProfile, UserRole } from "@/types";
import { logAudit } from "@/lib/audit";

export default function UsersPage() {
  const { profile, hasRole, createUser: authCreateUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = hasRole("admin");

  useEffect(() => {
    if (isAdmin) getUsers().then(setUsers).finally(() => setLoading(false));
  }, [isAdmin]);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || !displayName || !isAdmin || !profile) return;
    setError("");
    setSaving(true);
    try {
      await authCreateUser(email, password, displayName, role);
      await logAudit(profile.uid, profile.email, "CREATE", "user", `User: ${email}`);
      setEmail("");
      setPassword("");
      setDisplayName("");
      setUsers(await getUsers());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="card">
        <p className="text-slate-600">Only admin can manage users.</p>
      </div>
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
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Add user</h2>
        <form onSubmit={handleAddUser} className="space-y-4 max-w-md">
          <div>
            <label htmlFor="user-email" className="label">Email</label>
            <input
              id="user-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="User email"
            />
          </div>
          <div>
            <label htmlFor="user-password" className="label">Password</label>
            <input
              id="user-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              aria-label="User password"
            />
          </div>
          <div>
            <label htmlFor="user-display-name" className="label">Display name</label>
            <input
              id="user-display-name"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              aria-label="Display name"
            />
          </div>
          <div>
            <label htmlFor="user-role" className="label">Role</label>
            <select id="user-role" className="input" value={role} onChange={(e) => setRole(e.target.value as UserRole)} aria-label="User role">
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Creating…" : "Add user"}
          </button>
        </form>
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">All users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid} className="border-b border-slate-100">
                  <td className="py-2">{u.displayName}</td>
                  <td className="py-2">{u.email}</td>
                  <td className="py-2 capitalize">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

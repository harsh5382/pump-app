"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUsers, updateUserProfile } from "@/lib/db";
import type { UserProfile, UserRole } from "@/types";
import { logAudit } from "@/lib/audit";
import { Pencil, Check, X } from "lucide-react";

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
  const [successMessage, setSuccessMessage] = useState("");
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("staff");

  const isAdmin = hasRole("admin");

  function startEdit(u: UserProfile) {
    setEditing(u);
    setEditDisplayName(u.displayName);
    setEditRole(u.role);
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await updateUserProfile(editing.uid, { displayName: editDisplayName.trim(), role: editRole });
      if (profile) await logAudit(profile.uid, profile.email, "UPDATE", "user", `User: ${editing.email}`);
      setEditing(null);
      setUsers(await getUsers());
      setSuccessMessage("User updated.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

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
      setSuccessMessage("User created successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
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
      <h1 className="page-title">Users</h1>
      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      )}
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
        <h2 className="text-lg font-semibold text-slate-800 mb-4">All users</h2>
        <div className="table-container">
          <table className="table-default">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th className="w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isEditingRow = editing?.uid === u.uid;
                return (
                  <tr key={u.uid}>
                    {isEditingRow ? (
                      <>
                        <td className="align-middle">
                          <form id={`user-edit-${u.uid}`} onSubmit={handleUpdateUser} className="min-w-0">
                            <input className="input py-1.5 text-sm w-full min-w-0" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} placeholder="Display name" required aria-label="Display name" />
                          </form>
                        </td>
                        <td className="align-middle text-slate-500">{u.email}</td>
                        <td className="align-middle">
                          <select form={`user-edit-${u.uid}`} className="input py-1.5 text-sm w-full min-w-0" value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)} aria-label="User role">
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="staff">Staff</option>
                          </select>
                        </td>
                        <td className="align-middle">
                          <button form={`user-edit-${u.uid}`} type="submit" className="p-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 inline-flex items-center justify-center mr-1" disabled={saving} aria-label="Save"><Check className="h-4 w-4" /></button>
                          <button type="button" className="p-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 inline-flex items-center justify-center" onClick={() => setEditing(null)} aria-label="Cancel"><X className="h-4 w-4" /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{u.displayName}</td>
                        <td>{u.email}</td>
                        <td className="capitalize">{u.role}</td>
                        <td>
                          <button type="button" onClick={() => startEdit(u)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-sky-600" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

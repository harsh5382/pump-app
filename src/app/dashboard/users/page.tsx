"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUsers, updateUserProfile, deleteUserProfile } from "@/lib/db";
import type { UserProfile, UserRole } from "@/types";
import { logAudit } from "@/lib/audit";
import FuelLoader from "@/components/FuelLoader";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { Pencil, Check, X, Trash2 } from "lucide-react";

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
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = hasRole("admin");
  const currentUid = profile?.uid;
  const isMobile = useMediaQuery("(max-width: 768px)");

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

  async function handleDeleteUser() {
    if (!deleteTarget || !profile || deleteTarget.uid === profile.uid) return;
    setDeleting(true);
    try {
      await deleteUserProfile(deleteTarget.uid);
      await logAudit(profile.uid, profile.email, "DELETE", "user", `User: ${deleteTarget.email}`);
      setUsers(await getUsers());
      setDeleteTarget(null);
      setSuccessMessage("User deleted.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeleting(false);
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
    return <FuelLoader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Users</h1>
      {successMessage && (
        <div className="banner-success">
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
        <h2 className="card-header">All users</h2>
        {isMobile ? (
          <ul className="space-y-3 list-none p-0 m-0">
            {users.map((u) => {
              const isEditingRow = editing?.uid === u.uid;
              return (
                <li key={u.uid}>
                  {isEditingRow ? (
                    <div className="edit-card">
                      <p className="edit-card-title">Editing: {u.displayName}</p>
                      <form id={`user-edit-${u.uid}`} onSubmit={handleUpdateUser} className="space-y-4">
                        <div>
                          <label htmlFor={`user-edit-name-${u.uid}`} className="label">Display name</label>
                          <input id={`user-edit-name-${u.uid}`} className="input" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} placeholder="Display name" required aria-label="Display name" />
                        </div>
                        <p className="text-sm text-slate-500">Email: {u.email}</p>
                        <div>
                          <label htmlFor={`user-edit-role-${u.uid}`} className="label">Role</label>
                          <select id={`user-edit-role-${u.uid}`} form={`user-edit-${u.uid}`} className="input" value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)} aria-label="User role">
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="staff">Staff</option>
                          </select>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button form={`user-edit-${u.uid}`} type="submit" className="btn btn-primary flex-1 min-h-[48px]" disabled={saving} aria-label="Save"><Check className="h-5 w-5 sm:mr-1.5" /><span className="hidden sm:inline">{saving ? "Saving…" : "Save"}</span></button>
                          <button type="button" className="btn btn-secondary flex-1 min-h-[48px]" onClick={() => setEditing(null)} aria-label="Cancel"><X className="h-5 w-5 sm:mr-1.5" /><span className="hidden sm:inline">Cancel</span></button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="mobile-list-card">
                      <p className="mobile-list-card-title">{u.displayName}</p>
                      <p className="mobile-list-card-row">Email: {u.email}</p>
                      <p className="mobile-list-card-row">Role: <span className="capitalize">{u.role}</span></p>
                      <div className="mobile-list-card-actions">
                        <button type="button" onClick={() => startEdit(u)} className="btn btn-secondary min-h-[44px] flex-1 flex items-center justify-center gap-1.5" aria-label="Edit"><Pencil className="h-4 w-4" /><span>Edit</span></button>
                        <button type="button" onClick={() => setDeleteTarget(u)} disabled={u.uid === currentUid} className="btn btn-danger min-h-[44px] flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Delete" title={u.uid === currentUid ? "Cannot delete yourself" : "Delete user"}><Trash2 className="h-4 w-4" /><span>Delete</span></button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
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
                          <div className="flex gap-2">
                            <button form={`user-edit-${u.uid}`} type="submit" className="btn-icon-primary" disabled={saving} aria-label="Save"><Check className="h-4 w-4" /></button>
                            <button type="button" className="btn-icon-cancel" onClick={() => setEditing(null)} aria-label="Cancel"><X className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{u.displayName}</td>
                        <td>{u.email}</td>
                        <td className="capitalize">{u.role}</td>
                        <td>
                          <div className="flex gap-1">
                            <button type="button" onClick={() => startEdit(u)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-sky-600 dark:hover:bg-slate-700 dark:text-slate-400" aria-label="Edit" title="Edit"><Pencil className="h-4 w-4" /></button>
                            <button type="button" onClick={() => setDeleteTarget(u)} disabled={u.uid === currentUid} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-red-900/20" aria-label="Delete" title={u.uid === currentUid ? "Cannot delete yourself" : "Delete user"}><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete user?"
        message={deleteTarget ? `Remove "${deleteTarget.displayName}" (${deleteTarget.email})? They can sign in again and will get a new staff account.` : ""}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

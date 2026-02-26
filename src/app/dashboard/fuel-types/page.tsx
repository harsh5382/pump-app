"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getFuelTypes, addFuelType, updateFuelType, deleteFuelType } from "@/lib/db";
import type { FuelType } from "@/types";
import { logAudit } from "@/lib/audit";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Pencil, Trash2, Check, X } from "lucide-react";

export default function FuelTypesPage() {
  const { profile, hasRole } = useAuth();
  const [list, setList] = useState<FuelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("L");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [editing, setEditing] = useState<FuelType | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("L");
  const [deleteTarget, setDeleteTarget] = useState<FuelType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = hasRole("admin");

  useEffect(() => {
    getFuelTypes().then(setList).finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await addFuelType(name.trim(), unit);
      if (profile) {
        await logAudit(profile.uid, profile.email, "CREATE", "fuelType", `Added fuel type: ${name}`);
      }
      setName("");
      setList(await getFuelTypes());
      setSuccessMessage("Fuel type added successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(f: FuelType) {
    setEditing(f);
    setEditName(f.name);
    setEditUnit(f.unit);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !editName.trim()) return;
    setSaving(true);
    try {
      await updateFuelType(editing.id, { name: editName.trim(), unit: editUnit || "L" });
      if (profile) {
        await logAudit(profile.uid, profile.email, "UPDATE", "fuelType", `Updated: ${editing.name} → ${editName}`);
      }
      setEditing(null);
      setList(await getFuelTypes());
      setSuccessMessage("Fuel type updated.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFuelType(deleteTarget.id);
      if (profile) {
        await logAudit(profile.uid, profile.email, "DELETE", "fuelType", `Deleted: ${deleteTarget.name}`);
      }
      setDeleteTarget(null);
      setList(await getFuelTypes());
      setSuccessMessage("Fuel type deleted.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Fuel Types</h1>
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      )}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Add fuel type</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[200px]">
            <label className="label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Petrol, Diesel"
              required
            />
          </div>
          <div className="w-24">
            <label className="label">Unit</label>
            <input
              className="input"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="L"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Adding…" : "Add"}
          </button>
        </form>
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Existing types</h2>
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-slate-500">No fuel types. Add Petrol and Diesel to get started.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((f) => (
              <li
                key={f.id}
                className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
              >
                {editing?.id === f.id ? (
                  <form onSubmit={handleUpdate} className="flex flex-wrap gap-3 items-end flex-1">
                    <div className="min-w-[140px]">
                      <input
                        className="input py-1.5 text-sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        aria-label="Fuel type name"
                        placeholder="Name"
                      />
                    </div>
                    <div className="w-20">
                      <input
                        className="input py-1.5 text-sm"
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value)}
                        aria-label="Unit"
                        placeholder="L"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="p-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 inline-flex items-center justify-center" disabled={saving} aria-label="Save">
                        <Check className="h-4 w-4" />
                      </button>
                      <button type="button" className="p-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 inline-flex items-center justify-center" onClick={() => setEditing(null)} aria-label="Cancel">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span className="font-medium">{f.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-slate-500">{f.unit}</span>
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(f)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-sky-600"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(f)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete fuel type"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : ""}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

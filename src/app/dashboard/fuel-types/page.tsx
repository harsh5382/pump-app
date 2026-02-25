"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getFuelTypes, addFuelType } from "@/lib/db";
import type { FuelType } from "@/types";
import { logAudit } from "@/lib/audit";

export default function FuelTypesPage() {
  const { profile, hasRole } = useAuth();
  const [list, setList] = useState<FuelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("L");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFuelTypes().then(setList).finally(() => setLoading(false));
  }, []);

  const isAdmin = hasRole("admin");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !isAdmin) return;
    setSaving(true);
    try {
      await addFuelType(name.trim(), unit);
      if (profile) {
        await logAudit(profile.uid, profile.email, "CREATE", "fuelType", `Added fuel type: ${name}`);
      }
      setName("");
      setList(await getFuelTypes());
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="card">
        <p className="text-slate-600">Only admin can manage fuel types.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Fuel Types</h1>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Add fuel type</h2>
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
        <h2 className="text-lg font-semibold mb-4">Existing types</h2>
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-slate-500">No fuel types. Add Petrol and Diesel to get started.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((f) => (
              <li key={f.id} className="flex justify-between py-2 border-b border-slate-100">
                <span className="font-medium">{f.name}</span>
                <span className="text-slate-500">{f.unit}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

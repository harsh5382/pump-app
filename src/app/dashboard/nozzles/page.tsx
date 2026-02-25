"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getNozzles, getTanks, getFuelTypes, addNozzle } from "@/lib/db";
import type { Nozzle, Tank, FuelType } from "@/types";
import { logAudit } from "@/lib/audit";

export default function NozzlesPage() {
  const { profile, hasRole } = useAuth();
  const [nozzles, setNozzles] = useState<Nozzle[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [machineNumber, setMachineNumber] = useState("");
  const [fuelTypeId, setFuelTypeId] = useState("");
  const [tankId, setTankId] = useState("");
  const [saving, setSaving] = useState(false);

  const isAdmin = hasRole("admin");

  useEffect(() => {
    Promise.all([getNozzles(), getTanks(), getFuelTypes()]).then(([n, t, f]) => {
      setNozzles(n);
      setTanks(t);
      setFuelTypes(f);
      if (f.length && !fuelTypeId) setFuelTypeId(f[0].id);
      if (t.length && !tankId) setTankId(t[0].id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const tanksForFuel = tanks.filter((t) => t.fuelTypeId === fuelTypeId);
    if (fuelTypeId && tanksForFuel.length && !tanksForFuel.some((t) => t.id === tankId)) {
      setTankId(tanksForFuel[0].id);
    }
  }, [fuelTypeId, tanks, tankId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!machineNumber.trim() || !fuelTypeId || !tankId || !isAdmin) return;
    setSaving(true);
    try {
      await addNozzle({
        machineNumber: machineNumber.trim(),
        fuelTypeId,
        tankId,
      });
      if (profile) {
        await logAudit(profile.uid, profile.email, "CREATE", "nozzle", `Machine ${machineNumber}`);
      }
      setMachineNumber("");
      setNozzles(await getNozzles());
      setShowForm(false);
    } finally {
      setSaving(false);
    }
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
      <h1 className="text-2xl font-bold">Dispensing Machines (Nozzles)</h1>

      {isAdmin && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Add machine / nozzle</h2>
          {!showForm ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
              Add nozzle
            </button>
          ) : (
            <form onSubmit={handleAdd} className="space-y-4 max-w-md">
              <div>
                <label className="label">Machine number</label>
                <input
                  className="input"
                  value={machineNumber}
                  onChange={(e) => setMachineNumber(e.target.value)}
                  placeholder="e.g. 1"
                  required
                />
              </div>
              <div>
                <label htmlFor="nozzle-fuel-type" className="label">Fuel type</label>
                <select
                  id="nozzle-fuel-type"
                  className="input"
                  value={fuelTypeId}
                  onChange={(e) => setFuelTypeId(e.target.value)}
                  required
                  aria-label="Fuel type"
                >
                  {fuelTypes.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="nozzle-tank" className="label">Tank connected</label>
                <select
                  id="nozzle-tank"
                  className="input"
                  value={tankId}
                  onChange={(e) => setTankId(e.target.value)}
                  required
                  aria-label="Tank connected"
                >
                  {tanks.filter((t) => t.fuelTypeId === fuelTypeId).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Nozzles</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Machine no.</th>
                <th className="pb-2 font-medium">Fuel type</th>
                <th className="pb-2 font-medium">Tank</th>
              </tr>
            </thead>
            <tbody>
              {nozzles.map((n) => {
                const ft = fuelTypes.find((f) => f.id === n.fuelTypeId);
                const tank = tanks.find((t) => t.id === n.tankId);
                return (
                  <tr key={n.id} className="border-b border-slate-100">
                    <td className="py-2">{n.machineNumber}</td>
                    <td className="py-2">{ft?.name ?? "-"}</td>
                    <td className="py-2">{tank?.name ?? "-"}</td>
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

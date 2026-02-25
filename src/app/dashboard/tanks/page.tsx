"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTanks, getFuelTypes, addTank, addDipEntry, getDipEntriesByDate } from "@/lib/db";
import type { Tank, FuelType, DipEntry } from "@/types";
import { formatNumber, formatDate } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

const today = new Date().toISOString().split("T")[0];

export default function TanksPage() {
  const { profile, hasRole } = useAuth();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [dips, setDips] = useState<DipEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [fuelTypeId, setFuelTypeId] = useState("");
  const [capacity, setCapacity] = useState("");
  const [saving, setSaving] = useState(false);
  const [dipDate, setDipDate] = useState(today);
  const [dipTankId, setDipTankId] = useState("");
  const [dipReading, setDipReading] = useState("");
  const [actualQty, setActualQty] = useState("");
  const [dipSaving, setDipSaving] = useState(false);

  const isAdmin = hasRole("admin");

  useEffect(() => {
    Promise.all([getTanks(), getFuelTypes(), getDipEntriesByDate(dipDate)]).then(
      ([t, f, d]) => {
        setTanks(t);
        setFuelTypes(f);
        setDips(d);
        if (f.length && !fuelTypeId) setFuelTypeId(f[0].id);
        if (t.length && !dipTankId) setDipTankId(t[0].id);
      }
    ).finally(() => setLoading(false));
  }, [dipDate]);

  useEffect(() => {
    getDipEntriesByDate(dipDate).then(setDips);
  }, [dipDate]);

  async function handleAddTank(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !fuelTypeId || !capacity || !isAdmin) return;
    setSaving(true);
    try {
      await addTank({
        name: name.trim(),
        fuelTypeId,
        capacityLiters: Number(capacity),
        currentStockLiters: 0,
      });
      if (profile) await logAudit(profile.uid, profile.email, "CREATE", "tank", `Tank: ${name}`);
      setName("");
      setCapacity("");
      setTanks(await getTanks());
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  const selectedTank = tanks.find((t) => t.id === dipTankId);
  const expectedFromDip = selectedTank?.currentStockLiters ?? 0;
  const lossOrGain = actualQty ? Number(actualQty) - expectedFromDip : 0;

  async function handleAddDip(e: React.FormEvent) {
    e.preventDefault();
    if (!dipTankId || !dipReading || !profile) return;
    setDipSaving(true);
    try {
      await addDipEntry({
        tankId: dipTankId,
        date: dipDate,
        dipReading: Number(dipReading),
        actualQuantity: Number(actualQty) || 0,
        expectedQuantity: expectedFromDip,
        lossOrGain,
        enteredBy: profile.email,
      });
      setDips(await getDipEntriesByDate(dipDate));
      setDipReading("");
      setActualQty("");
    } finally {
      setDipSaving(false);
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
      <h1 className="text-2xl font-bold">Tank Management</h1>

      {isAdmin && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Add tank</h2>
          {!showForm ? (
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
              Add tank
            </button>
          ) : (
            <form onSubmit={handleAddTank} className="space-y-4 max-w-md">
              <div>
                <label htmlFor="tank-name" className="label">Tank name</label>
                <input
                  id="tank-name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tank 1"
                  required
                  aria-label="Tank name"
                />
              </div>
              <div>
                <label htmlFor="tank-fuel-type" className="label">Fuel type</label>
                <select
                  id="tank-fuel-type"
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
                <label htmlFor="tank-capacity" className="label">Capacity (liters)</label>
                <input
                  id="tank-capacity"
                  type="number"
                  min="0"
                  step="1"
                  className="input"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  required
                  aria-label="Capacity in liters"
                />
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
        <h2 className="text-lg font-semibold mb-4">Tanks</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Fuel type</th>
                <th className="pb-2 font-medium">Capacity</th>
                <th className="pb-2 font-medium">Current stock</th>
              </tr>
            </thead>
            <tbody>
              {tanks.map((t) => {
                const ft = fuelTypes.find((f) => f.id === t.fuelTypeId);
                return (
                  <tr key={t.id} className="border-b border-slate-100">
                    <td className="py-2">{t.name}</td>
                    <td className="py-2">{ft?.name ?? "-"}</td>
                    <td className="py-2">{formatNumber(t.capacityLiters)} L</td>
                    <td className="py-2">{formatNumber(t.currentStockLiters)} L</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Daily dip entry</h2>
        <form onSubmit={handleAddDip} className="space-y-4 max-w-md">
          <div>
            <label htmlFor="dip-date" className="label">Date</label>
            <input
              id="dip-date"
              type="date"
              className="input"
              value={dipDate}
              onChange={(e) => setDipDate(e.target.value)}
              aria-label="Dip entry date"
            />
          </div>
          <div>
            <label htmlFor="dip-tank" className="label">Tank</label>
            <select
              id="dip-tank"
              className="input"
              value={dipTankId}
              onChange={(e) => setDipTankId(e.target.value)}
              aria-label="Tank for dip entry"
            >
              {tanks.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dip-reading" className="label">Dip reading</label>
            <input
              id="dip-reading"
              type="number"
              step="any"
              className="input"
              value={dipReading}
              onChange={(e) => setDipReading(e.target.value)}
              aria-label="Dip reading"
            />
          </div>
          <div>
            <label htmlFor="dip-actual-qty" className="label">Actual quantity (L)</label>
            <input
              id="dip-actual-qty"
              type="number"
              step="any"
              className="input"
              value={actualQty}
              onChange={(e) => setActualQty(e.target.value)}
              aria-label="Actual quantity in liters"
            />
          </div>
          {actualQty && (
            <p className="text-sm">
              Loss/Gain:{" "}
              <span className={lossOrGain >= 0 ? "text-green-600" : "text-red-600"}>
                {lossOrGain >= 0 ? "+" : ""}{formatNumber(lossOrGain)} L
              </span>
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={dipSaving}>
            {dipSaving ? "Saving…" : "Save dip"}
          </button>
        </form>
        {dips.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium mb-2">Dip history for {formatDate(dipDate)}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium">Tank</th>
                  <th className="pb-2 text-left font-medium">Dip</th>
                  <th className="pb-2 text-left font-medium">Actual</th>
                  <th className="pb-2 text-left font-medium">Loss/Gain</th>
                </tr>
              </thead>
              <tbody>
                {dips.map((d) => {
                  const t = tanks.find((x) => x.id === d.tankId);
                  return (
                    <tr key={d.id} className="border-b border-slate-100">
                      <td className="py-1">{t?.name ?? "-"}</td>
                      <td className="py-1">{formatNumber(d.dipReading)}</td>
                      <td className="py-1">{formatNumber(d.actualQuantity)} L</td>
                      <td className={d.lossOrGain >= 0 ? "text-green-600" : "text-red-600"}>
                        {d.lossOrGain >= 0 ? "+" : ""}{formatNumber(d.lossOrGain)} L
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

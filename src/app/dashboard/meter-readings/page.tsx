"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getNozzles,
  getFuelTypes,
  getMeterReadingsByDate,
  saveMeterReading,
  updateMeterReading,
} from "@/lib/db";
import type { Nozzle, FuelType, MeterReading } from "@/types";
import { formatNumber, formatDate } from "@/lib/utils";

const today = new Date().toISOString().split("T")[0];

export default function MeterReadingsPage() {
  const { profile } = useAuth();
  const [nozzles, setNozzles] = useState<Nozzle[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [opening, setOpening] = useState<Record<string, string>>({});
  const [closing, setClosing] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([getNozzles(), getFuelTypes()]).then(([n, f]) => {
      setNozzles(n);
      setFuelTypes(f);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getMeterReadingsByDate(date).then((r) => {
      setReadings(r);
      const o: Record<string, string> = {};
      const c: Record<string, string> = {};
      r.forEach((x) => {
        o[x.nozzleId] = String(x.openingMeter);
        c[x.nozzleId] = String(x.closingMeter);
      });
      setOpening(o);
      setClosing(c);
    });
  }, [date]);

  async function handleSave(nozzleId: string) {
    if (!profile) return;
    const o = Number(opening[nozzleId] ?? 0);
    const c = Number(closing[nozzleId] ?? 0);
    if (c < o) return;
    setSaving(nozzleId);
    try {
      const existing = readings.find((r) => r.nozzleId === nozzleId);
      if (existing) {
        await updateMeterReading(existing.id, { openingMeter: o, closingMeter: c });
      } else {
        await saveMeterReading({
          nozzleId,
          date,
          openingMeter: o,
          closingMeter: c,
          enteredBy: profile.email,
        });
      }
      setReadings(await getMeterReadingsByDate(date));
    } finally {
      setSaving(null);
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
      <h1 className="text-2xl font-bold">Daily Meter Readings</h1>
      <div className="card">
        <div className="mb-4">
          <label className="label">Date</label>
          <input
            type="date"
            className="input max-w-xs"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Enter morning opening and evening closing meter for each machine. Fuel sold = Closing − Opening.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Machine</th>
                <th className="pb-2 font-medium">Fuel type</th>
                <th className="pb-2 font-medium">Opening</th>
                <th className="pb-2 font-medium">Closing</th>
                <th className="pb-2 font-medium">Sold</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {nozzles.map((n) => {
                const ft = fuelTypes.find((f) => f.id === n.fuelTypeId);
                const r = readings.find((x) => x.nozzleId === n.id);
                const o = Number(opening[n.id] ?? r?.openingMeter ?? 0);
                const c = Number(closing[n.id] ?? r?.closingMeter ?? 0);
                const sold = r?.fuelSold ?? (c >= o ? c - o : 0);
                return (
                  <tr key={n.id} className="border-b border-slate-100 align-middle">
                    <td className="py-2">{n.machineNumber}</td>
                    <td className="py-2">{ft?.name ?? "-"}</td>
                    <td className="py-2">
                      <input
                        type="number"
                        step="any"
                        className="input w-28"
                        value={opening[n.id] ?? r?.openingMeter ?? ""}
                        onChange={(e) => setOpening((prev) => ({ ...prev, [n.id]: e.target.value }))}
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        step="any"
                        className="input w-28"
                        value={closing[n.id] ?? r?.closingMeter ?? ""}
                        onChange={(e) => setClosing((prev) => ({ ...prev, [n.id]: e.target.value }))}
                      />
                    </td>
                    <td className="py-2 font-medium">{formatNumber(sold)} L</td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="btn btn-primary text-sm"
                        disabled={saving === n.id}
                        onClick={() => handleSave(n.id)}
                      >
                        {saving === n.id ? "Saving…" : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div}
        {nozzles.length === 0 && (
          <p className="text-slate-500 py-4">Add nozzles first from the Nozzles page.</p>
        )}
      </div>
    </div>
  );
}

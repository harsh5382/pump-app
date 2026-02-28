"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getNozzles,
  getFuelTypes,
  getMeterReadingsByDate,
  saveMeterReading,
  updateMeterReading,
  deleteMeterReading,
} from "@/lib/db";
import type { Nozzle, FuelType, MeterReading } from "@/types";
import { formatNumber, formatDate } from "@/lib/utils";
import ConfirmDialog from "@/components/ConfirmDialog";
import DatePicker from "@/components/DatePicker";
import FuelLoader from "@/components/FuelLoader";
import { Trash2, Check } from "lucide-react";

const today = new Date().toISOString().split("T")[0];

export default function MeterReadingsPage() {
  const { profile, hasRole } = useAuth();
  const [nozzles, setNozzles] = useState<Nozzle[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [opening, setOpening] = useState<Record<string, string>>({});
  const [closing, setClosing] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MeterReading | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isAdmin = hasRole("admin");

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
      const fresh = await getMeterReadingsByDate(date);
      setReadings(fresh);
      const oMap: Record<string, string> = {};
      const cMap: Record<string, string> = {};
      fresh.forEach((x) => {
        oMap[x.nozzleId] = String(x.openingMeter);
        cMap[x.nozzleId] = String(x.closingMeter);
      });
      setOpening((prev) => ({ ...prev, ...oMap }));
      setClosing((prev) => ({ ...prev, ...cMap }));
      setSuccessMessage("Meter reading saved successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setSaving(null);
    }
  }

  async function handleDeleteReading() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMeterReading(deleteTarget.id);
      setDeleteTarget(null);
      setReadings(await getMeterReadingsByDate(date));
      setOpening((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.nozzleId];
        return next;
      });
      setClosing((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.nozzleId];
        return next;
      });
      setSuccessMessage("Meter reading deleted.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <FuelLoader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Daily Meter Readings</h1>
      {successMessage && (
        <div className="banner-success">
          {successMessage}
        </div>
      )}
      <div className="card overflow-hidden">
        <div className="mb-4">
          <label htmlFor="meter-readings-date" className="label">Date</label>
          <DatePicker
            id="meter-readings-date"
            value={date}
            onChange={setDate}
            aria-label="Reading date"
            className="max-w-xs"
          />
        </div>
        <p className="text-sm text-slate-600 mb-4 break-words">
          Enter morning opening and evening closing meter for each machine. Fuel sold = Closing − Opening.
        </p>
        <div className="table-container -mx-1">
          <table className="table-default min-w-[min(100%,32rem)]">
            <thead>
              <tr>
                <th className="whitespace-nowrap">Machine</th>
                <th className="whitespace-nowrap">Fuel type</th>
                <th className="whitespace-nowrap min-w-[5rem]">Opening</th>
                <th className="whitespace-nowrap min-w-[5rem]">Closing</th>
                <th className="whitespace-nowrap">Sold</th>
                <th className="whitespace-nowrap w-14"></th>
                {isAdmin && <th className="whitespace-nowrap w-14">Actions</th>}
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
                  <tr key={n.id}>
                    <td className="whitespace-nowrap">{n.machineNumber}</td>
                    <td className="whitespace-nowrap">{ft?.name ?? "-"}</td>
                    <td className="min-w-[5rem]">
                      <input
                        type="number"
                        step="any"
                        className="input py-2 text-sm w-full min-w-0"
                        value={opening[n.id] ?? r?.openingMeter ?? ""}
                        onChange={(e) => setOpening((prev) => ({ ...prev, [n.id]: e.target.value }))}
                        aria-label={`Opening meter for machine ${n.machineNumber}`}
                      />
                    </td>
                    <td className="min-w-[5rem]">
                      <input
                        type="number"
                        step="any"
                        className="input py-2 text-sm w-full min-w-0"
                        value={closing[n.id] ?? r?.closingMeter ?? ""}
                        onChange={(e) => setClosing((prev) => ({ ...prev, [n.id]: e.target.value }))}
                        aria-label={`Closing meter for machine ${n.machineNumber}`}
                      />
                    </td>
                    <td className="whitespace-nowrap font-medium">{formatNumber(sold)} L</td>
                    <td>
                      <button
                        type="button"
                        className="p-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 inline-flex items-center justify-center shrink-0"
                        disabled={saving === n.id}
                        onClick={() => handleSave(n.id)}
                        aria-label={saving === n.id ? "Saving…" : "Save"}
                        title={saving === n.id ? "Saving…" : "Save"}
                      >
                        {saving === n.id ? (
                          <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" aria-hidden />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    {isAdmin && (
                      <td>
                        {r && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(r)}
                            className="btn-icon-delete p-2 shrink-0"
                            aria-label="Delete reading"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {nozzles.length === 0 && (
          <p className="text-slate-500 py-4">Add nozzles first from the Nozzles page.</p>
        )}
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete meter reading"
        message={deleteTarget ? "Delete this meter reading? Fuel sold will be removed for this nozzle/date." : ""}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteReading}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

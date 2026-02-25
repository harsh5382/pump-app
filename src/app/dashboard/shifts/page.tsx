"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getShiftsByDate, addShift, getNozzles } from "@/lib/db";
import type { StaffShift, Nozzle } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const today = new Date().toISOString().split("T")[0];

export default function ShiftsPage() {
  const { profile } = useAuth();
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [nozzles, setNozzles] = useState<Nozzle[]>([]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState("");
  const [shiftStart, setShiftStart] = useState("06:00");
  const [shiftEnd, setShiftEnd] = useState("14:00");
  const [assignedNozzleIds, setAssignedNozzleIds] = useState<string[]>([]);
  const [cashCollected, setCashCollected] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getShiftsByDate(date), getNozzles()]).then(([s, n]) => {
      setShifts(s);
      setNozzles(n);
    }).finally(() => setLoading(false));
  }, [date]);

  function toggleNozzle(id: string) {
    setAssignedNozzleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staffName.trim() || !profile) return;
    setSaving(true);
    try {
      await addShift({
        staffName: staffName.trim(),
        date,
        shiftStart,
        shiftEnd,
        assignedNozzleIds,
        cashCollected: Number(cashCollected) || 0,
        enteredBy: profile.email,
      });
      setStaffName("");
      setCashCollected("");
      setAssignedNozzleIds([]);
      setShifts(await getShiftsByDate(date));
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
      <h1 className="text-2xl font-bold">Staff Shift Management</h1>
      <div className="card">
        <label htmlFor="shift-date" className="label">Date</label>
        <input
          id="shift-date"
          type="date"
          className="input max-w-xs"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Shift date"
        />
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Add shift</h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="shift-staff-name" className="label">Staff name</label>
              <input
                id="shift-staff-name"
                className="input"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                required
                aria-label="Staff name"
              />
            </div>
            <div>
              <label htmlFor="shift-cash" className="label">Cash collected (₹)</label>
              <input
                id="shift-cash"
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={cashCollected}
                onChange={(e) => setCashCollected(e.target.value)}
                aria-label="Cash collected in rupees"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="shift-start" className="label">Shift start</label>
              <input
                id="shift-start"
                type="time"
                className="input"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                aria-label="Shift start time"
              />
            </div>
            <div>
              <label htmlFor="shift-end" className="label">Shift end</label>
              <input
                id="shift-end"
                type="time"
                className="input"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                aria-label="Shift end time"
              />
            </div>
          </div>
          <div>
            <label id="shift-machines-label" className="label">Assigned machines</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {nozzles.map((n) => (
                <label key={n.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignedNozzleIds.includes(n.id)}
                    onChange={() => toggleNozzle(n.id)}
                  />
                  <span>Machine {n.machineNumber}</span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Add shift"}
          </button>
        </form>
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Shifts for {formatDate(date)}</h2>
        {shifts.length === 0 ? (
          <p className="text-slate-500">No shifts recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Staff</th>
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Cash collected</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="py-2">{s.staffName}</td>
                    <td className="py-2">{s.shiftStart} – {s.shiftEnd}</td>
                    <td className="py-2">{formatCurrency(s.cashCollected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

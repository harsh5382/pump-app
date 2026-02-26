"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getShiftsByDate, addShift, updateShift, deleteShift, getNozzles } from "@/lib/db";
import type { StaffShift, Nozzle } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Pencil, Trash2, Check, X } from "lucide-react";

const today = new Date().toISOString().split("T")[0];

export default function ShiftsPage() {
  const { profile, hasRole } = useAuth();
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
  const [successMessage, setSuccessMessage] = useState("");
  const [editing, setEditing] = useState<StaffShift | null>(null);
  const [editStaffName, setEditStaffName] = useState("");
  const [editShiftStart, setEditShiftStart] = useState("");
  const [editShiftEnd, setEditShiftEnd] = useState("");
  const [editCashCollected, setEditCashCollected] = useState("");
  const [editNozzleIds, setEditNozzleIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<StaffShift | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isAdmin = hasRole("admin");

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
      setSuccessMessage("Shift added successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(s: StaffShift) {
    setEditing(s);
    setEditStaffName(s.staffName);
    setEditShiftStart(s.shiftStart);
    setEditShiftEnd(s.shiftEnd);
    setEditCashCollected(String(s.cashCollected));
    setEditNozzleIds(s.assignedNozzleIds ?? []);
  }

  function toggleEditNozzle(id: string) {
    setEditNozzleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !editStaffName.trim()) return;
    setSaving(true);
    try {
      await updateShift(editing.id, {
        staffName: editStaffName.trim(),
        shiftStart: editShiftStart,
        shiftEnd: editShiftEnd,
        cashCollected: Number(editCashCollected) || 0,
        assignedNozzleIds: editNozzleIds,
      });
      setEditing(null);
      setShifts(await getShiftsByDate(date));
      setSuccessMessage("Shift updated.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteShift(deleteTarget.id);
      setDeleteTarget(null);
      setShifts(await getShiftsByDate(date));
      setSuccessMessage("Shift deleted.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setDeleting(false);
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
      <h1 className="page-title">Staff Shift Management</h1>
      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      )}
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
          <div className="table-container">
            <table className="table-default">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Time</th>
                  <th>Cash collected</th>
                  {isAdmin && <th className="w-24">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => {
                  const isEditingRow = editing?.id === s.id;
                  return (
                    <tr key={s.id}>
                      {isEditingRow ? (
                        <>
                          <td className="align-middle">
                            <form id={`shift-edit-${s.id}`} onSubmit={handleUpdate} className="min-w-0">
                              <input className="input py-1.5 text-sm w-full min-w-0" value={editStaffName} onChange={(e) => setEditStaffName(e.target.value)} placeholder="Staff name" required aria-label="Staff name" />
                            </form>
                          </td>
                          <td className="align-middle">
                            <span className="flex items-center gap-1 flex-wrap">
                              <input form={`shift-edit-${s.id}`} type="time" className="input py-1.5 text-sm w-full min-w-0 max-w-[7rem]" value={editShiftStart} onChange={(e) => setEditShiftStart(e.target.value)} aria-label="Shift start" />
                              <span className="text-slate-400">–</span>
                              <input form={`shift-edit-${s.id}`} type="time" className="input py-1.5 text-sm w-full min-w-0 max-w-[7rem]" value={editShiftEnd} onChange={(e) => setEditShiftEnd(e.target.value)} aria-label="Shift end" />
                            </span>
                          </td>
                          <td className="align-middle">
                            <input form={`shift-edit-${s.id}`} type="number" step="0.01" min="0" className="input py-1.5 text-sm w-full min-w-0" value={editCashCollected} onChange={(e) => setEditCashCollected(e.target.value)} placeholder="Cash" aria-label="Cash collected (₹)" />
                          </td>
                          {isAdmin && (
                            <td className="align-middle">
                              <div className="flex flex-wrap gap-1 mb-1">
                                {nozzles.map((n) => (
                                  <label key={n.id} className="flex items-center gap-1 cursor-pointer text-xs">
                                    <input form={`shift-edit-${s.id}`} type="checkbox" checked={editNozzleIds.includes(n.id)} onChange={() => toggleEditNozzle(n.id)} />
                                    <span>M{n.machineNumber}</span>
                                  </label>
                                ))}
                              </div>
                              <button form={`shift-edit-${s.id}`} type="submit" className="p-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 inline-flex items-center justify-center mr-1" disabled={saving} aria-label="Save"><Check className="h-4 w-4" /></button>
                              <button type="button" className="p-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 inline-flex items-center justify-center" onClick={() => setEditing(null)} aria-label="Cancel"><X className="h-4 w-4" /></button>
                            </td>
                          )}
                        </>
                      ) : (
                        <>
                          <td>{s.staffName}</td>
                          <td>{s.shiftStart} – {s.shiftEnd}</td>
                          <td>{formatCurrency(s.cashCollected)}</td>
                          {isAdmin && (
                            <td>
                              <div className="flex gap-1">
                                <button type="button" onClick={() => startEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-sky-600" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                                <button type="button" onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </td>
                          )}
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
        title="Delete shift"
        message={deleteTarget ? `Delete shift for "${deleteTarget.staffName}"?` : ""}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

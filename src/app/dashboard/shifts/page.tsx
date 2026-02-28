"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getShiftsByDate, addShift, updateShift, deleteShift, getNozzles } from "@/lib/db";
import type { StaffShift, Nozzle } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import ConfirmDialog from "@/components/ConfirmDialog";
import DatePicker from "@/components/DatePicker";
import FuelLoader from "@/components/FuelLoader";
import { useMediaQuery } from "@/lib/useMediaQuery";
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
  const isMobile = useMediaQuery("(max-width: 768px)");

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
    return <FuelLoader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Staff Shift Management</h1>
      {successMessage && (
        <div className="banner-success">
          {successMessage}
        </div>
      )}
      <div className="card">
        <label htmlFor="shift-date" className="label">Date</label>
        <DatePicker
          id="shift-date"
          value={date}
          onChange={setDate}
          aria-label="Shift date"
          className="max-w-xs"
        />
      </div>
      <div className="card">
        <h2 className="card-header">Add shift</h2>
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
        <h2 className="card-header">Shifts for {formatDate(date)}</h2>
        {shifts.length === 0 ? (
          <p className="text-slate-500">No shifts recorded.</p>
        ) : isMobile ? (
          <ul className="space-y-3 list-none p-0 m-0">
            {shifts.map((s) => {
              const isEditingRow = editing?.id === s.id;
              return (
                <li key={s.id}>
                  {isEditingRow ? (
                    <div className="edit-card">
                      <p className="edit-card-title">Editing: {s.staffName}</p>
                      <form id={`shift-edit-${s.id}`} onSubmit={handleUpdate} className="space-y-4">
                        <div>
                          <label htmlFor={`shift-edit-name-${s.id}`} className="label">Staff name</label>
                          <input id={`shift-edit-name-${s.id}`} className="input" value={editStaffName} onChange={(e) => setEditStaffName(e.target.value)} placeholder="Staff name" required aria-label="Staff name" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor={`shift-edit-start-${s.id}`} className="label">Start</label>
                            <input id={`shift-edit-start-${s.id}`} form={`shift-edit-${s.id}`} type="time" className="input" value={editShiftStart} onChange={(e) => setEditShiftStart(e.target.value)} aria-label="Shift start" />
                          </div>
                          <div>
                            <label htmlFor={`shift-edit-end-${s.id}`} className="label">End</label>
                            <input id={`shift-edit-end-${s.id}`} form={`shift-edit-${s.id}`} type="time" className="input" value={editShiftEnd} onChange={(e) => setEditShiftEnd(e.target.value)} aria-label="Shift end" />
                          </div>
                        </div>
                        <div>
                          <label htmlFor={`shift-edit-cash-${s.id}`} className="label">Cash collected (₹)</label>
                          <input id={`shift-edit-cash-${s.id}`} form={`shift-edit-${s.id}`} type="number" step="0.01" min="0" className="input" value={editCashCollected} onChange={(e) => setEditCashCollected(e.target.value)} placeholder="Cash" aria-label="Cash collected (₹)" />
                        </div>
                        <div>
                          <p className="label">Assigned nozzles</p>
                          <div className="flex flex-wrap gap-3 pt-1">
                            {nozzles.map((n) => (
                              <label key={n.id} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                                <input form={`shift-edit-${s.id}`} type="checkbox" checked={editNozzleIds.includes(n.id)} onChange={() => toggleEditNozzle(n.id)} className="w-4 h-4 rounded" />
                                <span>M{n.machineNumber}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button form={`shift-edit-${s.id}`} type="submit" className="btn btn-primary flex-1 min-h-[48px]" disabled={saving} aria-label="Save"><Check className="h-5 w-5 sm:mr-1.5" /><span className="hidden sm:inline">{saving ? "Saving…" : "Save"}</span></button>
                          <button type="button" className="btn btn-secondary flex-1 min-h-[48px]" onClick={() => setEditing(null)} aria-label="Cancel"><X className="h-5 w-5 sm:mr-1.5" /><span className="hidden sm:inline">Cancel</span></button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="mobile-list-card">
                      <p className="mobile-list-card-title">{s.staffName}</p>
                      <p className="mobile-list-card-row">Time: {s.shiftStart} – {s.shiftEnd}</p>
                      <p className="mobile-list-card-row">Cash collected: {formatCurrency(s.cashCollected)}</p>
                      {isAdmin && (
                        <div className="mobile-list-card-actions">
                          <button type="button" onClick={() => startEdit(s)} className="btn btn-secondary min-h-[44px] flex-1 flex items-center justify-center gap-1.5" aria-label="Edit"><Pencil className="h-4 w-4" /><span>Edit</span></button>
                          <button type="button" onClick={() => setDeleteTarget(s)} className="btn btn-danger min-h-[44px] flex-1 flex items-center justify-center gap-1.5" aria-label="Delete"><Trash2 className="h-4 w-4" /><span>Delete</span></button>
                        </div>
                      )}
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
                              <div className="flex gap-2">
                                <button form={`shift-edit-${s.id}`} type="submit" className="btn-icon-primary" disabled={saving} aria-label="Save"><Check className="h-4 w-4" /></button>
                                <button type="button" className="btn-icon-cancel" onClick={() => setEditing(null)} aria-label="Cancel"><X className="h-4 w-4" /></button>
                              </div>
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
                                <button type="button" onClick={() => setDeleteTarget(s)} className="btn-icon-delete" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
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

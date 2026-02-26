"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getNozzles, getTanks, getFuelTypes, addNozzle, updateNozzle, deleteNozzle } from "@/lib/db";
import type { Nozzle, Tank, FuelType } from "@/types";
import { logAudit } from "@/lib/audit";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Pencil, Trash2, Check, X } from "lucide-react";

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
  const [successMessage, setSuccessMessage] = useState("");
  const [editingNozzle, setEditingNozzle] = useState<Nozzle | null>(null);
  const [editMachineNumber, setEditMachineNumber] = useState("");
  const [editFuelTypeId, setEditFuelTypeId] = useState("");
  const [editTankId, setEditTankId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Nozzle | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      setSuccessMessage("Nozzle added successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(n: Nozzle) {
    setEditingNozzle(n);
    setEditMachineNumber(n.machineNumber);
    setEditFuelTypeId(n.fuelTypeId);
    setEditTankId(n.tankId);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingNozzle || !editMachineNumber.trim() || !editFuelTypeId || !editTankId) return;
    setSaving(true);
    try {
      await updateNozzle(editingNozzle.id, {
        machineNumber: editMachineNumber.trim(),
        fuelTypeId: editFuelTypeId,
        tankId: editTankId,
      });
      if (profile) await logAudit(profile.uid, profile.email, "UPDATE", "nozzle", `Nozzle ${editingNozzle.machineNumber} → ${editMachineNumber}`);
      setEditingNozzle(null);
      setNozzles(await getNozzles());
      setSuccessMessage("Nozzle updated.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteNozzle(deleteTarget.id);
      if (profile) await logAudit(profile.uid, profile.email, "DELETE", "nozzle", `Nozzle: ${deleteTarget.machineNumber}`);
      setDeleteTarget(null);
      setNozzles(await getNozzles());
      setSuccessMessage("Nozzle deleted.");
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
      <h1 className="page-title">Dispensing Machines (Nozzles)</h1>
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      )}
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
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Nozzles</h2>
        <div className="table-container">
          <table className="table-default">
            <thead>
              <tr>
                <th>Machine no.</th>
                <th>Fuel type</th>
                <th>Tank</th>
                {isAdmin && <th className="w-24">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {nozzles.map((n) => {
                const ft = fuelTypes.find((f) => f.id === n.fuelTypeId);
                const tank = tanks.find((t) => t.id === n.tankId);
                const isEditing = editingNozzle?.id === n.id;
                return (
                  <tr key={n.id}>
                    {isEditing ? (
                      <>
                        <td className="align-middle">
                          <form id={`nozzle-edit-${n.id}`} onSubmit={handleUpdate} className="min-w-0">
                            <input className="input py-1.5 text-sm w-full min-w-0" value={editMachineNumber} onChange={(e) => setEditMachineNumber(e.target.value)} placeholder="No." required aria-label="Machine number" />
                          </form>
                        </td>
                        <td className="align-middle">
                          <select form={`nozzle-edit-${n.id}`} className="input py-1.5 text-sm w-full min-w-0" value={editFuelTypeId} onChange={(e) => setEditFuelTypeId(e.target.value)} aria-label="Fuel type">
                            {fuelTypes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                        </td>
                        <td className="align-middle">
                          <select form={`nozzle-edit-${n.id}`} className="input py-1.5 text-sm w-full min-w-0" value={editTankId} onChange={(e) => setEditTankId(e.target.value)} aria-label="Tank">
                            {tanks.filter((t) => t.fuelTypeId === editFuelTypeId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </td>
                        {isAdmin && (
                          <td className="align-middle">
                            <button form={`nozzle-edit-${n.id}`} type="submit" className="p-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 inline-flex items-center justify-center mr-1" disabled={saving} aria-label="Save"><Check className="h-4 w-4" /></button>
                            <button type="button" className="p-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 inline-flex items-center justify-center" onClick={() => setEditingNozzle(null)} aria-label="Cancel"><X className="h-4 w-4" /></button>
                          </td>
                        )}
                      </>
                    ) : (
                      <>
                        <td>{n.machineNumber}</td>
                        <td>{ft?.name ?? "-"}</td>
                        <td>{tank?.name ?? "-"}</td>
                        {isAdmin && (
                          <td>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => startEdit(n)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-sky-600" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                              <button type="button" onClick={() => setDeleteTarget(n)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
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
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete nozzle"
        message={deleteTarget ? `Delete nozzle "${deleteTarget.machineNumber}"?` : ""}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

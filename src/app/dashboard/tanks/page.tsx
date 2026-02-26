"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTanks, getFuelTypes, addTank, updateTank, deleteTank, addDipEntry, getDipEntriesByDate, updateDipEntry, deleteDipEntry } from "@/lib/db";
import type { Tank, FuelType, DipEntry } from "@/types";
import { formatNumber, formatDate } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Pencil, Trash2, Check, X } from "lucide-react";

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
  const [successMessage, setSuccessMessage] = useState("");
  const [editingTank, setEditingTank] = useState<Tank | null>(null);
  const [editName, setEditName] = useState("");
  const [editFuelTypeId, setEditFuelTypeId] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [deleteTankTarget, setDeleteTankTarget] = useState<Tank | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingDip, setEditingDip] = useState<DipEntry | null>(null);
  const [editDipReading, setEditDipReading] = useState("");
  const [editActualQty, setEditActualQty] = useState("");
  const [deleteDipTarget, setDeleteDipTarget] = useState<DipEntry | null>(null);
  const [deletingDip, setDeletingDip] = useState(false);
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
    if (!name.trim() || !fuelTypeId || !capacity) return;
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
      setSuccessMessage("Tank added successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  const selectedTank = tanks.find((t) => t.id === dipTankId);
  const expectedFromDip = selectedTank?.currentStockLiters ?? 0;
  const lossOrGain = actualQty ? Number(actualQty) - expectedFromDip : 0;

  function startEditTank(t: Tank) {
    setEditingTank(t);
    setEditName(t.name);
    setEditFuelTypeId(t.fuelTypeId);
    setEditCapacity(String(t.capacityLiters));
  }

  async function handleUpdateTank(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTank || !editName.trim() || !editFuelTypeId || !editCapacity) return;
    setSaving(true);
    try {
      await updateTank(editingTank.id, {
        name: editName.trim(),
        fuelTypeId: editFuelTypeId,
        capacityLiters: Number(editCapacity),
      });
      if (profile) await logAudit(profile.uid, profile.email, "UPDATE", "tank", `Tank: ${editingTank.name} → ${editName}`);
      setEditingTank(null);
      setTanks(await getTanks());
      setSuccessMessage("Tank updated.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTank() {
    if (!deleteTankTarget) return;
    setDeleting(true);
    try {
      await deleteTank(deleteTankTarget.id);
      if (profile) await logAudit(profile.uid, profile.email, "DELETE", "tank", `Tank: ${deleteTankTarget.name}`);
      setDeleteTankTarget(null);
      setTanks(await getTanks());
      if (dipTankId === deleteTankTarget.id && tanks.length > 1) setDipTankId(tanks.find((x) => x.id !== deleteTankTarget.id)?.id ?? "");
      setSuccessMessage("Tank deleted.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setDeleting(false);
    }
  }

  function startEditDip(d: DipEntry) {
    setEditingDip(d);
    setEditDipReading(String(d.dipReading));
    setEditActualQty(String(d.actualQuantity));
  }

  async function handleUpdateDip(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDip) return;
    const actual = Number(editActualQty) || 0;
    const expected = tanks.find((x) => x.id === editingDip.tankId)?.currentStockLiters ?? editingDip.expectedQuantity;
    const lossOrGainVal = actual - expected;
    setDipSaving(true);
    try {
      await updateDipEntry(editingDip.id, {
        dipReading: Number(editDipReading),
        actualQuantity: actual,
        expectedQuantity: expected,
        lossOrGain: lossOrGainVal,
      });
      setEditingDip(null);
      setDips(await getDipEntriesByDate(dipDate));
      setSuccessMessage("Dip entry updated.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setDipSaving(false);
    }
  }

  async function handleDeleteDip() {
    if (!deleteDipTarget) return;
    setDeletingDip(true);
    try {
      await deleteDipEntry(deleteDipTarget.id);
      setDeleteDipTarget(null);
      setDips(await getDipEntriesByDate(dipDate));
      setSuccessMessage("Dip entry deleted.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setDeletingDip(false);
    }
  }

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
      setSuccessMessage("Dip entry saved successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
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
      <h1 className="page-title">Tank Management</h1>
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      )}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Add tank</h2>
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
                  <option value="">
                    {fuelTypes.length === 0 ? "No fuel types — add from Fuel Types page" : "Select fuel type"}
                  </option>
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

      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Tanks</h2>
        <div className="table-container">
          <table className="table-default">
            <thead>
              <tr>
                <th>Name</th>
                <th>Fuel type</th>
                <th>Capacity</th>
                <th>Current stock</th>
                {isAdmin && <th className="w-24">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {tanks.map((t) => {
                const ft = fuelTypes.find((f) => f.id === t.fuelTypeId);
                const isEditing = editingTank?.id === t.id;
                return (
                  <tr key={t.id}>
                    {isEditing ? (
                      <>
                        <td className="align-middle">
                          <form id={`tank-edit-${t.id}`} onSubmit={handleUpdateTank} className="min-w-0">
                            <input
                              className="input py-1.5 text-sm w-full min-w-0"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Name"
                              required
                              aria-label="Tank name"
                            />
                          </form>
                        </td>
                        <td className="align-middle">
                          <select
                            form={`tank-edit-${t.id}`}
                            className="input py-1.5 text-sm w-full min-w-0"
                            value={editFuelTypeId}
                            onChange={(e) => setEditFuelTypeId(e.target.value)}
                            aria-label="Fuel type"
                          >
                            {fuelTypes.map((f) => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="align-middle">
                          <input
                            form={`tank-edit-${t.id}`}
                            type="number"
                            min="0"
                            className="input py-1.5 text-sm w-full min-w-0"
                            value={editCapacity}
                            onChange={(e) => setEditCapacity(e.target.value)}
                            required
                            aria-label="Capacity (liters)"
                          />
                        </td>
                        <td className="align-middle text-slate-500">—</td>
                        {isAdmin && (
                          <td className="align-middle">
                            <button form={`tank-edit-${t.id}`} type="submit" className="p-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 inline-flex items-center justify-center" disabled={saving} aria-label="Save"><Check className="h-4 w-4" /></button>
                            <button type="button" className="p-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 inline-flex items-center justify-center" onClick={() => setEditingTank(null)} aria-label="Cancel"><X className="h-4 w-4" /></button>
                          </td>
                        )}
                      </>
                    ) : (
                      <>
                        <td>{t.name}</td>
                        <td>{ft?.name ?? "-"}</td>
                        <td>{formatNumber(t.capacityLiters)} L</td>
                        <td>{formatNumber(t.currentStockLiters)} L</td>
                        {isAdmin && (
                          <td>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => startEditTank(t)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-sky-600" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                              <button type="button" onClick={() => setDeleteTankTarget(t)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
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
        open={!!deleteTankTarget}
        title="Delete tank"
        message={deleteTankTarget ? `Delete "${deleteTankTarget.name}"? Nozzles linked to this tank may need to be updated.` : ""}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteTank}
        onCancel={() => setDeleteTankTarget(null)}
        loading={deleting}
      />

      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Daily dip entry</h2>
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
              <option value="">
                {tanks.length === 0 ? "No tanks yet — add one above" : "Select tank"}
              </option>
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
            <table className="table-default">
              <thead>
                <tr>
                  <th>Tank</th>
                  <th>Dip</th>
                  <th>Actual</th>
                  <th>Loss/Gain</th>
                  {isAdmin && <th className="w-24">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {dips.map((d) => {
                  const t = tanks.find((x) => x.id === d.tankId);
                  const isEditingDipRow = editingDip?.id === d.id;
                  return (
                    <tr key={d.id}>
                      {isEditingDipRow ? (
                        <>
                          <td className="align-middle text-slate-500">{t?.name ?? "—"}</td>
                          <td className="align-middle">
                            <form id={`dip-edit-${d.id}`} onSubmit={handleUpdateDip} className="min-w-0">
                              <input type="number" step="any" className="input py-1.5 text-sm w-full min-w-0" value={editDipReading} onChange={(e) => setEditDipReading(e.target.value)} placeholder="Dip" required aria-label="Dip reading" />
                            </form>
                          </td>
                          <td className="align-middle">
                            <input form={`dip-edit-${d.id}`} type="number" step="any" className="input py-1.5 text-sm w-full min-w-0" value={editActualQty} onChange={(e) => setEditActualQty(e.target.value)} placeholder="Actual L" aria-label="Actual quantity (L)" />
                          </td>
                          <td className="align-middle text-slate-400">—</td>
                          {isAdmin && (
                            <td className="align-middle">
                              <button form={`dip-edit-${d.id}`} type="submit" className="p-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 inline-flex items-center justify-center mr-1" disabled={dipSaving} aria-label="Save"><Check className="h-4 w-4" /></button>
                              <button type="button" className="p-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 inline-flex items-center justify-center" onClick={() => setEditingDip(null)} aria-label="Cancel"><X className="h-4 w-4" /></button>
                            </td>
                          )}
                        </>
                      ) : (
                        <>
                          <td>{t?.name ?? "-"}</td>
                          <td>{formatNumber(d.dipReading)}</td>
                          <td>{formatNumber(d.actualQuantity)} L</td>
                          <td className={d.lossOrGain >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {d.lossOrGain >= 0 ? "+" : ""}{formatNumber(d.lossOrGain)} L
                          </td>
                          {isAdmin && (
                            <td>
                              <div className="flex gap-1">
                                <button type="button" onClick={() => startEditDip(d)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-sky-600" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                                <button type="button" onClick={() => setDeleteDipTarget(d)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
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
        open={!!deleteDipTarget}
        title="Delete dip entry"
        message={deleteDipTarget ? "Delete this dip entry?" : ""}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteDip}
        onCancel={() => setDeleteDipTarget(null)}
        loading={deletingDip}
      />
    </div>
  );
}

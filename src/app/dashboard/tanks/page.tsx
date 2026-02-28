"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTanks, getFuelTypes, addTank, updateTank, deleteTank, addDipEntry, getDipEntriesByDate, updateDipEntry, deleteDipEntry } from "@/lib/db";
import type { Tank, FuelType, DipEntry } from "@/types";
import { formatNumber, formatDate } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { useMediaQuery } from "@/lib/useMediaQuery";
import ConfirmDialog from "@/components/ConfirmDialog";
import DatePicker from "@/components/DatePicker";
import FuelLoader from "@/components/FuelLoader";
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
  const isMobile = useMediaQuery("(max-width: 768px)");

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
    return <FuelLoader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Tank Management</h1>
      {successMessage && (
        <div className="banner-success">
          {successMessage}
        </div>
      )}
      <div className="card">
        <h2 className="card-header">Add tank</h2>
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
        <h2 className="card-header">Tanks</h2>
        {isMobile ? (
          <ul className="space-y-3 list-none p-0 m-0">
            {tanks.map((t) => {
              const ft = fuelTypes.find((f) => f.id === t.fuelTypeId);
              const isEditing = editingTank?.id === t.id;
              return (
                <li key={t.id}>
                  {isEditing ? (
                    <div className="edit-card">
                      <p className="edit-card-title">Editing: {t.name}</p>
                      <form id={`tank-edit-${t.id}`} onSubmit={handleUpdateTank} className="space-y-4">
                        <div>
                          <label htmlFor={`tank-edit-name-${t.id}`} className="label">Name</label>
                          <input id={`tank-edit-name-${t.id}`} className="input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Tank name" required aria-label="Tank name" />
                        </div>
                        <div>
                          <label htmlFor={`tank-edit-fuel-${t.id}`} className="label">Fuel type</label>
                          <select id={`tank-edit-fuel-${t.id}`} form={`tank-edit-${t.id}`} className="input" value={editFuelTypeId} onChange={(e) => setEditFuelTypeId(e.target.value)} aria-label="Fuel type">
                            {fuelTypes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`tank-edit-capacity-${t.id}`} className="label">Capacity (L)</label>
                          <input id={`tank-edit-capacity-${t.id}`} form={`tank-edit-${t.id}`} type="number" min="0" className="input" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} required aria-label="Capacity (liters)" />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button form={`tank-edit-${t.id}`} type="submit" className="btn btn-primary flex-1 min-h-[48px]" disabled={saving} aria-label="Save"><Check className="h-5 w-5 sm:mr-1.5" /><span className="hidden sm:inline">{saving ? "Saving…" : "Save"}</span></button>
                          <button type="button" className="btn btn-secondary flex-1 min-h-[48px]" onClick={() => setEditingTank(null)} aria-label="Cancel"><X className="h-5 w-5 sm:mr-1.5" /><span className="hidden sm:inline">Cancel</span></button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="mobile-list-card">
                      <p className="mobile-list-card-title">{t.name}</p>
                      <p className="mobile-list-card-row">Type: {ft?.name ?? "—"}</p>
                      <p className="mobile-list-card-row">Capacity: {formatNumber(t.capacityLiters)} L</p>
                      <p className="mobile-list-card-row">Stock: {formatNumber(t.currentStockLiters)} L</p>
                      {isAdmin && (
                        <div className="mobile-list-card-actions">
                          <button type="button" onClick={() => startEditTank(t)} className="btn btn-secondary min-h-[44px] flex-1 flex items-center justify-center gap-1.5" aria-label="Edit"><Pencil className="h-4 w-4" /><span>Edit</span></button>
                          <button type="button" onClick={() => setDeleteTankTarget(t)} className="btn btn-danger min-h-[44px] flex-1 flex items-center justify-center gap-1.5" aria-label="Delete"><Trash2 className="h-4 w-4" /><span>Delete</span></button>
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
                  const colSpan = isAdmin ? 5 : 4;
                  return (
                    <tr key={t.id}>
                      {isEditing ? (
                        <>
                          <td className="align-middle">
                            <form id={`tank-edit-${t.id}`} onSubmit={handleUpdateTank} className="min-w-0">
                              <input className="input py-1.5 text-sm w-full min-w-0" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" required aria-label="Tank name" />
                            </form>
                          </td>
                          <td className="align-middle">
                            <select form={`tank-edit-${t.id}`} className="input py-1.5 text-sm w-full min-w-0" value={editFuelTypeId} onChange={(e) => setEditFuelTypeId(e.target.value)} aria-label="Fuel type">
                              {fuelTypes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                          </td>
                          <td className="align-middle">
                            <input form={`tank-edit-${t.id}`} type="number" min="0" className="input py-1.5 text-sm w-full min-w-0" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} required aria-label="Capacity (liters)" />
                          </td>
                          <td className="align-middle text-slate-500">—</td>
                          {isAdmin && (
                            <td className="align-middle">
                              <div className="flex gap-2">
                                <button form={`tank-edit-${t.id}`} type="submit" className="btn-icon-primary" disabled={saving} aria-label="Save"><Check className="h-4 w-4" /></button>
                                <button type="button" className="btn-icon-cancel" onClick={() => setEditingTank(null)} aria-label="Cancel"><X className="h-4 w-4" /></button>
                              </div>
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
                                <button type="button" onClick={() => startEditTank(t)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-sky-600 dark:hover:bg-slate-600 dark:text-slate-400 dark:hover:text-sky-400" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                                <button type="button" onClick={() => setDeleteTankTarget(t)} className="btn-icon-delete" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
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
        <h2 className="card-header">Daily dip entry</h2>
        <form onSubmit={handleAddDip} className="space-y-4 max-w-md">
          <div>
            <label htmlFor="dip-date" className="label">Date</label>
            <DatePicker
              id="dip-date"
              value={dipDate}
              onChange={setDipDate}
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
              <span className={lossOrGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
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
            {isMobile ? (
              <ul className="space-y-3 list-none p-0 m-0">
                {dips.map((d) => {
                  const tank = tanks.find((x) => x.id === d.tankId);
                  const isEditingDipRow = editingDip?.id === d.id;
                  return (
                    <li key={d.id}>
                      {isEditingDipRow ? (
                        <div className="edit-card">
                          <p className="edit-card-title">Editing: {tank?.name ?? "Dip"}</p>
                          <form id={`dip-edit-${d.id}`} onSubmit={handleUpdateDip} className="space-y-4">
                            <div>
                              <label htmlFor={`dip-edit-reading-${d.id}`} className="label">Dip reading</label>
                              <input id={`dip-edit-reading-${d.id}`} type="number" step="any" className="input" value={editDipReading} onChange={(e) => setEditDipReading(e.target.value)} required aria-label="Dip reading" />
                            </div>
                            <div>
                              <label htmlFor={`dip-edit-actual-${d.id}`} className="label">Actual quantity (L)</label>
                              <input id={`dip-edit-actual-${d.id}`} form={`dip-edit-${d.id}`} type="number" step="any" className="input" value={editActualQty} onChange={(e) => setEditActualQty(e.target.value)} aria-label="Actual quantity (L)" />
                            </div>
                            <div className="flex gap-3 pt-2">
                              <button form={`dip-edit-${d.id}`} type="submit" className="btn btn-primary flex-1 min-h-[48px]" disabled={dipSaving} aria-label="Save"><Check className="h-5 w-5 sm:mr-1.5" /><span className="hidden sm:inline">{dipSaving ? "Saving…" : "Save"}</span></button>
                              <button type="button" className="btn btn-secondary flex-1 min-h-[48px]" onClick={() => setEditingDip(null)} aria-label="Cancel"><X className="h-5 w-5 sm:mr-1.5" /><span className="hidden sm:inline">Cancel</span></button>
                            </div>
                          </form>
                        </div>
                      ) : (
                        <div className="mobile-list-card">
                          <p className="mobile-list-card-title">{tank?.name ?? "—"}</p>
                          <p className="mobile-list-card-row">Dip: {formatNumber(d.dipReading)}</p>
                          <p className="mobile-list-card-row">Actual: {formatNumber(d.actualQuantity)} L</p>
                          <p className={`mobile-list-card-row font-medium ${d.lossOrGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            Loss/Gain: {d.lossOrGain >= 0 ? "+" : ""}{formatNumber(d.lossOrGain)} L
                          </p>
                          {isAdmin && (
                            <div className="mobile-list-card-actions">
                              <button type="button" onClick={() => startEditDip(d)} className="btn btn-secondary min-h-[44px] flex-1 flex items-center justify-center gap-1.5" aria-label="Edit"><Pencil className="h-4 w-4" /><span>Edit</span></button>
                              <button type="button" onClick={() => setDeleteDipTarget(d)} className="btn btn-danger min-h-[44px] flex-1 flex items-center justify-center gap-1.5" aria-label="Delete"><Trash2 className="h-4 w-4" /><span>Delete</span></button>
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
                      <th>Tank</th>
                      <th>Dip</th>
                      <th>Actual</th>
                      <th>Loss/Gain</th>
                      {isAdmin && <th className="w-24">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dips.map((d) => {
                      const tank = tanks.find((x) => x.id === d.tankId);
                      const isEditingDipRow = editingDip?.id === d.id;
                      const dipColSpan = isAdmin ? 5 : 4;
                      return (
                        <tr key={d.id}>
                          {isEditingDipRow ? (
                            <>
                              <td className="align-middle text-slate-500">{tank?.name ?? "—"}</td>
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
                                  <div className="flex gap-2">
                                    <button form={`dip-edit-${d.id}`} type="submit" className="btn-icon-primary" disabled={dipSaving} aria-label="Save"><Check className="h-4 w-4" /></button>
                                    <button type="button" className="btn-icon-cancel" onClick={() => setEditingDip(null)} aria-label="Cancel"><X className="h-4 w-4" /></button>
                                  </div>
                                </td>
                              )}
                            </>
                          ) : (
                            <>
                              <td>{tank?.name ?? "-"}</td>
                              <td>{formatNumber(d.dipReading)}</td>
                              <td>{formatNumber(d.actualQuantity)} L</td>
                              <td className={d.lossOrGain >= 0 ? "text-green-600 dark:text-green-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>{d.lossOrGain >= 0 ? "+" : ""}{formatNumber(d.lossOrGain)} L</td>
                              {isAdmin && (
                                <td>
                                  <div className="flex gap-1">
                                    <button type="button" onClick={() => startEditDip(d)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-sky-600 dark:hover:bg-slate-600 dark:text-slate-400 dark:hover:text-sky-400" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                                    <button type="button" onClick={() => setDeleteDipTarget(d)} className="btn-icon-delete" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
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

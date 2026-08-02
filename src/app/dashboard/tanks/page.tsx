"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { useToast } from "@/components/ui/Toast";
import { Badge, EmptyState } from "@/components/ui";
import {
  getTanks,
  getFuelTypes,
  addTank,
  updateTank,
  deleteTank,
  addDipEntry,
  getDipEntriesByDate,
  updateDipEntry,
  deleteDipEntry,
} from "@/lib/db";
import type { Tank, FuelType, DipEntry } from "@/types";
import { cn, formatNumber, formatDate, isoLocal } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { useMediaQuery } from "@/lib/useMediaQuery";
import ConfirmDialog from "@/components/ConfirmDialog";
import DatePicker from "@/components/DatePicker";
import FuelLoader from "@/components/FuelLoader";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

const TODAY = isoLocal(new Date());

/** Below this share of capacity a tank reads as running low. */
const LOW_FILL = 0.15;

/** Litres, in the tabular face, with the unit alongside in the sans face. */
function Litres({
  value,
  decimals = 2,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  return (
    <span className={cn("num whitespace-nowrap", className)}>
      {formatNumber(value, decimals)}
      <span className="unit">L</span>
    </span>
  );
}

/** How full a tank is — the thing its two figures mean when read together. */
function Gauge({
  stock,
  capacity,
  inline = false,
}: {
  stock: number;
  capacity: number;
  /** Track and caption side by side (mobile card) rather than stacked (table). */
  inline?: boolean;
}) {
  if (capacity <= 0) return null;
  const share = stock / capacity;
  const pct = Math.min(100, Math.max(0, share * 100));
  const low = share < LOW_FILL;
  return (
    <div
      className={cn(
        "flex",
        inline ? "mt-2 items-center gap-2.5" : "mt-1.5 flex-col items-end gap-1",
      )}
    >
      <div className="gauge">
        <div
          className={cn("gauge-fill", low && "is-low")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn("text-[11px] shrink-0", low ? "text-danger" : "text-ink-500")}>
        {Math.round(pct)}% full
      </span>
    </div>
  );
}

function signed(n: number): string {
  return `${n >= 0 ? "+" : ""}${formatNumber(n)}`;
}

export default function TanksPage() {
  const { profile } = useAuth();
  const { hasCapability, loading: orgLoading } = useOrg();
  const toast = useToast();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [dips, setDips] = useState<DipEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dipsLoading, setDipsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [fuelTypeId, setFuelTypeId] = useState("");
  const [capacity, setCapacity] = useState("");
  const [saving, setSaving] = useState(false);
  const [dipDate, setDipDate] = useState(TODAY);
  const [dipTankId, setDipTankId] = useState("");
  const [dipReading, setDipReading] = useState("");
  const [actualQty, setActualQty] = useState("");
  const [dipSaving, setDipSaving] = useState(false);
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
  const isAdmin = hasCapability("outlet.manage_assets");
  const isMobile = useMediaQuery("(max-width: 768px)");

  // The register loads once. Dips reload per date — keeping them in one effect
  // meant every date change refetched the tanks too, and fired the dip query
  // twice over.
  const loadRegister = useCallback(async () => {
    setError(null);
    try {
      const [t, f] = await Promise.all([getTanks(), getFuelTypes()]);
      setTanks(t);
      setFuelTypes(f);
      setFuelTypeId((prev) => prev || f[0]?.id || "");
      setDipTankId((prev) => prev || t[0]?.id || "");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The tank register could not be loaded. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDips = useCallback(async (date: string) => {
    setDipsLoading(true);
    try {
      setDips(await getDipEntriesByDate(date));
    } catch (err) {
      setDips([]);
      setError(
        err instanceof Error
          ? err.message
          : "Dip entries for this date could not be loaded.",
      );
    } finally {
      setDipsLoading(false);
    }
  }, []);

  // Every query runs inside the active outlet, so nothing may fire until the
  // org context has resolved one — otherwise the first render races it and
  // reports "no outlet selected" as a failure.
  useEffect(() => {
    if (orgLoading) return;
    loadRegister();
  }, [orgLoading, loadRegister]);

  useEffect(() => {
    if (orgLoading) return;
    loadDips(dipDate);
  }, [orgLoading, loadDips, dipDate]);

  const selectedTank = tanks.find((t) => t.id === dipTankId);
  const expectedFromDip = selectedTank?.currentStockLiters ?? 0;
  const lossOrGain = actualQty ? Number(actualQty) - expectedFromDip : 0;

  const totalCapacity = tanks.reduce((sum, t) => sum + t.capacityLiters, 0);
  const totalStock = tanks.reduce((sum, t) => sum + t.currentStockLiters, 0);
  const totalPct = totalCapacity > 0 ? Math.round((totalStock / totalCapacity) * 100) : 0;

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
      toast.success("Tank added successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

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
      toast.success("Tank updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
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
      const remaining = await getTanks();
      setTanks(remaining);
      // The dip form must never keep pointing at a tank that no longer exists —
      // it would submit against a dead id, or silently do nothing.
      if (dipTankId === deleteTankTarget.id) setDipTankId(remaining[0]?.id ?? "");
      setDeleteTankTarget(null);
      toast.success("Tank deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
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
      await loadDips(dipDate);
      toast.success("Dip entry updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
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
      await loadDips(dipDate);
      toast.success("Dip entry deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
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
      await loadDips(dipDate);
      setDipReading("");
      setActualQty("");
      toast.success("Dip entry saved successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDipSaving(false);
    }
  }

  if (loading) {
    return <FuelLoader label="Loading tanks" />;
  }

  const dipDateLabel = formatDate(dipDate);

  return (
    <div className="page">
      {/* Stacked on a phone: the heading needs the full measure, and a
          full-width action is the easier tap. */}
      <div className="page-head flex-col sm:flex-row">
        <div>
          {/* The topbar already says "Tanks", so the heading carries the thing
              that actually changes: what is in them right now. */}
          <h1 className="page-title">
            {tanks.length} {tanks.length === 1 ? "tank" : "tanks"}{" "}
            <em>— {formatNumber(totalStock, 0)} L on hand</em>
          </h1>
          <p className="page-sub">
            {tanks.length === 0
              ? "Add a tank to start recording daily dips."
              : `${totalPct}% of ${formatNumber(totalCapacity, 0)} L combined capacity.`}
          </p>
        </div>
        {isAdmin && !showForm && (
          <button
            type="button"
            className="btn btn-primary shrink-0 w-full sm:w-auto min-h-[44px] sm:min-h-0"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add tank
          </button>
        )}
      </div>

      {error && (
        <div className="banner banner-danger">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              loadRegister();
              loadDips(dipDate);
            }}
          >
            Try again
          </button>
        </div>
      )}

      <div className="space-y-6 sm:space-y-8">
        <div className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Tank register</h2>
              <p className="card-subtitle">
                {tanks.length === 0
                  ? "Nothing set up yet"
                  : `${formatNumber(totalCapacity, 0)} L combined capacity`}
              </p>
            </div>
          </div>

          {showForm && isAdmin && (
            <div className="edit-card mb-6">
              <p className="edit-card-title">New tank</p>
              <form onSubmit={handleAddTank} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="field">
                    <label htmlFor="tank-name" className="label">Tank name</label>
                    <input
                      id="tank-name"
                      className="input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Tank 1"
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="tank-fuel-type" className="label">Fuel type</label>
                    <select
                      id="tank-fuel-type"
                      className="input"
                      value={fuelTypeId}
                      onChange={(e) => setFuelTypeId(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        {fuelTypes.length === 0
                          ? "No fuel types — add one first"
                          : "Select fuel type"}
                      </option>
                      {fuelTypes.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    {fuelTypes.length === 0 && (
                      <p className="field-hint">
                        Fuel types are managed on the Fuel Types page.
                      </p>
                    )}
                  </div>
                  <div className="field">
                    <label htmlFor="tank-capacity" className="label">Capacity (litres)</label>
                    <input
                      id="tank-capacity"
                      type="number"
                      min="1"
                      step="1"
                      className="input"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      placeholder="e.g. 20000"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary min-h-[44px] sm:min-h-0"
                    disabled={saving || fuelTypes.length === 0}
                  >
                    {saving ? "Saving…" : "Save tank"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost min-h-[44px] sm:min-h-0"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {tanks.length === 0 ? (
            <EmptyState
              title="No tanks yet"
              hint={
                isAdmin
                  ? "Add your storage tanks to record stock and daily dip readings against them."
                  : "Ask an outlet manager to set up the storage tanks for this outlet."
              }
              action={
                isAdmin && !showForm ? (
                  <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Add tank
                  </button>
                ) : undefined
              }
            />
          ) : isMobile ? (
            <ul className="space-y-3 list-none p-0 m-0">
              {tanks.map((t) => {
                const ft = fuelTypes.find((f) => f.id === t.fuelTypeId);
                const isEditing = editingTank?.id === t.id;
                return (
                  // Keyed by mode as well as id — see the table below.
                  <li key={isEditing ? `${t.id}-edit` : t.id}>
                    {isEditing ? (
                      <div className="edit-card">
                        <p className="edit-card-title">Editing: {t.name}</p>
                        <form id={`tank-edit-${t.id}`} onSubmit={handleUpdateTank} className="space-y-4">
                          <div className="field">
                            <label htmlFor={`tank-edit-name-${t.id}`} className="label">Name</label>
                            <input id={`tank-edit-name-${t.id}`} className="input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Tank name" required />
                          </div>
                          <div className="field">
                            <label htmlFor={`tank-edit-fuel-${t.id}`} className="label">Fuel type</label>
                            <select id={`tank-edit-fuel-${t.id}`} form={`tank-edit-${t.id}`} className="input" value={editFuelTypeId} onChange={(e) => setEditFuelTypeId(e.target.value)} required>
                              {fuelTypes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor={`tank-edit-capacity-${t.id}`} className="label">Capacity (litres)</label>
                            <input id={`tank-edit-capacity-${t.id}`} form={`tank-edit-${t.id}`} type="number" min="1" step="1" className="input" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} required />
                          </div>
                          <div className="flex gap-3 pt-1">
                            <button form={`tank-edit-${t.id}`} type="submit" className="btn btn-primary flex-1 min-h-[48px]" disabled={saving}>
                              <Check className="h-4 w-4" aria-hidden />
                              {saving ? "Saving…" : "Save"}
                            </button>
                            <button type="button" className="btn btn-ghost flex-1 min-h-[48px]" onClick={() => setEditingTank(null)}>
                              <X className="h-4 w-4" aria-hidden />
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="mobile-list-card">
                        <p className="mobile-list-card-title">{t.name}</p>
                        <p className="mobile-list-card-row">Fuel type: {ft?.name ?? "—"}</p>
                        <p className="mobile-list-card-row">
                          Capacity: <Litres value={t.capacityLiters} decimals={0} className="font-medium" />
                        </p>
                        <p className="mobile-list-card-row">
                          Current stock: <Litres value={t.currentStockLiters} className="font-medium" />
                        </p>
                        <Gauge stock={t.currentStockLiters} capacity={t.capacityLiters} inline />
                        {isAdmin && (
                          <div className="mobile-list-card-actions">
                            <button type="button" onClick={() => startEditTank(t)} className="btn btn-ghost min-h-[44px] flex-1">
                              <Pencil className="h-4 w-4" aria-hidden />
                              Edit
                            </button>
                            <button type="button" onClick={() => setDeleteTankTarget(t)} className="btn btn-danger-ghost min-h-[44px] flex-1">
                              <Trash2 className="h-4 w-4" aria-hidden />
                              Delete
                            </button>
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
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col" className="whitespace-nowrap">Tank</th>
                    <th scope="col" className="whitespace-nowrap">Fuel type</th>
                    <th scope="col" className="cell-num whitespace-nowrap">Capacity</th>
                    <th scope="col" className="cell-num whitespace-nowrap">Current stock</th>
                    {isAdmin && <th scope="col" className="w-24 whitespace-nowrap">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {tanks.map((t) => {
                    const ft = fuelTypes.find((f) => f.id === t.fuelTypeId);
                    const isEditing = editingTank?.id === t.id;
                    return (
                      // The key carries the mode so React replaces the row's
                      // nodes instead of mutating them in place. Without it the
                      // Edit button becomes a submit button on the very click
                      // that opened the editor, and the browser runs that
                      // button's activation — saving the row instantly.
                      <tr key={isEditing ? `${t.id}-edit` : t.id}>
                        {isEditing ? (
                          <>
                            <td>
                              <form id={`tank-edit-${t.id}`} onSubmit={handleUpdateTank} className="min-w-0">
                                <input className="input h-9 text-[13px] w-full min-w-0" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" required aria-label="Tank name" />
                              </form>
                            </td>
                            <td>
                              <select form={`tank-edit-${t.id}`} className="input h-9 text-[13px] w-full min-w-0" value={editFuelTypeId} onChange={(e) => setEditFuelTypeId(e.target.value)} required aria-label="Fuel type">
                                {fuelTypes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                              </select>
                            </td>
                            <td>
                              <input form={`tank-edit-${t.id}`} type="number" min="1" step="1" className="input h-9 text-[13px] w-full min-w-0 max-w-[150px] ml-auto block text-right" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} required aria-label="Capacity in litres" />
                            </td>
                            <td className="cell-num text-ink-400">—</td>
                            {isAdmin && (
                              <td>
                                <div className="flex gap-2">
                                  <button form={`tank-edit-${t.id}`} type="submit" className="btn-icon-primary" disabled={saving} aria-label="Save tank"><Check className="h-4 w-4" aria-hidden /></button>
                                  <button type="button" className="btn-icon-cancel" onClick={() => setEditingTank(null)} aria-label="Cancel editing"><X className="h-4 w-4" aria-hidden /></button>
                                </div>
                              </td>
                            )}
                          </>
                        ) : (
                          <>
                            <td className="font-medium text-ink-900">{t.name}</td>
                            <td>{ft?.name ?? "—"}</td>
                            <td className="cell-num">
                              <Litres value={t.capacityLiters} decimals={0} />
                            </td>
                            <td className="cell-num">
                              <div className="flex flex-col items-end">
                                <Litres value={t.currentStockLiters} />
                                <Gauge stock={t.currentStockLiters} capacity={t.capacityLiters} />
                              </div>
                            </td>
                            {isAdmin && (
                              <td>
                                <div className="flex gap-1">
                                  <button type="button" onClick={() => startEditTank(t)} className="btn-icon-edit" aria-label={`Edit ${t.name}`}><Pencil className="h-4 w-4" aria-hidden /></button>
                                  <button type="button" onClick={() => setDeleteTankTarget(t)} className="btn-icon-delete" aria-label={`Delete ${t.name}`}><Trash2 className="h-4 w-4" aria-hidden /></button>
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

        <div className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Daily dip entry</h2>
              <p className="card-subtitle">Measured stock vs system stock</p>
            </div>
          </div>
          <form onSubmit={handleAddDip} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="field">
              <label htmlFor="dip-date" className="label">Date</label>
              <DatePicker
                id="dip-date"
                value={dipDate}
                onChange={setDipDate}
                max={TODAY}
                aria-label="Dip entry date"
                floatingLabel={false}
              />
            </div>
            <div className="field">
              <label htmlFor="dip-tank" className="label">Tank</label>
              <select
                id="dip-tank"
                className="input"
                value={dipTankId}
                onChange={(e) => setDipTankId(e.target.value)}
                disabled={tanks.length === 0}
                required
              >
                <option value="" disabled>
                  {tanks.length === 0 ? "No tanks yet" : "Select tank"}
                </option>
                {tanks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {tanks.length === 0 && (
                <p className="field-hint">Add a tank in the register above to record dips.</p>
              )}
            </div>
            <div className="field">
              <label htmlFor="dip-reading" className="label">Dip reading</label>
              <input
                id="dip-reading"
                type="number"
                step="any"
                min="0"
                className="input"
                value={dipReading}
                onChange={(e) => setDipReading(e.target.value)}
                placeholder="Reading from the dip stick"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="dip-actual-qty" className="label">Actual quantity (litres)</label>
              <input
                id="dip-actual-qty"
                type="number"
                step="any"
                min="0"
                className="input"
                value={actualQty}
                onChange={(e) => setActualQty(e.target.value)}
                placeholder="Litres from the dip chart"
              />
            </div>
            </div>

            {/* The variance is computed against system stock, so show the figure
                it is computed against rather than only its result. */}
            {selectedTank && (
              <div className="rounded-[10px] bg-bg-sunken px-4 py-3 space-y-2.5 max-w-md" aria-live="polite">
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="text-ink-500">Expected (system stock)</span>
                  <span className="text-ink-900 font-medium">
                    <Litres value={expectedFromDip} />
                  </span>
                </div>
                {actualQty !== "" && (
                  <div className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-ink-500">Loss / Gain</span>
                    <Badge tone={lossOrGain >= 0 ? "success" : "danger"}>
                      <span className="num">{signed(lossOrGain)} L</span>
                    </Badge>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary min-h-[44px] sm:min-h-0"
              disabled={dipSaving || tanks.length === 0}
            >
              {dipSaving ? "Saving…" : "Save dip"}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Dip history</h2>
              <p className="card-subtitle">
                {dipDateLabel} · {dips.length} {dips.length === 1 ? "entry" : "entries"}
              </p>
            </div>
          </div>

          <div aria-live="polite" aria-busy={dipsLoading}>
            {dipsLoading ? (
              <FuelLoader size="sm" className="py-8 min-h-0" label="Loading dip entries" />
            ) : dips.length === 0 ? (
              <EmptyState
                title="No dips recorded"
                hint={`Nothing has been dipped for ${dipDateLabel} yet. Saved entries appear here.`}
              />
            ) : isMobile ? (
              <ul className="space-y-3 list-none p-0 m-0">
                {dips.map((d) => {
                  const tank = tanks.find((x) => x.id === d.tankId);
                  const isEditingDipRow = editingDip?.id === d.id;
                  return (
                    <li key={isEditingDipRow ? `${d.id}-edit` : d.id}>
                      {isEditingDipRow ? (
                        <div className="edit-card">
                          <p className="edit-card-title">Editing: {tank?.name ?? "Dip entry"}</p>
                          <form id={`dip-edit-${d.id}`} onSubmit={handleUpdateDip} className="space-y-4">
                            <div className="field">
                              <label htmlFor={`dip-edit-reading-${d.id}`} className="label">Dip reading</label>
                              <input id={`dip-edit-reading-${d.id}`} type="number" step="any" min="0" className="input" value={editDipReading} onChange={(e) => setEditDipReading(e.target.value)} required />
                            </div>
                            <div className="field">
                              <label htmlFor={`dip-edit-actual-${d.id}`} className="label">Actual quantity (litres)</label>
                              <input id={`dip-edit-actual-${d.id}`} form={`dip-edit-${d.id}`} type="number" step="any" min="0" className="input" value={editActualQty} onChange={(e) => setEditActualQty(e.target.value)} />
                            </div>
                            <div className="flex gap-3 pt-1">
                              <button form={`dip-edit-${d.id}`} type="submit" className="btn btn-primary flex-1 min-h-[48px]" disabled={dipSaving}>
                                <Check className="h-4 w-4" aria-hidden />
                                {dipSaving ? "Saving…" : "Save"}
                              </button>
                              <button type="button" className="btn btn-ghost flex-1 min-h-[48px]" onClick={() => setEditingDip(null)}>
                                <X className="h-4 w-4" aria-hidden />
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      ) : (
                        <div className="mobile-list-card">
                          <p className="mobile-list-card-title">{tank?.name ?? "Unknown tank"}</p>
                          <p className="mobile-list-card-row">
                            Dip reading: <span className="num font-medium">{formatNumber(d.dipReading)}</span>
                          </p>
                          <p className="mobile-list-card-row">
                            Actual: <Litres value={d.actualQuantity} className="font-medium" />
                          </p>
                          <p className="mobile-list-card-row">
                            <span>Loss / Gain: </span>
                            <span className={cn("num font-medium", d.lossOrGain >= 0 ? "text-success" : "text-danger")}>
                              {signed(d.lossOrGain)}<span className="unit">L</span>
                            </span>
                          </p>
                          {isAdmin && (
                            <div className="mobile-list-card-actions">
                              <button type="button" onClick={() => startEditDip(d)} className="btn btn-ghost min-h-[44px] flex-1">
                                <Pencil className="h-4 w-4" aria-hidden />
                                Edit
                              </button>
                              <button type="button" onClick={() => setDeleteDipTarget(d)} className="btn btn-danger-ghost min-h-[44px] flex-1">
                                <Trash2 className="h-4 w-4" aria-hidden />
                                Delete
                              </button>
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
                <table className="table">
                  <thead>
                    <tr>
                      {/* Headers never wrap: the edit row widens the input
                          columns, and a header breaking mid-label reads as a
                          layout fault rather than a mode change. */}
                      <th scope="col" className="whitespace-nowrap">Tank</th>
                      <th scope="col" className="cell-num whitespace-nowrap">Dip reading</th>
                      <th scope="col" className="cell-num whitespace-nowrap">Actual</th>
                      <th scope="col" className="cell-num whitespace-nowrap">Loss / Gain</th>
                      {isAdmin && <th scope="col" className="w-24 whitespace-nowrap">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dips.map((d) => {
                      const tank = tanks.find((x) => x.id === d.tankId);
                      const isEditingDipRow = editingDip?.id === d.id;
                      return (
                        <tr key={isEditingDipRow ? `${d.id}-edit` : d.id}>
                          {isEditingDipRow ? (
                            <>
                              <td className="font-medium text-ink-900">{tank?.name ?? "—"}</td>
                              <td>
                                <form id={`dip-edit-${d.id}`} onSubmit={handleUpdateDip} className="min-w-0">
                                  <input type="number" step="any" min="0" className="input h-9 text-[13px] w-full min-w-0 max-w-[150px] ml-auto block text-right" value={editDipReading} onChange={(e) => setEditDipReading(e.target.value)} placeholder="Dip" required aria-label="Dip reading" />
                                </form>
                              </td>
                              <td>
                                <input form={`dip-edit-${d.id}`} type="number" step="any" min="0" className="input h-9 text-[13px] w-full min-w-0 max-w-[150px] ml-auto block text-right" value={editActualQty} onChange={(e) => setEditActualQty(e.target.value)} placeholder="Actual" aria-label="Actual quantity in litres" />
                              </td>
                              <td className="cell-num text-ink-400">—</td>
                              {isAdmin && (
                                <td>
                                  <div className="flex gap-2">
                                    <button form={`dip-edit-${d.id}`} type="submit" className="btn-icon-primary" disabled={dipSaving} aria-label="Save dip entry"><Check className="h-4 w-4" aria-hidden /></button>
                                    <button type="button" className="btn-icon-cancel" onClick={() => setEditingDip(null)} aria-label="Cancel editing"><X className="h-4 w-4" aria-hidden /></button>
                                  </div>
                                </td>
                              )}
                            </>
                          ) : (
                            <>
                              <td className="font-medium text-ink-900">{tank?.name ?? "—"}</td>
                              <td className="cell-num num">{formatNumber(d.dipReading)}</td>
                              <td className="cell-num"><Litres value={d.actualQuantity} /></td>
                              <td className={cn("cell-num num font-medium whitespace-nowrap", d.lossOrGain >= 0 ? "text-success" : "text-danger")}>
                                {signed(d.lossOrGain)}<span className="unit">L</span>
                              </td>
                              {isAdmin && (
                                <td>
                                  <div className="flex gap-1">
                                    <button type="button" onClick={() => startEditDip(d)} className="btn-icon-edit" aria-label={`Edit dip for ${tank?.name ?? "tank"}`}><Pencil className="h-4 w-4" aria-hidden /></button>
                                    <button type="button" onClick={() => setDeleteDipTarget(d)} className="btn-icon-delete" aria-label={`Delete dip for ${tank?.name ?? "tank"}`}><Trash2 className="h-4 w-4" aria-hidden /></button>
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

      <ConfirmDialog
        open={!!deleteDipTarget}
        title="Delete dip entry"
        message={
          deleteDipTarget
            ? `Delete the ${dipDateLabel} dip for ${
                tanks.find((x) => x.id === deleteDipTarget.tankId)?.name ?? "this tank"
              }? The reading will no longer count towards stock reconciliation.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteDip}
        onCancel={() => setDeleteDipTarget(null)}
        loading={deletingDip}
      />
    </div>
  );
}

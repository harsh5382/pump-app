"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { useToast } from "@/components/ui/Toast";
import { Badge, EmptyState } from "@/components/ui";
import { getNozzles, getTanks, getFuelTypes, addNozzle, updateNozzle, deleteNozzle } from "@/lib/db";
import type { Nozzle, Tank, FuelType } from "@/types";
import { logAudit } from "@/lib/audit";
import ConfirmDialog from "@/components/ConfirmDialog";
import FuelLoader from "@/components/FuelLoader";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

/**
 * A dispenser can carry more than one nozzle, so machine numbers repeat by
 * design. Rows are ordered by machine, then by the fuel each nozzle draws, so
 * the list reads in the order someone walks the forecourt — and so a refetch
 * cannot silently reshuffle it.
 */
function sortNozzles(list: Nozzle[], fuelTypes: FuelType[]): Nozzle[] {
  const fuelName = (id: string) => fuelTypes.find((f) => f.id === id)?.name ?? "";
  return [...list].sort(
    (a, b) =>
      a.machineNumber.localeCompare(b.machineNumber, undefined, { numeric: true }) ||
      fuelName(a.fuelTypeId).localeCompare(fuelName(b.fuelTypeId)),
  );
}

/**
 * A nozzle may only point at a tank holding its own fuel. Whenever the fuel
 * changes, the tank has to follow — otherwise the select renders the filtered
 * list while state still holds the old tank, and saving writes a mismatch.
 */
function tankForFuel(fuelTypeId: string, tanks: Tank[], current: string): string {
  const eligible = tanks.filter((t) => t.fuelTypeId === fuelTypeId);
  return eligible.some((t) => t.id === current) ? current : (eligible[0]?.id ?? "");
}

export default function NozzlesPage() {
  const { profile } = useAuth();
  const { hasCapability, loading: orgLoading } = useOrg();
  const toast = useToast();
  const [nozzles, setNozzles] = useState<Nozzle[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [machineNumber, setMachineNumber] = useState("");
  const [fuelTypeId, setFuelTypeId] = useState("");
  const [tankId, setTankId] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingNozzle, setEditingNozzle] = useState<Nozzle | null>(null);
  const [editMachineNumber, setEditMachineNumber] = useState("");
  const [editFuelTypeId, setEditFuelTypeId] = useState("");
  const [editTankId, setEditTankId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Nozzle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = hasCapability("outlet.manage_assets");
  const isMobile = useMediaQuery("(max-width: 768px)");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [n, t, f] = await Promise.all([getNozzles(), getTanks(), getFuelTypes()]);
      setTanks(t);
      setFuelTypes(f);
      setNozzles(sortNozzles(n, f));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The nozzle register could not be loaded. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Every query runs inside the active outlet, so nothing may fire until the
  // org context has resolved one — otherwise the first render races it and
  // reports "no outlet selected" as a failure.
  useEffect(() => {
    if (orgLoading) return;
    load();
  }, [orgLoading, load]);

  const tanksForFuel = tanks.filter((t) => t.fuelTypeId === fuelTypeId);
  const tanksForEditFuel = tanks.filter((t) => t.fuelTypeId === editFuelTypeId);

  // Defaults are resolved when the form opens rather than when the register
  // loads, so the first fuel type and a tank that actually holds it are always
  // preselected against current data.
  function openAddForm() {
    const fuel = fuelTypeId || fuelTypes[0]?.id || "";
    setFuelTypeId(fuel);
    setTankId((prev) => tankForFuel(fuel, tanks, prev));
    setShowForm(true);
  }

  // Not a machine count: outlets label nozzles "MPD-1 / N1", so machineNumber
  // already carries the nozzle and every value is distinct. Tanks are the one
  // grouping the data genuinely supports.
  const tankCount = new Set(
    nozzles.filter((n) => tanks.some((t) => t.id === n.tankId)).map((n) => n.tankId),
  ).size;
  // A tank can be deleted while nozzles still point at it. Those rows would
  // otherwise render an em dash and read as merely blank.
  const orphanCount = nozzles.filter((n) => !tanks.some((t) => t.id === n.tankId)).length;
  const fuelSplit = fuelTypes
    .map((f) => ({ name: f.name, count: nozzles.filter((n) => n.fuelTypeId === f.id).length }))
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.name} ${entry.count}`)
    .join(" · ");

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
      setNozzles(sortNozzles(await getNozzles(), fuelTypes));
      setShowForm(false);
      toast.success("Nozzle added successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
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
      setNozzles(sortNozzles(await getNozzles(), fuelTypes));
      toast.success("Nozzle updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
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
      setNozzles(sortNozzles(await getNozzles(), fuelTypes));
      toast.success("Nozzle deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <FuelLoader label="Loading nozzles" />;
  }

  return (
    <div className="page">
      {/* Stacked on a phone: the heading needs the full measure, and a
          full-width action is the easier tap. */}
      <div className="page-head flex-col sm:flex-row">
        <div>
          {/* The topbar already says "Nozzles", so the heading carries what a
              manager actually checks: how many dispensing points there are and
              how they sit across the machines. */}
          <h1 className="page-title">
            {nozzles.length} {nozzles.length === 1 ? "nozzle" : "nozzles"}{" "}
            <em>
              — drawing from {tankCount} {tankCount === 1 ? "tank" : "tanks"}
            </em>
          </h1>
          <p className="page-sub">
            {nozzles.length === 0
              ? "Add a nozzle for every dispensing point so meter readings can be recorded against it."
              : fuelSplit || "No fuel type is assigned to these nozzles."}
          </p>
        </div>
        {isAdmin && !showForm && (
          <button
            type="button"
            className="btn btn-primary shrink-0 w-full sm:w-auto min-h-[44px] sm:min-h-0"
            onClick={openAddForm}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add nozzle
          </button>
        )}
      </div>

      {error && (
        <div className="banner banner-danger">
          <span className="flex-1">{error}</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {orphanCount > 0 && (
        <div className="banner">
          <span className="flex-1">
            {orphanCount === 1
              ? "One nozzle points at a tank that no longer exists."
              : `${orphanCount} nozzles point at a tank that no longer exists.`}{" "}
            Re-assign {orphanCount === 1 ? "it" : "them"} so meter readings keep reconciling
            against stock.
          </span>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Nozzle register</h2>
            <p className="card-subtitle">
              {nozzles.length === 0 ? "Nothing set up yet" : "Ordered by machine"}
            </p>
          </div>
        </div>

        {showForm && isAdmin && (
          <div className="edit-card mb-6">
            <p className="edit-card-title">New nozzle</p>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="field">
                  <label htmlFor="nozzle-machine" className="label">Machine number</label>
                  <input
                    id="nozzle-machine"
                    className="input"
                    value={machineNumber}
                    onChange={(e) => setMachineNumber(e.target.value)}
                    placeholder="e.g. 1"
                    required
                  />
                  <p className="field-hint">One machine can carry several nozzles.</p>
                </div>
                <div className="field">
                  <label htmlFor="nozzle-fuel-type" className="label">Fuel type</label>
                  <select
                    id="nozzle-fuel-type"
                    className="input"
                    value={fuelTypeId}
                    onChange={(e) => {
                      setFuelTypeId(e.target.value);
                      setTankId((prev) => tankForFuel(e.target.value, tanks, prev));
                    }}
                    required
                  >
                    <option value="" disabled>
                      {fuelTypes.length === 0 ? "No fuel types — add one first" : "Select fuel type"}
                    </option>
                    {fuelTypes.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  {fuelTypes.length === 0 && (
                    <p className="field-hint">Fuel types are managed on the Fuel Types page.</p>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="nozzle-tank" className="label">Tank connected</label>
                  <select
                    id="nozzle-tank"
                    className="input"
                    value={tankId}
                    onChange={(e) => setTankId(e.target.value)}
                    disabled={tanksForFuel.length === 0}
                    required
                  >
                    <option value="" disabled>
                      {tanksForFuel.length === 0 ? "No tank holds this fuel" : "Select tank"}
                    </option>
                    {tanksForFuel.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {fuelTypeId && tanksForFuel.length === 0 && (
                    <p className="field-hint">
                      Add a tank for this fuel on the Tanks page, then come back.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="btn btn-primary min-h-[44px] sm:min-h-0"
                  disabled={saving || fuelTypes.length === 0 || tanksForFuel.length === 0}
                >
                  {saving ? "Saving…" : "Save nozzle"}
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

        {nozzles.length === 0 ? (
          <EmptyState
            title="No nozzles yet"
            hint={
              isAdmin
                ? "Register each dispensing nozzle against its machine and tank to start recording meter readings."
                : "Ask an outlet manager to register the dispensing nozzles for this outlet."
            }
            action={
              isAdmin && !showForm ? (
                <button type="button" className="btn btn-primary" onClick={openAddForm}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add nozzle
                </button>
              ) : undefined
            }
          />
        ) : isMobile ? (
          <ul className="space-y-3 list-none p-0 m-0">
            {nozzles.map((n) => {
              const ft = fuelTypes.find((f) => f.id === n.fuelTypeId);
              const tank = tanks.find((t) => t.id === n.tankId);
              const isEditing = editingNozzle?.id === n.id;
              return (
                // Keyed by mode as well as id — see the table below.
                <li key={isEditing ? `${n.id}-edit` : n.id}>
                  {isEditing ? (
                    <div className="edit-card">
                      <p className="edit-card-title">Editing: Machine {n.machineNumber}</p>
                      <form id={`nozzle-edit-${n.id}`} onSubmit={handleUpdate} className="space-y-4">
                        <div className="field">
                          <label htmlFor={`nozzle-edit-no-${n.id}`} className="label">Machine number</label>
                          <input id={`nozzle-edit-no-${n.id}`} className="input" value={editMachineNumber} onChange={(e) => setEditMachineNumber(e.target.value)} placeholder="e.g. 1" required />
                        </div>
                        <div className="field">
                          <label htmlFor={`nozzle-edit-fuel-${n.id}`} className="label">Fuel type</label>
                          <select
                            id={`nozzle-edit-fuel-${n.id}`}
                            form={`nozzle-edit-${n.id}`}
                            className="input"
                            value={editFuelTypeId}
                            onChange={(e) => {
                              setEditFuelTypeId(e.target.value);
                              setEditTankId((prev) => tankForFuel(e.target.value, tanks, prev));
                            }}
                            required
                          >
                            {fuelTypes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                        </div>
                        <div className="field">
                          <label htmlFor={`nozzle-edit-tank-${n.id}`} className="label">Tank connected</label>
                          <select id={`nozzle-edit-tank-${n.id}`} form={`nozzle-edit-${n.id}`} className="input" value={editTankId} onChange={(e) => setEditTankId(e.target.value)} disabled={tanksForEditFuel.length === 0} required>
                            <option value="" disabled>
                              {tanksForEditFuel.length === 0 ? "No tank holds this fuel" : "Select tank"}
                            </option>
                            {tanksForEditFuel.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          {tanksForEditFuel.length === 0 && (
                            <p className="field-hint">Add a tank for this fuel on the Tanks page first.</p>
                          )}
                        </div>
                        <div className="flex gap-3 pt-1">
                          <button form={`nozzle-edit-${n.id}`} type="submit" className="btn btn-primary flex-1 min-h-[48px]" disabled={saving || !editTankId}>
                            <Check className="h-4 w-4" aria-hidden />
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button type="button" className="btn btn-ghost flex-1 min-h-[48px]" onClick={() => setEditingNozzle(null)}>
                            <X className="h-4 w-4" aria-hidden />
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="mobile-list-card">
                      <p className="mobile-list-card-title">Machine {n.machineNumber}</p>
                      <p className="mobile-list-card-row">Fuel type: {ft?.name ?? "—"}</p>
                      <p className="mobile-list-card-row">
                        Tank: {tank ? tank.name : <Badge tone="danger">Tank removed</Badge>}
                      </p>
                      {isAdmin && (
                        <div className="mobile-list-card-actions">
                          <button type="button" onClick={() => startEdit(n)} className="btn btn-ghost min-h-[44px] flex-1">
                            <Pencil className="h-4 w-4" aria-hidden />
                            Edit
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(n)} className="btn btn-danger-ghost min-h-[44px] flex-1">
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
                  {/* Headers never wrap: the edit row widens the input columns,
                      and a header breaking mid-label reads as a layout fault
                      rather than a mode change. */}
                  <th scope="col" className="whitespace-nowrap">Machine no.</th>
                  <th scope="col" className="whitespace-nowrap">Fuel type</th>
                  <th scope="col" className="whitespace-nowrap">Tank</th>
                  {isAdmin && <th scope="col" className="w-24 whitespace-nowrap">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {nozzles.map((n) => {
                  const ft = fuelTypes.find((f) => f.id === n.fuelTypeId);
                  const tank = tanks.find((t) => t.id === n.tankId);
                  const isEditing = editingNozzle?.id === n.id;
                  return (
                    // The key carries the mode so React replaces the row's
                    // nodes instead of mutating them in place. Without it the
                    // Edit button becomes a submit button on the very click
                    // that opened the editor, and the browser runs that
                    // button's activation — saving the row instantly.
                    <tr key={isEditing ? `${n.id}-edit` : n.id}>
                      {isEditing ? (
                        <>
                          <td>
                            <form id={`nozzle-edit-${n.id}`} onSubmit={handleUpdate} className="min-w-0">
                              <input className="input h-9 text-[13px] w-full min-w-0" value={editMachineNumber} onChange={(e) => setEditMachineNumber(e.target.value)} placeholder="No." required aria-label="Machine number" />
                            </form>
                          </td>
                          <td>
                            <select
                              form={`nozzle-edit-${n.id}`}
                              className="input h-9 text-[13px] w-full min-w-0"
                              value={editFuelTypeId}
                              onChange={(e) => {
                                setEditFuelTypeId(e.target.value);
                                setEditTankId((prev) => tankForFuel(e.target.value, tanks, prev));
                              }}
                              required
                              aria-label="Fuel type"
                            >
                              {fuelTypes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                          </td>
                          <td>
                            <select form={`nozzle-edit-${n.id}`} className="input h-9 text-[13px] w-full min-w-0" value={editTankId} onChange={(e) => setEditTankId(e.target.value)} disabled={tanksForEditFuel.length === 0} required aria-label="Tank connected">
                              <option value="" disabled>
                                {tanksForEditFuel.length === 0 ? "No tank holds this fuel" : "Select tank"}
                              </option>
                              {tanksForEditFuel.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </td>
                          {isAdmin && (
                            <td>
                              <div className="flex gap-2">
                                <button form={`nozzle-edit-${n.id}`} type="submit" className="btn-icon-primary" disabled={saving || !editTankId} aria-label="Save nozzle"><Check className="h-4 w-4" aria-hidden /></button>
                                <button type="button" className="btn-icon-cancel" onClick={() => setEditingNozzle(null)} aria-label="Cancel editing"><X className="h-4 w-4" aria-hidden /></button>
                              </div>
                            </td>
                          )}
                        </>
                      ) : (
                        <>
                          <td className="font-medium text-ink-900">{n.machineNumber}</td>
                          <td>{ft?.name ?? "—"}</td>
                          <td>{tank ? tank.name : <Badge tone="danger">Tank removed</Badge>}</td>
                          {isAdmin && (
                            <td>
                              <div className="flex gap-1">
                                <button type="button" onClick={() => startEdit(n)} className="btn-icon-edit" aria-label={`Edit machine ${n.machineNumber}`}><Pencil className="h-4 w-4" aria-hidden /></button>
                                <button type="button" onClick={() => setDeleteTarget(n)} className="btn-icon-delete" aria-label={`Delete machine ${n.machineNumber}`}><Trash2 className="h-4 w-4" aria-hidden /></button>
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
        title="Delete nozzle"
        message={
          deleteTarget
            ? `Delete the ${
                fuelTypes.find((f) => f.id === deleteTarget.fuelTypeId)?.name ?? "unassigned"
              } nozzle on machine ${deleteTarget.machineNumber}? Meter readings recorded against it will no longer reconcile.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui";
import { getTankerDeliveriesByDate, addTankerDelivery, updateTankerDelivery, deleteTankerDelivery, getTanks, getFuelTypes } from "@/lib/db";
import type { TankerDelivery, Tank, FuelType } from "@/types";
import { formatNumber, formatDate } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import ConfirmDialog from "@/components/ConfirmDialog";
import DatePicker from "@/components/DatePicker";
import FuelLoader from "@/components/FuelLoader";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { Check, Pencil, Trash2, Truck, X } from "lucide-react";

const today = new Date().toISOString().split("T")[0];

/** A delivery may only fill a tank holding its own fuel — mirrors the same rule on Nozzles. */
function tankForFuel(fuelTypeId: string, tanks: Tank[], current: string): string {
  const eligible = tanks.filter((t) => t.fuelTypeId === fuelTypeId);
  return eligible.some((t) => t.id === current) ? current : (eligible[0]?.id ?? "");
}

export default function TankerDeliveriesPage() {
  const { profile } = useAuth();
  const { hasCapability, loading: orgLoading } = useOrg();
  const toast = useToast();
  const [deliveries, setDeliveries] = useState<TankerDelivery[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deliveriesLoading, setDeliveriesLoading] = useState(true);
  const [company, setCompany] = useState("");
  const [invoice, setInvoice] = useState("");
  const [fuelTypeId, setFuelTypeId] = useState("");
  const [tankId, setTankId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<TankerDelivery | null>(null);
  const [editCompany, setEditCompany] = useState("");
  const [editInvoice, setEditInvoice] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TankerDelivery | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isAdmin = hasCapability("delivery.manage");
  const isMobile = useMediaQuery("(max-width: 768px)");

  const loadAssets = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    Promise.all([getTanks(), getFuelTypes()])
      .then(([t, f]) => {
        setTanks(t);
        setFuelTypes(f);
        setFuelTypeId((prev) => prev || f[0]?.id || "");
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  // Every query runs inside the active outlet, so nothing may fire until the
  // org context has resolved one — otherwise the first render races it and
  // reports an empty outlet as a failure.
  useEffect(() => {
    if (orgLoading) return;
    loadAssets();
  }, [orgLoading, loadAssets]);

  // Keeps the tank aligned to one that actually holds the selected fuel,
  // both right after assets load and whenever the fuel type changes.
  useEffect(() => {
    setTankId((prev) => tankForFuel(fuelTypeId, tanks, prev));
  }, [fuelTypeId, tanks]);

  useEffect(() => {
    if (orgLoading) return;
    let stale = false;
    setDeliveriesLoading(true);
    getTankerDeliveriesByDate(date)
      .then((d) => {
        if (!stale) setDeliveries(d);
      })
      .catch(() => {
        if (!stale) toast.error("Couldn't load deliveries for this date.");
      })
      .finally(() => {
        if (!stale) setDeliveriesLoading(false);
      });
    // A fast run of date changes must not let an older response overwrite a
    // newer one — the list would then show the wrong day's deliveries.
    return () => {
      stale = true;
    };
  }, [date, orgLoading, toast]);

  const tanksForFuel = tanks.filter((t) => t.fuelTypeId === fuelTypeId);
  const totalQuantity = deliveries.reduce((sum, d) => sum + d.quantityLiters, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !invoice.trim() || !fuelTypeId || !tankId || !quantity || !profile) return;
    const tank = tanksForFuel.find((t) => t.id === tankId) ?? tanks.find((t) => t.id === tankId);
    if (!tank) return;
    setSaving(true);
    try {
      await addTankerDelivery(
        {
          date,
          tankerCompany: company.trim(),
          invoiceNumber: invoice.trim(),
          fuelTypeId,
          quantityLiters: Number(quantity),
          enteredBy: profile.email,
        },
        tankId
      );
      await logAudit(profile.uid, profile.email, "CREATE", "tankerDelivery", `${company} - ${quantity} L`);
      setCompany("");
      setInvoice("");
      setQuantity("");
      setDeliveries(await getTankerDeliveriesByDate(date));
      toast.success("Tanker delivery recorded successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(d: TankerDelivery) {
    setEditing(d);
    setEditCompany(d.tankerCompany);
    setEditInvoice(d.invoiceNumber);
    setEditQuantity(String(d.quantityLiters));
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !editCompany.trim() || !editInvoice.trim() || !editQuantity) return;
    setSaving(true);
    try {
      await updateTankerDelivery(editing.id, {
        tankerCompany: editCompany.trim(),
        invoiceNumber: editInvoice.trim(),
        quantityLiters: Number(editQuantity),
      });
      if (profile) await logAudit(profile.uid, profile.email, "UPDATE", "tankerDelivery", editing.tankerCompany);
      setEditing(null);
      setDeliveries(await getTankerDeliveriesByDate(date));
      toast.success("Delivery updated.");
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
      await deleteTankerDelivery(deleteTarget.id);
      if (profile) await logAudit(profile.uid, profile.email, "DELETE", "tankerDelivery", deleteTarget.tankerCompany);
      setDeleteTarget(null);
      setDeliveries(await getTankerDeliveriesByDate(date));
      toast.success("Delivery deleted. Tank stock was adjusted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <FuelLoader label="Loading tanker deliveries" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Tanker Deliveries</h1>
        <p className="page-sub max-w-[68ch]">
          Record each tanker delivery as it arrives — the fuel is added straight to the tank&apos;s stock.
        </p>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Record delivery</h2>
            <p className="card-subtitle">Updates tank stock immediately</p>
          </div>
        </div>

        {loadError ? (
          <EmptyState
            icon={<Truck className="h-7 w-7" />}
            title="Couldn't load tanks and fuel types"
            hint="These are needed to record a delivery. Check your connection and try again."
            action={
              <button type="button" className="btn btn-primary" onClick={loadAssets}>
                Try again
              </button>
            }
          />
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="field">
              <label htmlFor="tanker-date" className="label">Date</label>
              <DatePicker
                id="tanker-date"
                value={date}
                onChange={setDate}
                aria-label="Delivery date"
                floatingLabel={false}
              />
            </div>
            <div className="field">
              <label htmlFor="tanker-company" className="label">Tanker company</label>
              <input
                id="tanker-company"
                className="input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
                required
                aria-label="Tanker company name"
              />
            </div>
            <div className="field">
              <label htmlFor="tanker-invoice" className="label">Invoice number</label>
              <input
                id="tanker-invoice"
                className="input"
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
                required
                aria-label="Invoice number"
              />
            </div>
            <div className="field">
              <label htmlFor="tanker-fuel-type" className="label">Fuel type</label>
              <select
                id="tanker-fuel-type"
                className="input"
                value={fuelTypeId}
                onChange={(e) => setFuelTypeId(e.target.value)}
                required
                aria-label="Fuel type"
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
              <label htmlFor="tanker-tank" className="label">Tank</label>
              <select
                id="tanker-tank"
                className="input"
                value={tankId}
                onChange={(e) => setTankId(e.target.value)}
                disabled={tanksForFuel.length === 0}
                required
                aria-label="Tank"
              >
                <option value="" disabled>
                  {tanksForFuel.length === 0 ? "No tank holds this fuel" : "Select tank"}
                </option>
                {tanksForFuel.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {fuelTypeId && tanksForFuel.length === 0 && (
                <p className="field-hint">Add a tank for this fuel on the Tanks page, then come back.</p>
              )}
            </div>
            <div className="field">
              <label htmlFor="tanker-quantity" className="label">Quantity received (L)</label>
              <input
                id="tanker-quantity"
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                className="input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                required
                aria-label="Quantity received in liters"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="btn btn-primary min-h-[44px] sm:min-h-0"
                disabled={saving || fuelTypes.length === 0 || tanksForFuel.length === 0}
              >
                {saving ? "Saving…" : "Add delivery"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">Deliveries for {formatDate(date)}</h2>
            <p className="card-subtitle" aria-live="polite">
              {deliveries.length === 0
                ? "No deliveries"
                : `${deliveries.length} ${deliveries.length === 1 ? "delivery" : "deliveries"} · ${formatNumber(totalQuantity)} L received`}
            </p>
          </div>
        </div>

        {deliveries.length === 0 ? (
          <EmptyState
            icon={<Truck className="h-7 w-7" />}
            title="No deliveries for this date"
            hint="Record a tanker delivery above and it will be listed here."
          />
        ) : isMobile ? (
          <ul
            className="space-y-3 list-none p-0 m-0 transition-opacity"
            aria-busy={deliveriesLoading}
            style={deliveriesLoading ? { opacity: 0.55 } : undefined}
          >
            {deliveries.map((d) => {
              const ft = fuelTypes.find((f) => f.id === d.fuelTypeId);
              const isEditingRow = editing?.id === d.id;
              return (
                // Keyed by mode as well as id — see the table below.
                <li key={isEditingRow ? `${d.id}-edit` : d.id}>
                  {isEditingRow ? (
                    <div className="edit-card">
                      <p className="edit-card-title">Editing: {d.tankerCompany}</p>
                      <form id={`delivery-edit-${d.id}`} onSubmit={handleUpdate} className="space-y-4">
                        <div className="field">
                          <label htmlFor={`delivery-edit-company-${d.id}`} className="label">Company</label>
                          <input id={`delivery-edit-company-${d.id}`} className="input" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="Company" required aria-label="Tanker company" />
                        </div>
                        <div className="field">
                          <label htmlFor={`delivery-edit-invoice-${d.id}`} className="label">Invoice</label>
                          <input id={`delivery-edit-invoice-${d.id}`} form={`delivery-edit-${d.id}`} className="input" value={editInvoice} onChange={(e) => setEditInvoice(e.target.value)} placeholder="Invoice" required aria-label="Invoice number" />
                        </div>
                        <p className="field-hint">Fuel: {ft?.name ?? "—"} (not editable)</p>
                        <div className="field">
                          <label htmlFor={`delivery-edit-qty-${d.id}`} className="label">Quantity (L)</label>
                          <input id={`delivery-edit-qty-${d.id}`} form={`delivery-edit-${d.id}`} type="number" step="any" min="0" inputMode="decimal" className="input" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} onWheel={(e) => e.currentTarget.blur()} required aria-label="Quantity (L)" />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button form={`delivery-edit-${d.id}`} type="submit" className="btn btn-primary flex-1 min-h-[48px]" disabled={saving}>
                            <Check className="h-4 w-4" aria-hidden />
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button type="button" className="btn btn-ghost flex-1 min-h-[48px]" onClick={() => setEditing(null)}>
                            <X className="h-4 w-4" aria-hidden />
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="mobile-list-card">
                      <p className="mobile-list-card-title">{d.tankerCompany}</p>
                      <p className="mobile-list-card-row">Invoice: {d.invoiceNumber}</p>
                      <p className="mobile-list-card-row">Fuel: {ft?.name ?? "—"}</p>
                      <p className="mobile-list-card-row">
                        Quantity:{" "}
                        <span className="num font-medium text-ink-900">
                          {formatNumber(d.quantityLiters)}
                          <span className="unit">L</span>
                        </span>
                      </p>
                      {isAdmin && (
                        <div className="mobile-list-card-actions">
                          <button type="button" onClick={() => startEdit(d)} className="btn btn-ghost min-h-[44px] flex-1">
                            <Pencil className="h-4 w-4" aria-hidden />
                            Edit
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(d)} className="btn btn-danger-ghost min-h-[44px] flex-1">
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
            <li>
              <div className="mobile-list-card mobile-list-card-total">
                <p className="mobile-list-card-row flex items-center justify-between">
                  <span>Total received</span>
                  <span className="num font-medium text-ink-900">
                    {formatNumber(totalQuantity)}
                    <span className="unit">L</span>
                  </span>
                </p>
              </div>
            </li>
          </ul>
        ) : (
          <div
            className="table-container transition-opacity"
            aria-busy={deliveriesLoading}
            style={deliveriesLoading ? { opacity: 0.55 } : undefined}
          >
            <table className="table">
              <thead>
                <tr>
                  <th className="whitespace-nowrap">Company</th>
                  <th className="whitespace-nowrap">Invoice</th>
                  <th className="whitespace-nowrap">Fuel</th>
                  <th className="cell-num whitespace-nowrap">Quantity</th>
                  {isAdmin && (
                    <th className="w-24 whitespace-nowrap">
                      <span className="sr-only">Row actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => {
                  const ft = fuelTypes.find((f) => f.id === d.fuelTypeId);
                  const isEditingRow = editing?.id === d.id;
                  return (
                    // The key carries the mode so React replaces the row's
                    // nodes instead of mutating them in place. Without it the
                    // Edit button becomes a submit button on the very click
                    // that opened the editor, and the browser runs that
                    // button's activation — saving the row instantly.
                    <tr key={isEditingRow ? `${d.id}-edit` : d.id}>
                      {isEditingRow ? (
                        <>
                          <td>
                            <form id={`delivery-edit-${d.id}`} onSubmit={handleUpdate} className="min-w-0">
                              <input className="input h-9 text-[13px] w-full min-w-0" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="Company" required aria-label="Tanker company" />
                            </form>
                          </td>
                          <td>
                            <input form={`delivery-edit-${d.id}`} className="input h-9 text-[13px] w-full min-w-0" value={editInvoice} onChange={(e) => setEditInvoice(e.target.value)} placeholder="Invoice" required aria-label="Invoice number" />
                          </td>
                          <td className="whitespace-nowrap text-ink-500">{ft?.name ?? "—"}</td>
                          <td>
                            <input
                              form={`delivery-edit-${d.id}`}
                              type="number"
                              step="any"
                              min="0"
                              inputMode="decimal"
                              className="input h-9 text-[13px] text-right font-mono tabular-nums w-full min-w-0"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              required
                              aria-label="Quantity (L)"
                            />
                          </td>
                          {isAdmin && (
                            <td>
                              <div className="flex gap-2">
                                <button form={`delivery-edit-${d.id}`} type="submit" className="btn-icon-primary" disabled={saving} aria-label="Save delivery"><Check className="h-4 w-4" aria-hidden /></button>
                                <button type="button" className="btn-icon-cancel" onClick={() => setEditing(null)} aria-label="Cancel editing"><X className="h-4 w-4" aria-hidden /></button>
                              </div>
                            </td>
                          )}
                        </>
                      ) : (
                        <>
                          <td className="font-medium text-ink-900">{d.tankerCompany}</td>
                          <td>{d.invoiceNumber}</td>
                          <td className="whitespace-nowrap">{ft?.name ?? "—"}</td>
                          <td className="cell-num whitespace-nowrap">
                            <span className="num">
                              {formatNumber(d.quantityLiters)}
                              <span className="unit">L</span>
                            </span>
                          </td>
                          {isAdmin && (
                            <td>
                              <div className="flex items-center justify-end gap-1">
                                <button type="button" onClick={() => startEdit(d)} className="btn-icon-edit" aria-label={`Edit delivery from ${d.tankerCompany}`}><Pencil className="h-4 w-4" aria-hidden /></button>
                                <button type="button" onClick={() => setDeleteTarget(d)} className="btn-icon-delete" aria-label={`Delete delivery from ${d.tankerCompany}`}><Trash2 className="h-4 w-4" aria-hidden /></button>
                              </div>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="cell-num">Total received</td>
                  <td className="cell-num whitespace-nowrap">
                    <span className="num">
                      {formatNumber(totalQuantity)}
                      <span className="unit">L</span>
                    </span>
                  </td>
                  {isAdmin && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete tanker delivery"
        message={deleteTarget ? `Delete "${deleteTarget.tankerCompany}" (${formatNumber(deleteTarget.quantityLiters)} L)? Tank stock will be reduced.` : ""}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

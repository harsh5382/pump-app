"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTankerDeliveriesByDate, addTankerDelivery, updateTankerDelivery, deleteTankerDelivery, getTanks, getFuelTypes } from "@/lib/db";
import type { TankerDelivery, Tank, FuelType } from "@/types";
import { formatNumber, formatDate } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Pencil, Trash2, Check, X } from "lucide-react";

const today = new Date().toISOString().split("T")[0];

export default function TankerDeliveriesPage() {
  const { profile, hasRole } = useAuth();
  const [deliveries, setDeliveries] = useState<TankerDelivery[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState("");
  const [invoice, setInvoice] = useState("");
  const [fuelTypeId, setFuelTypeId] = useState("");
  const [tankId, setTankId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [editing, setEditing] = useState<TankerDelivery | null>(null);
  const [editCompany, setEditCompany] = useState("");
  const [editInvoice, setEditInvoice] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TankerDelivery | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isAdmin = hasRole("admin");

  useEffect(() => {
    Promise.all([getTanks(), getFuelTypes()]).then(([t, f]) => {
      setTanks(t);
      setFuelTypes(f);
      if (f.length && !fuelTypeId) setFuelTypeId(f[0].id);
      if (t.length && !tankId) setTankId(t[0].id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getTankerDeliveriesByDate(date).then(setDeliveries);
  }, [date]);

  const tanksForFuel = tanks.filter((t) => t.fuelTypeId === fuelTypeId);

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
      setSuccessMessage("Tanker delivery recorded successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
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
      setSuccessMessage("Delivery updated.");
      setTimeout(() => setSuccessMessage(""), 3000);
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
      setSuccessMessage("Delivery deleted. Tank stock was adjusted.");
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
      <h1 className="page-title">Tanker Delivery Entry</h1>
      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      )}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Record delivery</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label htmlFor="tanker-date" className="label">Date</label>
            <input
              id="tanker-date"
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Delivery date"
            />
          </div>
          <div>
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
          <div>
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
          <div>
            <label htmlFor="tanker-fuel-type" className="label">Fuel type</label>
            <select
              id="tanker-fuel-type"
              className="input"
              value={fuelTypeId}
              onChange={(e) => setFuelTypeId(e.target.value)}
              aria-label="Fuel type"
            >
              {fuelTypes.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tanker-tank" className="label">Tank</label>
            <select id="tanker-tank" className="input" value={tankId} onChange={(e) => setTankId(e.target.value)} aria-label="Tank">
              {tanksForFuel.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tanker-quantity" className="label">Quantity received (L)</label>
            <input
              id="tanker-quantity"
              type="number"
              step="any"
              min="0"
              className="input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              aria-label="Quantity received in liters"
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Add delivery (stock will be updated)"}
            </button>
          </div>
        </form>
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Deliveries for {formatDate(date)}</h2>
        {deliveries.length === 0 ? (
          <p className="text-slate-500">No deliveries for this date.</p>
        ) : (
          <div className="table-container">
            <table className="table-default">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Invoice</th>
                  <th>Fuel</th>
                  <th>Quantity</th>
                  {isAdmin && <th className="w-24">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => {
                  const ft = fuelTypes.find((f) => f.id === d.fuelTypeId);
                  const isEditingRow = editing?.id === d.id;
                  return (
                    <tr key={d.id}>
                      {isEditingRow ? (
                        <>
                          <td className="align-middle">
                            <form id={`delivery-edit-${d.id}`} onSubmit={handleUpdate} className="min-w-0">
                              <input className="input py-1.5 text-sm w-full min-w-0" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="Company" required aria-label="Tanker company" />
                            </form>
                          </td>
                          <td className="align-middle">
                            <input form={`delivery-edit-${d.id}`} className="input py-1.5 text-sm w-full min-w-0" value={editInvoice} onChange={(e) => setEditInvoice(e.target.value)} placeholder="Invoice" required aria-label="Invoice number" />
                          </td>
                          <td className="align-middle text-slate-500">{ft?.name ?? "—"}</td>
                          <td className="align-middle">
                            <input form={`delivery-edit-${d.id}`} type="number" step="any" min="0" className="input py-1.5 text-sm w-full min-w-0" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} required aria-label="Quantity (L)" />
                          </td>
                          {isAdmin && (
                            <td className="align-middle">
                              <button form={`delivery-edit-${d.id}`} type="submit" className="p-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 inline-flex items-center justify-center mr-1" disabled={saving} aria-label="Save"><Check className="h-4 w-4" /></button>
                              <button type="button" className="p-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 inline-flex items-center justify-center" onClick={() => setEditing(null)} aria-label="Cancel"><X className="h-4 w-4" /></button>
                            </td>
                          )}
                        </>
                      ) : (
                        <>
                          <td>{d.tankerCompany}</td>
                          <td>{d.invoiceNumber}</td>
                          <td>{ft?.name ?? "-"}</td>
                          <td>{formatNumber(d.quantityLiters)} L</td>
                          {isAdmin && (
                            <td>
                              <div className="flex gap-1">
                                <button type="button" onClick={() => startEdit(d)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-sky-600" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                                <button type="button" onClick={() => setDeleteTarget(d)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
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

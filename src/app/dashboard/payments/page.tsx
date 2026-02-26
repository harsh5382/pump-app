"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPaymentsByDate, addPayment, updatePayment, deletePayment } from "@/lib/db";
import type { PaymentEntry, PaymentType } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Pencil, Trash2, Check, X } from "lucide-react";

const today = new Date().toISOString().split("T")[0];
const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "credit_card", label: "Credit Card" },
  { value: "fleet_card", label: "Fleet Card" },
  { value: "credit_customer", label: "Credit Customer" },
];

export default function PaymentsPage() {
  const { profile, hasRole } = useAuth();
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [paymentType, setPaymentType] = useState<PaymentType>("cash");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [expectedRevenue, setExpectedRevenue] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editing, setEditing] = useState<PaymentEntry | null>(null);
  const [editType, setEditType] = useState<PaymentType>("cash");
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PaymentEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isAdmin = hasRole("admin");

  useEffect(() => {
    getPaymentsByDate(date).then(setPayments).finally(() => setLoading(false));
  }, [date]);

  const totalEntered = payments.reduce((s, p) => s + p.amount, 0);
  const expected = Number(expectedRevenue);
  const mismatch = expectedRevenue !== "" && expected > 0 && Math.abs(totalEntered - expected) > 0.01;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !profile) return;
    setSaving(true);
    try {
      const newPayment = await addPayment({
        date,
        paymentType,
        amount: Number(amount),
        notes: notes.trim() || "",
        enteredBy: profile.email,
      });
      setAmount("");
      setNotes("");
      setPayments((prev) => [...prev, newPayment]);
      setSuccessMessage("Payment added successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(p: PaymentEntry) {
    setEditing(p);
    setEditType(p.paymentType);
    setEditAmount(String(p.amount));
    setEditNotes(p.notes ?? "");
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !editAmount) return;
    setSaving(true);
    try {
      await updatePayment(editing.id, {
        paymentType: editType,
        amount: Number(editAmount),
        notes: editNotes.trim() || undefined,
      });
      setEditing(null);
      setPayments(await getPaymentsByDate(date));
      setSuccessMessage("Payment updated.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePayment(deleteTarget.id);
      setDeleteTarget(null);
      setPayments(await getPaymentsByDate(date));
      setSuccessMessage("Payment deleted.");
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
      <h1 className="page-title">Payment Tracking</h1>
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      )}
      <div className="card">
        <label htmlFor="payment-date" className="label">Date</label>
        <input
          id="payment-date"
          type="date"
          className="input max-w-xs"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Payment date"
        />
      </div>
      <div className="card">
        <label htmlFor="payment-expected-revenue" className="label">
          Expected total revenue for this date (₹)
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Optional. Enter the total you expect (e.g. from sales/meter). The app will compare it to the sum of all payment entries below and warn if they differ.
        </p>
        <input
          id="payment-expected-revenue"
          type="number"
          step="0.01"
          min="0"
          className="input max-w-xs"
          value={expectedRevenue}
          onChange={(e) => setExpectedRevenue(e.target.value)}
          placeholder="e.g. 5000"
          aria-label="Expected total revenue for this date in rupees"
        />
      </div>
      {mismatch && (
        <div className="card border-amber-300 bg-amber-50">
          <p className="font-medium text-amber-800">Payment mismatch</p>
          <p className="text-sm text-amber-700">
            Total payments entered ({formatCurrency(totalEntered)}) do not match expected revenue ({formatCurrency(expected)}). Please verify.
          </p>
        </div>
      )}
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Add payment entry</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end max-w-2xl">
          <div>
            <label htmlFor="payment-type" className="label">Type</label>
            <select
              id="payment-type"
              className="input min-w-[160px]"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as PaymentType)}
              aria-label="Payment type"
            >
              {PAYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="payment-amount" className="label">Amount (₹)</label>
            <input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0"
              className="input w-32"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              aria-label="Amount in rupees"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label htmlFor="payment-notes" className="label">Notes</label>
            <input
              id="payment-notes"
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              aria-label="Payment notes"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Add"}
          </button>
        </form>
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Payments for {formatDate(date)}</h2>
        <p className="text-sm text-slate-600 mb-2">
          Total entered: <strong>{formatCurrency(totalEntered)}</strong>
        </p>
        <div className="table-container">
          <table className="table-default">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Notes</th>
                {isAdmin && <th className="w-24">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const isEditingRow = editing?.id === p.id;
                return (
                  <tr key={p.id}>
                    {isEditingRow ? (
                      <>
                        <td className="align-middle">
                          <form id={`payment-edit-${p.id}`} onSubmit={handleUpdate} className="min-w-0">
                            <select className="input py-1.5 text-sm w-full min-w-0" value={editType} onChange={(e) => setEditType(e.target.value as PaymentType)} aria-label="Payment type">
                              {PAYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </form>
                        </td>
                        <td className="align-middle">
                          <input form={`payment-edit-${p.id}`} type="number" step="0.01" min="0" className="input py-1.5 text-sm w-full min-w-0" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} required aria-label="Amount (₹)" />
                        </td>
                        <td className="align-middle">
                          <input form={`payment-edit-${p.id}`} className="input py-1.5 text-sm w-full min-w-0" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes" aria-label="Notes" />
                        </td>
                        {isAdmin && (
                          <td className="align-middle">
                            <button form={`payment-edit-${p.id}`} type="submit" className="p-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 inline-flex items-center justify-center mr-1" disabled={saving} aria-label="Save"><Check className="h-4 w-4" /></button>
                            <button type="button" className="p-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 inline-flex items-center justify-center" onClick={() => setEditing(null)} aria-label="Cancel"><X className="h-4 w-4" /></button>
                          </td>
                        )}
                      </>
                    ) : (
                      <>
                        <td className="capitalize">{p.paymentType.replace("_", " ")}</td>
                        <td>{formatCurrency(p.amount)}</td>
                        <td>{p.notes ?? "-"}</td>
                        {isAdmin && (
                          <td>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => startEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-sky-600" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                              <button type="button" onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
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
        title="Delete payment"
        message={deleteTarget ? `Delete this payment (${formatCurrency(deleteTarget.amount)})?` : ""}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

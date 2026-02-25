"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPaymentsByDate, addPayment } from "@/lib/db";
import type { PaymentEntry, PaymentType } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const today = new Date().toISOString().split("T")[0];
const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "credit_card", label: "Credit Card" },
  { value: "fleet_card", label: "Fleet Card" },
  { value: "credit_customer", label: "Credit Customer" },
];

export default function PaymentsPage() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [paymentType, setPaymentType] = useState<PaymentType>("cash");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [expectedRevenue, setExpectedRevenue] = useState("");

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
      await addPayment({
        date,
        paymentType,
        amount: Number(amount),
        notes: notes.trim() || undefined,
        enteredBy: profile.email,
      });
      setAmount("");
      setNotes("");
      setPayments(await getPaymentsByDate(date));
    } finally {
      setSaving(false);
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
      <h1 className="text-2xl font-bold">Payment Tracking</h1>
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
        <label htmlFor="payment-expected-revenue" className="label">Expected total revenue (₹) – optional, for mismatch check</label>
        <input
          id="payment-expected-revenue"
          type="number"
          step="0.01"
          min="0"
          className="input max-w-xs"
          value={expectedRevenue}
          onChange={(e) => setExpectedRevenue(e.target.value)}
          placeholder="Enter if you want mismatch warning"
          aria-label="Expected total revenue in rupees"
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
        <h2 className="text-lg font-semibold mb-4">Add payment entry</h2>
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
        <h2 className="text-lg font-semibold mb-4">Payments for {formatDate(date)}</h2>
        <p className="text-sm text-slate-600 mb-2">
          Total entered: <strong>{formatCurrency(totalEntered)}</strong>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-2 capitalize">{p.paymentType.replace("_", " ")}</td>
                  <td className="py-2">{formatCurrency(p.amount)}</td>
                  <td className="py-2">{p.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getExpensesByDate, addExpense } from "@/lib/db";
import type { Expense } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const today = new Date().toISOString().split("T")[0];
const CATEGORIES = [
  { value: "generator_diesel", label: "Generator diesel" },
  { value: "maintenance", label: "Maintenance" },
  { value: "cleaning", label: "Cleaning" },
  { value: "salary_advance", label: "Salary advance" },
  { value: "other", label: "Other" },
];

export default function ExpensesPage() {
  const { profile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("other");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getExpensesByDate(date).then(setExpenses).finally(() => setLoading(false));
  }, [date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !profile) return;
    setSaving(true);
    try {
      await addExpense({
        date,
        category,
        amount: Number(amount),
        description: description.trim() || "-",
        enteredBy: profile.email,
      });
      setAmount("");
      setDescription("");
      setExpenses(await getExpensesByDate(date));
    } finally {
      setSaving(false);
    }
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Expenses</h1>
      <div className="card">
        <label htmlFor="expense-date" className="label">Date</label>
        <input
          id="expense-date"
          type="date"
          className="input max-w-xs"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Expense date"
        />
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Add expense</h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="expense-category" className="label">Category</label>
              <select
                id="expense-category"
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Expense category"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="expense-amount" className="label">Amount (₹)</label>
              <input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                aria-label="Amount in rupees"
              />
            </div>
          </div>
          <div>
            <label htmlFor="expense-description" className="label">Description</label>
            <input
              id="expense-description"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              aria-label="Expense description"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Add expense"}
          </button>
        </form>
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Expenses for {formatDate(date)}</h2>
        <p className="text-lg font-medium text-slate-700 mb-4">
          Total: {formatCurrency(total)}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="py-2 capitalize">{e.category.replace("_", " ")}</td>
                  <td className="py-2">{formatCurrency(e.amount)}</td>
                  <td className="py-2">{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

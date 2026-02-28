"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import DatePicker from "@/components/DatePicker";
import FuelLoader from "@/components/FuelLoader";
import { getExpensesByDate, addExpense, updateExpense, deleteExpense } from "@/lib/db";
import type { Expense } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { Pencil, Trash2, Check, X } from "lucide-react";

const today = new Date().toISOString().split("T")[0];
const CATEGORIES = [
  { value: "generator_diesel", label: "Generator diesel" },
  { value: "maintenance", label: "Maintenance" },
  { value: "cleaning", label: "Cleaning" },
  { value: "salary_advance", label: "Salary advance" },
  { value: "other", label: "Other" },
];

export default function ExpensesPage() {
  const { profile, hasRole } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("other");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [editCategory, setEditCategory] = useState("other");
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isAdmin = hasRole("admin");
  const isMobile = useMediaQuery("(max-width: 768px)");

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
      setSuccessMessage("Expense added successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  function startEdit(e: Expense) {
    setEditing(e);
    setEditCategory(e.category);
    setEditAmount(String(e.amount));
    setEditDescription(e.description);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !editAmount) return;
    setSaving(true);
    try {
      await updateExpense(editing.id, {
        category: editCategory,
        amount: Number(editAmount),
        description: editDescription.trim() || "-",
      });
      setEditing(null);
      setExpenses(await getExpensesByDate(date));
      setSuccessMessage("Expense updated.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExpense(deleteTarget.id);
      setDeleteTarget(null);
      setExpenses(await getExpensesByDate(date));
      setSuccessMessage("Expense deleted.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <FuelLoader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Expenses</h1>
      {successMessage && (
        <div className="banner-success">
          {successMessage}
        </div>
      )}
      <div className="card">
        <label htmlFor="expense-date" className="label">Date</label>
        <DatePicker
          id="expense-date"
          value={date}
          onChange={setDate}
          aria-label="Expense date"
          className="max-w-xs"
        />
      </div>
      <div className="card">
        <h2 className="card-header">Add expense</h2>
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
        <h2 className="card-header">Expenses for {formatDate(date)}</h2>
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-4">
          Total: {formatCurrency(total)}
        </p>
        {isMobile ? (
          <ul className="space-y-3 list-none p-0 m-0">
            {expenses.map((e) => {
              const isEditingRow = editing?.id === e.id;
              return (
                <li key={e.id}>
                  {isEditingRow ? (
                    <div className="edit-card">
                      <p className="edit-card-title">Editing expense</p>
                      <form id={`expense-edit-${e.id}`} onSubmit={handleUpdate} className="space-y-4">
                        <div>
                          <label htmlFor={`expense-edit-cat-${e.id}`} className="label">Category</label>
                          <select id={`expense-edit-cat-${e.id}`} className="input" value={editCategory} onChange={(ev) => setEditCategory(ev.target.value)} aria-label="Expense category">
                            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`expense-edit-amount-${e.id}`} className="label">Amount (₹)</label>
                          <input id={`expense-edit-amount-${e.id}`} form={`expense-edit-${e.id}`} type="number" step="0.01" min="0" className="input" value={editAmount} onChange={(ev) => setEditAmount(ev.target.value)} required aria-label="Amount (₹)" />
                        </div>
                        <div>
                          <label htmlFor={`expense-edit-desc-${e.id}`} className="label">Description</label>
                          <input id={`expense-edit-desc-${e.id}`} form={`expense-edit-${e.id}`} className="input" value={editDescription} onChange={(ev) => setEditDescription(ev.target.value)} placeholder="Description" aria-label="Description" />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button form={`expense-edit-${e.id}`} type="submit" className="btn btn-primary flex-1 min-h-[48px]" disabled={saving} aria-label="Save"><Check className="h-5 w-5 sm:mr-1.5" /><span className="hidden sm:inline">{saving ? "Saving…" : "Save"}</span></button>
                          <button type="button" className="btn btn-secondary flex-1 min-h-[48px]" onClick={() => setEditing(null)} aria-label="Cancel"><X className="h-5 w-5 sm:mr-1.5" /><span className="hidden sm:inline">Cancel</span></button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="mobile-list-card">
                      <p className="mobile-list-card-title capitalize">{e.category.replace("_", " ")}</p>
                      <p className="mobile-list-card-row">Amount: {formatCurrency(e.amount)}</p>
                      <p className="mobile-list-card-row">Description: {e.description}</p>
                      {isAdmin && (
                        <div className="mobile-list-card-actions">
                          <button type="button" onClick={() => startEdit(e)} className="btn btn-secondary min-h-[44px] flex-1 flex items-center justify-center gap-1.5" aria-label="Edit"><Pencil className="h-4 w-4" /><span>Edit</span></button>
                          <button type="button" onClick={() => setDeleteTarget(e)} className="btn btn-danger min-h-[44px] flex-1 flex items-center justify-center gap-1.5" aria-label="Delete"><Trash2 className="h-4 w-4" /><span>Delete</span></button>
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
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Description</th>
                  {isAdmin && <th className="w-24">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => {
                  const isEditingRow = editing?.id === e.id;
                  const colSpan = isAdmin ? 4 : 3;
                  return (
                    <tr key={e.id}>
                      {isEditingRow ? (
                        <>
                          <td className="align-middle">
                            <form id={`expense-edit-${e.id}`} onSubmit={handleUpdate} className="min-w-0">
                              <select className="input py-1.5 text-sm w-full min-w-0" value={editCategory} onChange={(ev) => setEditCategory(ev.target.value)} aria-label="Expense category">
                                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                              </select>
                            </form>
                          </td>
                          <td className="align-middle">
                            <input form={`expense-edit-${e.id}`} type="number" step="0.01" min="0" className="input py-1.5 text-sm w-full min-w-0" value={editAmount} onChange={(ev) => setEditAmount(ev.target.value)} required aria-label="Amount (₹)" />
                          </td>
                          <td className="align-middle">
                            <input form={`expense-edit-${e.id}`} className="input py-1.5 text-sm w-full min-w-0" value={editDescription} onChange={(ev) => setEditDescription(ev.target.value)} aria-label="Description" placeholder="Description" />
                          </td>
                          {isAdmin && (
                            <td className="align-middle">
                              <div className="flex gap-2">
                                <button form={`expense-edit-${e.id}`} type="submit" className="btn-icon-primary" disabled={saving} aria-label="Save"><Check className="h-4 w-4" /></button>
                                <button type="button" className="btn-icon-cancel" onClick={() => setEditing(null)} aria-label="Cancel"><X className="h-4 w-4" /></button>
                              </div>
                            </td>
                          )}
                        </>
                      ) : (
                        <>
                          <td className="capitalize">{e.category.replace("_", " ")}</td>
                          <td>{formatCurrency(e.amount)}</td>
                          <td>{e.description}</td>
                          {isAdmin && (
                            <td>
                              <div className="flex gap-1">
                                <button type="button" onClick={() => startEdit(e)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-sky-600" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                                <button type="button" onClick={() => setDeleteTarget(e)} className="btn-icon-delete" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
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
        title="Delete expense"
        message={deleteTarget ? `Delete this expense (${formatCurrency(deleteTarget.amount)})?` : ""}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

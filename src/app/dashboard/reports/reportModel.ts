// ───────────────────────────────────────────────────────────────────────────
// Report derivation — pure, no React and no data layer.
//
// Every report type resolves to the SAME shape: a few headline figures, one
// table, and an optional totals row. Screen, Excel and PDF all render from
// that one model, so what you read is exactly what you export.
// ───────────────────────────────────────────────────────────────────────────

import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type {
  Expense,
  MeterReading,
  PaymentEntry,
  StaffShift,
  TankerDelivery,
} from "@/types";

export type ReportType = "daily" | "monthly" | "fuel_sale" | "staff" | "expense";

export const REPORT_TYPES: { value: ReportType; label: string; blurb: string }[] = [
  {
    value: "daily",
    label: "Daily report",
    blurb: "Volume, collections and stock received, one row per day.",
  },
  {
    value: "monthly",
    label: "Monthly report",
    blurb: "The same figures rolled up per calendar month.",
  },
  {
    value: "fuel_sale",
    label: "Fuel sale report",
    blurb: "Volume sold split by fuel type.",
  },
  {
    value: "staff",
    label: "Staff report",
    blurb: "Shifts worked and cash handed over.",
  },
  {
    value: "expense",
    label: "Expense report",
    blurb: "Every cost booked against the outlet in this period.",
  },
];

/** The three report types that read from meter readings, payments and deliveries. */
export const SALES_REPORTS: ReportType[] = ["daily", "monthly", "fuel_sale"];

export interface Cell {
  /** The figure or phrase itself. */
  text: string;
  /** Set in the sans face beside the figure — a monospaced "L" reads as a gap. */
  unit?: string;
  /** What a spreadsheet stores — figures stay numeric so totals re-derive. */
  raw: string | number;
  /** ASCII fallback: jsPDF's core fonts have no ₹ glyph. */
  plain?: string;
}

export interface Column {
  label: string;
  /** Right-aligned and set in the tabular mono face. */
  numeric?: boolean;
  /** Appended to the header in exports, where cells carry no unit of their own. */
  exportUnit?: string;
}

export interface Row {
  key: string;
  cells: Cell[];
}

export interface Stat {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  /** "text" when the value is a name rather than a figure. */
  kind?: "figure" | "text";
}

export interface ReportModel {
  label: string;
  /** Names the table itself; the page heading already carries type and range. */
  tableLabel: string;
  columns: Column[];
  rows: Row[];
  /** Parallel to `columns`; the first cell carries the row's name. */
  totals?: Cell[];
  stats: Stat[];
  emptyTitle: string;
  emptyHint: string;
}

export interface ReportData {
  readings?: MeterReading[];
  deliveries?: TankerDelivery[];
  payments?: PaymentEntry[];
  expenses?: Expense[];
  shifts?: StaffShift[];
}

export interface Lookups {
  nozzles: { id: string; fuelTypeId: string }[];
  fuelTypes: { id: string; name: string }[];
}

/* ---------- cells ---------- */

const text = (s: string): Cell => ({ text: s, raw: s });

const litres = (n: number): Cell => ({
  text: formatNumber(n),
  unit: "L",
  raw: round2(n),
});

const money = (n: number): Cell => ({
  text: formatCurrency(n),
  raw: round2(n),
  plain: `Rs. ${formatNumber(n, 0)}`,
});

/* The percent sign stays inside the figure: it occupies one mono cell, which
   keeps a right-aligned column flush rather than opening a gap. */
const percent = (n: number): Cell => ({
  text: `${formatNumber(n, 1)}%`,
  raw: round2(n),
});

/** The full string a spreadsheet header or PDF cell should show. */
export function displayOf(cell: Cell | undefined): string {
  if (!cell) return "";
  return cell.unit ? `${cell.text} ${cell.unit}` : cell.text;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** "generator_diesel" → "Generator diesel", matching the Expenses page labels. */
function humanise(value: string): string {
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** "2026-08" → "Aug 2026", built locally so the month never slips a boundary. */
function formatMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

const sum = <T,>(items: T[] | undefined, pick: (item: T) => number): number =>
  (items ?? []).reduce((total, item) => total + (pick(item) || 0), 0);

/* ---------- derivations ---------- */

interface Bucket {
  litres: number;
  revenue: number;
  received: number;
}

/** Group readings, payments and deliveries onto a shared key (day or month). */
function bucketise(data: ReportData, keyOf: (date: string) => string) {
  const buckets = new Map<string, Bucket>();
  const at = (date: string): Bucket => {
    const key = keyOf(date);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { litres: 0, revenue: 0, received: 0 };
      buckets.set(key, bucket);
    }
    return bucket;
  };

  data.readings?.forEach((r) => {
    at(r.date).litres += r.fuelSold ?? 0;
  });
  data.payments?.forEach((p) => {
    at(p.date).revenue += p.amount;
  });
  data.deliveries?.forEach((d) => {
    at(d.date).received += d.quantityLiters;
  });

  return Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function salesStats(data: ReportData): Stat[] {
  const revenue = sum(data.payments, (p) => p.amount);
  const sold = sum(data.readings, (r) => r.fuelSold ?? 0);
  const received = sum(data.deliveries, (d) => d.quantityLiters);
  const deliveries = data.deliveries?.length ?? 0;
  const payments = data.payments?.length ?? 0;
  const readings = data.readings?.length ?? 0;

  return [
    {
      label: "Collections",
      value: formatCurrency(revenue),
      note: `${payments} ${payments === 1 ? "entry" : "entries"}`,
    },
    {
      label: "Fuel sold",
      value: formatNumber(sold),
      unit: "L",
      note: `${readings} meter ${readings === 1 ? "reading" : "readings"}`,
    },
    {
      label: "Fuel received",
      value: formatNumber(received),
      unit: "L",
      note: `${deliveries} ${deliveries === 1 ? "delivery" : "deliveries"}`,
    },
  ];
}

function byPeriod(
  data: ReportData,
  granularity: "day" | "month",
): Pick<ReportModel, "tableLabel" | "columns" | "rows" | "totals"> {
  const entries = bucketise(data, (date) =>
    granularity === "day" ? date : date.slice(0, 7),
  );

  return {
    tableLabel: granularity === "day" ? "Day by day" : "Month by month",
    columns: [
      { label: granularity === "day" ? "Date" : "Month" },
      { label: "Fuel sold", numeric: true, exportUnit: "L" },
      { label: "Collections", numeric: true, exportUnit: "INR" },
      { label: "Fuel received", numeric: true, exportUnit: "L" },
    ],
    rows: entries.map(([key, bucket]) => ({
      key,
      cells: [
        text(granularity === "day" ? formatDate(key) : formatMonth(key)),
        litres(bucket.litres),
        money(bucket.revenue),
        litres(bucket.received),
      ],
    })),
    totals: entries.length
      ? [
          text("Total"),
          litres(sum(data.readings, (r) => r.fuelSold ?? 0)),
          money(sum(data.payments, (p) => p.amount)),
          litres(sum(data.deliveries, (d) => d.quantityLiters)),
        ]
      : undefined,
  };
}

function byFuelType(
  data: ReportData,
  lookups: Lookups,
): Pick<ReportModel, "tableLabel" | "columns" | "rows" | "totals"> {
  const sold = new Map<string, number>();
  data.readings?.forEach((r) => {
    const nozzle = lookups.nozzles.find((n) => n.id === r.nozzleId);
    if (!nozzle) return;
    const name =
      lookups.fuelTypes.find((f) => f.id === nozzle.fuelTypeId)?.name ??
      "Unknown";
    sold.set(name, (sold.get(name) ?? 0) + (r.fuelSold ?? 0));
  });

  const entries = Array.from(sold.entries()).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, litresSold]) => s + litresSold, 0);

  return {
    tableLabel: "Volume by fuel type",
    columns: [
      { label: "Fuel type" },
      { label: "Sold", numeric: true, exportUnit: "L" },
      { label: "Share of volume", numeric: true, exportUnit: "%" },
    ],
    rows: entries.map(([name, litresSold]) => ({
      key: name,
      cells: [
        text(name),
        litres(litresSold),
        percent(total > 0 ? (litresSold / total) * 100 : 0),
      ],
    })),
    totals: entries.length
      ? [text("Total"), litres(total), percent(total > 0 ? 100 : 0)]
      : undefined,
  };
}

function staffReport(data: ReportData): Omit<ReportModel, "label"> {
  const shifts = data.shifts ?? [];
  const cash = sum(shifts, (s) => s.cashCollected);
  const people = new Set(shifts.map((s) => s.staffName)).size;

  return {
    tableLabel: "Shifts logged",
    columns: [
      { label: "Date" },
      { label: "Staff" },
      { label: "Shift" },
      { label: "Cash collected", numeric: true, exportUnit: "INR" },
    ],
    rows: shifts
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({
        key: s.id,
        cells: [
          text(formatDate(s.date)),
          text(s.staffName),
          text(`${s.shiftStart} – ${s.shiftEnd}`),
          money(s.cashCollected),
        ],
      })),
    totals: shifts.length
      ? [text("Total"), text(""), text(""), money(cash)]
      : undefined,
    stats: [
      {
        label: "Cash collected",
        value: formatCurrency(cash),
        note: "Handed over",
      },
      {
        label: "Shifts",
        value: String(shifts.length),
        note: `${people} ${people === 1 ? "person" : "people"}`,
      },
      {
        label: "Average per shift",
        value: formatCurrency(shifts.length ? cash / shifts.length : 0),
        note: "Cash collected",
      },
    ],
    emptyTitle: "No shifts in this period",
    emptyHint: "Log shifts under Shifts, or widen the date range.",
  };
}

function expenseReport(data: ReportData): Omit<ReportModel, "label"> {
  const expenses = data.expenses ?? [];
  const total = sum(expenses, (e) => e.amount);

  const byCategory = new Map<string, number>();
  expenses.forEach((e) =>
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount),
  );
  const [topCategory, topAmount] = Array.from(byCategory.entries()).sort(
    (a, b) => b[1] - a[1],
  )[0] ?? ["", 0];

  return {
    tableLabel: "Costs booked",
    columns: [
      { label: "Date" },
      { label: "Category" },
      { label: "Description" },
      { label: "Amount", numeric: true, exportUnit: "INR" },
    ],
    rows: expenses
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        key: e.id,
        cells: [
          text(formatDate(e.date)),
          text(humanise(e.category)),
          text(e.description),
          money(e.amount),
        ],
      })),
    totals: expenses.length
      ? [text("Total"), text(""), text(""), money(total)]
      : undefined,
    stats: [
      {
        label: "Total spend",
        value: formatCurrency(total),
        note: `${expenses.length} ${expenses.length === 1 ? "entry" : "entries"}`,
      },
      {
        label: "Largest category",
        value: topCategory ? humanise(topCategory) : "—",
        kind: "text",
        note: topCategory ? formatCurrency(topAmount) : undefined,
      },
      {
        label: "Average entry",
        value: formatCurrency(expenses.length ? total / expenses.length : 0),
        note: "Across the period",
      },
    ],
    emptyTitle: "No expenses in this period",
    emptyHint: "Book costs under Expenses, or widen the date range.",
  };
}

export function buildReport(
  type: ReportType,
  data: ReportData,
  lookups: Lookups,
): ReportModel {
  const label = REPORT_TYPES.find((r) => r.value === type)?.label ?? "Report";

  if (type === "staff") return { label, ...staffReport(data) };
  if (type === "expense") return { label, ...expenseReport(data) };

  const table =
    type === "fuel_sale"
      ? byFuelType(data, lookups)
      : byPeriod(data, type === "daily" ? "day" : "month");

  return {
    label,
    ...table,
    stats: salesStats(data),
    emptyTitle: "Nothing recorded in this period",
    emptyHint:
      "Enter meter readings, payments or deliveries, or widen the date range.",
  };
}

/* ---------- export projections ---------- */

/** Column headers carry the unit, because export cells are bare figures. */
export function exportHeaders(model: ReportModel): string[] {
  return model.columns.map((c) =>
    c.exportUnit ? `${c.label} (${c.exportUnit})` : c.label,
  );
}

/** One object per row, keyed by header — the shape `exportToExcel` wants. */
export function toSheetRows(model: ReportModel): Record<string, unknown>[] {
  const headers = exportHeaders(model);
  const project = (cells: Cell[]) =>
    Object.fromEntries(headers.map((header, i) => [header, cells[i]?.raw ?? ""]));
  const rows = model.rows.map((row) => project(row.cells));
  if (model.totals) rows.push(project(model.totals));
  return rows;
}

/** Display strings with ASCII substitutions, for jsPDF's core fonts. */
export function toPdfRows(model: ReportModel): string[][] {
  const project = (cells: Cell[]) =>
    model.columns.map((_, i) => {
      const cell = cells[i];
      return cell ? (cell.plain ?? displayOf(cell)) : "";
    });
  const rows = model.rows.map((row) => project(row.cells));
  if (model.totals) rows.push(project(model.totals));
  return rows;
}

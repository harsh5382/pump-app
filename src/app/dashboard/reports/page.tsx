"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getMeterReadingsDateRange,
  getTankerDeliveriesDateRange,
  getPaymentsDateRange,
  getExpensesDateRange,
  getShiftsDateRange,
  getNozzles,
  getFuelTypes,
  getTanks,
} from "@/lib/db";
import type { MeterReading, TankerDelivery, PaymentEntry, Expense, StaffShift } from "@/types";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { exportToExcel, exportToPdf } from "@/lib/exportReport";

type ReportType = "daily" | "monthly" | "fuel_sale" | "staff" | "expense";

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("daily");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    readings?: MeterReading[];
    deliveries?: TankerDelivery[];
    payments?: PaymentEntry[];
    expenses?: Expense[];
    shifts?: StaffShift[];
  }>({});
  const [nozzles, setNozzles] = useState<{ id: string; machineNumber: string; fuelTypeId: string }[]>([]);
  const [fuelTypes, setFuelTypes] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getNozzles().then(setNozzles);
    getFuelTypes().then(setFuelTypes);
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      if (reportType === "daily" || reportType === "monthly" || reportType === "fuel_sale") {
        const [readings, deliveries, payments] = await Promise.all([
          getMeterReadingsDateRange(startDate, endDate),
          getTankerDeliveriesDateRange(startDate, endDate),
          getPaymentsDateRange(startDate, endDate),
        ]);
        setData({ readings, deliveries, payments });
      } else if (reportType === "staff") {
        const shifts = await getShiftsDateRange(startDate, endDate);
        setData({ shifts });
      } else {
        const expenses = await getExpensesDateRange(startDate, endDate);
        setData({ expenses });
      }
    } finally {
      setLoading(false);
    }
  }, [reportType, startDate, endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const fuelSoldByType: Record<string, number> = {};
  data.readings?.forEach((r) => {
    const nozzle = nozzles.find((n) => n.id === r.nozzleId);
    if (nozzle) {
      const name = fuelTypes.find((f) => f.id === nozzle.fuelTypeId)?.name ?? "Unknown";
      fuelSoldByType[name] = (fuelSoldByType[name] ?? 0) + (r.fuelSold ?? 0);
    }
  });

  function handleExportExcel() {
    if (reportType === "fuel_sale" || reportType === "daily" || reportType === "monthly") {
      const rows = Object.entries(fuelSoldByType).map(([name, liters]) => ({
        "Fuel Type": name,
        "Sold (L)": liters,
      }));
      if (data.payments?.length) {
        const totalPayments = data.payments.reduce((s, p) => s + p.amount, 0);
        rows.push({ "Fuel Type": "Total Revenue", "Sold (L)": totalPayments });
      }
      exportToExcel(rows, "Fuel Sale", `fuel-sale-${startDate}-${endDate}`);
    } else if (reportType === "staff" && data.shifts?.length) {
      const rows = data.shifts.map((s) => ({
        Date: s.date,
        "Staff Name": s.staffName,
        "Shift Start": s.shiftStart,
        "Shift End": s.shiftEnd,
        "Cash Collected": s.cashCollected,
      }));
      exportToExcel(rows, "Staff Report", `staff-${startDate}-${endDate}`);
    } else if (reportType === "expense" && data.expenses?.length) {
      const rows = data.expenses.map((e) => ({
        Date: e.date,
        Category: e.category,
        Amount: e.amount,
        Description: e.description,
      }));
      exportToExcel(rows, "Expense Report", `expense-${startDate}-${endDate}`);
    }
  }

  function handleExportPdf() {
    if (reportType === "fuel_sale" || reportType === "daily" || reportType === "monthly") {
      const headers = ["Fuel Type", "Sold (L)"];
      const rows = Object.entries(fuelSoldByType).map(([name, liters]) => [name, formatNumber(liters)]);
      const totalPayments = data.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
      if (totalPayments > 0) rows.push(["Total Revenue", formatCurrency(totalPayments)]);
      exportToPdf(
        `Fuel Sale Report ${startDate} to ${endDate}`,
        headers,
        rows,
        `fuel-sale-${startDate}-${endDate}`
      );
    } else if (reportType === "staff" && data.shifts?.length) {
      const headers = ["Date", "Staff", "Shift", "Cash"];
      const rows = data.shifts.map((s) => [
        s.date,
        s.staffName,
        `${s.shiftStart}-${s.shiftEnd}`,
        formatCurrency(s.cashCollected),
      ]);
      exportToPdf(
        `Staff Report ${startDate} to ${endDate}`,
        headers,
        rows,
        `staff-${startDate}-${endDate}`
      );
    } else if (reportType === "expense" && data.expenses?.length) {
      const headers = ["Date", "Category", "Amount", "Description"];
      const rows = data.expenses.map((e) => [
        e.date,
        e.category,
        formatCurrency(e.amount),
        e.description,
      ]);
      exportToPdf(
        `Expense Report ${startDate} to ${endDate}`,
        headers,
        rows,
        `expense-${startDate}-${endDate}`
      );
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>
      <div className="card flex flex-wrap gap-4 items-end">
        <div>
          <label htmlFor="report-type" className="label">Report type</label>
          <select
            id="report-type"
            className="input min-w-[180px]"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            aria-label="Report type"
          >
            <option value="daily">Daily Report</option>
            <option value="monthly">Monthly Report</option>
            <option value="fuel_sale">Fuel Sale Report</option>
            <option value="staff">Staff Report</option>
            <option value="expense">Expense Report</option>
          </select>
        </div>
        <div>
          <label htmlFor="report-from" className="label">From</label>
          <input
            id="report-from"
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label="Report start date"
          />
        </div>
        <div>
          <label htmlFor="report-to" className="label">To</label>
          <input
            id="report-to"
            type="date"
            className="input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="Report end date"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadReport}
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleExportExcel}>
            Export Excel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleExportPdf}>
            Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
        </div>
      ) : (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">
            {reportType === "daily" && "Daily"}
            {reportType === "monthly" && "Monthly"}
            {reportType === "fuel_sale" && "Fuel Sale"}
            {reportType === "staff" && "Staff"}
            {reportType === "expense" && "Expense"} Report ({startDate} – {endDate})
          </h2>
          {(reportType === "daily" || reportType === "monthly" || reportType === "fuel_sale") && (
            <>
              <h3 className="font-medium mt-4">Fuel sold by type</h3>
              <ul className="list-disc list-inside my-2">
                {Object.entries(fuelSoldByType).map(([name, liters]) => (
                  <li key={name}>
                    {name}: {formatNumber(liters)} L
                  </li>
                ))}
              </ul>
              {data.payments && data.payments.length > 0 && (
                <>
                  <h3 className="font-medium mt-4">Total revenue</h3>
                  <p className="text-xl font-bold text-sky-600">
                    {formatCurrency(data.payments.reduce((s, p) => s + p.amount, 0))}
                  </p>
                </>
              )}
              {data.deliveries && data.deliveries.length > 0 && (
                <>
                  <h3 className="font-medium mt-4">Tanker deliveries</h3>
                  <p>{data.deliveries.length} delivery(ies), {formatNumber(data.deliveries.reduce((s, d) => s + d.quantityLiters, 0))} L total</p>
                </>
              )}
            </>
          )}
          {reportType === "staff" && data.shifts && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Staff</th>
                    <th className="pb-2 font-medium">Shift</th>
                    <th className="pb-2 font-medium">Cash</th>
                  </tr>
                </thead>
                <tbody>
                  {data.shifts.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100">
                      <td className="py-2">{s.date}</td>
                      <td className="py-2">{s.staffName}</td>
                      <td className="py-2">{s.shiftStart} – {s.shiftEnd}</td>
                      <td className="py-2">{formatCurrency(s.cashCollected)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {reportType === "expense" && data.expenses && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100">
                      <td className="py-2">{e.date}</td>
                      <td className="py-2 capitalize">{e.category.replace("_", " ")}</td>
                      <td className="py-2">{formatCurrency(e.amount)}</td>
                      <td className="py-2">{e.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

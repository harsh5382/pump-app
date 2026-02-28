"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getMeterReadingsByDate,
  getNozzles,
  getFuelTypes,
  getPaymentsByDate,
} from "@/lib/db";
import type { MeterReading, Nozzle, FuelType, PaymentEntry } from "@/types";
import { formatNumber, formatCurrency, formatDate } from "@/lib/utils";
import DatePicker from "@/components/DatePicker";
import FuelLoader from "@/components/FuelLoader";

const today = new Date().toISOString().split("T")[0];

export default function SalesPage() {
  const { hasRole } = useAuth();
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [nozzles, setNozzles] = useState<Nozzle[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);

  const isAdmin = hasRole("admin");

  useEffect(() => {
    Promise.all([
      getMeterReadingsByDate(date),
      getNozzles(),
      getFuelTypes(),
      getPaymentsByDate(date),
    ]).then(([r, n, f, p]) => {
      setReadings(r);
      setNozzles(n);
      setFuelTypes(f);
      setPayments(p);
    }).finally(() => setLoading(false));
  }, [date]);

  const fuelSoldByType: Record<string, number> = {};
  readings.forEach((r) => {
    const nozzle = nozzles.find((n) => n.id === r.nozzleId);
    if (nozzle) {
      const name = fuelTypes.find((f) => f.id === nozzle.fuelTypeId)?.name ?? "Unknown";
      fuelSoldByType[name] = (fuelSoldByType[name] ?? 0) + (r.fuelSold ?? 0);
    }
  });

  const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
  const totalSoldLiters = Object.values(fuelSoldByType).reduce((a, b) => a + b, 0);

  if (loading) {
    return <FuelLoader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Daily Sales</h1>
      <div className="card">
        <label htmlFor="sales-date" className="label">Date</label>
        <DatePicker
          id="sales-date"
          value={date}
          onChange={setDate}
          aria-label="Sales date"
          className="max-w-xs"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="card-header">Fuel sold (from meter readings)</h2>
          <ul className="space-y-2">
            {Object.entries(fuelSoldByType).map(([name, liters]) => (
              <li key={name} className="flex justify-between">
                <span>{name}</span>
                <span className="font-medium">{formatNumber(liters)} L</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 pt-4 border-t font-medium">
            Total: {formatNumber(totalSoldLiters)} L
          </p>
        </div>
        <div className="card">
          <h2 className="card-header">Payments received</h2>
          <p className="text-2xl font-bold text-sky-600">{formatCurrency(totalPayments)}</p>
          <p className="text-sm text-slate-500 mt-2">
            Daily entry should match total sale. System will warn on mismatch.
          </p>
        </div>
      </div>
      {isAdmin && (
        <div className="card border-amber-200 bg-amber-50/50">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Manual correction (Admin only)</h2>
          <p className="text-sm text-slate-600">
            Corrections can be added via API or a future admin form. Sales are auto-calculated from meter readings.
          </p>
        </div>
      )}
    </div>
  );
}

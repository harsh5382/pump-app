"use client";

import { useEffect, useState } from "react";
import { getTanks, getFuelTypes, getDipEntriesByDate } from "@/lib/db";
import type { Tank, FuelType, DipEntry } from "@/types";
import { formatNumber, formatDate } from "@/lib/utils";

const today = new Date().toISOString().split("T")[0];

export default function StockPage() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [dips, setDips] = useState<DipEntry[]>([]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTanks(), getFuelTypes(), getDipEntriesByDate(date)]).then(
      ([t, f, d]) => {
        setTanks(t);
        setFuelTypes(f);
        setDips(d);
      }
    ).finally(() => setLoading(false));
  }, [date]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Stock Calculation</h1>
      <p className="text-slate-600">
        Opening Stock + Received − Sold = Closing Stock. Compare system stock with dip test.
      </p>
      <div className="card">
        <label htmlFor="stock-date" className="label">Date</label>
        <input
          id="stock-date"
          type="date"
          className="input max-w-xs"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Stock date"
        />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-medium">Tank</th>
              <th className="pb-2 font-medium">Fuel</th>
              <th className="pb-2 font-medium">System stock (L)</th>
              <th className="pb-2 font-medium">Dip test (L)</th>
              <th className="pb-2 font-medium">Difference</th>
            </tr>
          </thead>
          <tbody>
            {tanks.map((t) => {
              const ft = fuelTypes.find((f) => f.id === t.fuelTypeId);
              const dip = dips.find((d) => d.tankId === t.id);
              const systemStock = t.currentStockLiters;
              const dipStock = dip?.actualQuantity ?? 0;
              const diff = dipStock - systemStock;
              return (
                <tr key={t.id} className="border-b border-slate-100">
                  <td className="py-2">{t.name}</td>
                  <td className="py-2">{ft?.name ?? "-"}</td>
                  <td className="py-2">{formatNumber(systemStock)}</td>
                  <td className="py-2">{dip ? formatNumber(dipStock) : "-"}</td>
                  <td className={`py-2 ${diff !== 0 ? (diff > 0 ? "text-green-600" : "text-red-600") : ""}`}>
                    {dip ? (diff >= 0 ? "+" : "") + formatNumber(diff) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

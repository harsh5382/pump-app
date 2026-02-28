"use client";

import { useEffect, useState } from "react";
import { getTanks, getFuelTypes, getDipEntriesByDate } from "@/lib/db";
import type { Tank, FuelType, DipEntry } from "@/types";
import { formatNumber, formatDate } from "@/lib/utils";
import DatePicker from "@/components/DatePicker";
import FuelLoader from "@/components/FuelLoader";
import { useMediaQuery } from "@/lib/useMediaQuery";

const today = new Date().toISOString().split("T")[0];

export default function StockPage() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [dips, setDips] = useState<DipEntry[]>([]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const isMobile = useMediaQuery("(max-width: 768px)");

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
    return <FuelLoader />;
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Stock Calculation</h1>
      <p className="text-slate-600">
        Opening Stock + Received − Sold = Closing Stock. Compare system stock with dip test.
      </p>
      <div className="card">
        <label htmlFor="stock-date" className="label">Date</label>
        <DatePicker
          id="stock-date"
          value={date}
          onChange={setDate}
          aria-label="Stock date"
          className="max-w-xs"
        />
      </div>
      <div className="card">
        {isMobile ? (
          <ul className="space-y-3 list-none p-0 m-0">
            {tanks.map((t) => {
              const ft = fuelTypes.find((f) => f.id === t.fuelTypeId);
              const dip = dips.find((d) => d.tankId === t.id);
              const systemStock = t.currentStockLiters;
              const dipStock = dip?.actualQuantity ?? 0;
              const diff = dipStock - systemStock;
              return (
                <li key={t.id}>
                  <div className="mobile-list-card">
                    <p className="mobile-list-card-title">{t.name}</p>
                    <p className="mobile-list-card-row">Fuel: {ft?.name ?? "—"}</p>
                    <p className="mobile-list-card-row">System stock: {formatNumber(systemStock)} L</p>
                    <p className="mobile-list-card-row">Dip test: {dip ? formatNumber(dipStock) + " L" : "—"}</p>
                    <p className={`mobile-list-card-row font-medium ${diff !== 0 ? (diff > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400") : ""}`}>
                      Difference: {dip ? (diff >= 0 ? "+" : "") + formatNumber(diff) : "—"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-default">
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
                      <td className={`py-2 ${diff !== 0 ? (diff > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400") : ""}`}>
                        {dip ? (diff >= 0 ? "+" : "") + formatNumber(diff) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

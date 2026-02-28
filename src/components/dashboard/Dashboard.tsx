"use client";

import { useEffect, useState } from "react";
import {
  getTanks,
  getMeterReadingsByDate,
  getTankerDeliveriesByDate,
  getPaymentsByDate,
  getNozzles,
  getFuelTypes,
} from "@/lib/db";
import type {
  Tank,
  MeterReading,
  TankerDelivery,
  PaymentEntry,
  Nozzle,
  FuelType,
} from "@/types";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Fuel, TrendingUp, Droplets, Truck, Wallet } from "lucide-react";
import FuelLoader from "@/components/FuelLoader";
import { useMediaQuery } from "@/lib/useMediaQuery";

const today = new Date().toISOString().split("T")[0];

export default function Dashboard() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [deliveries, setDeliveries] = useState<TankerDelivery[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [nozzles, setNozzles] = useState<Nozzle[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    async function load() {
      try {
        const [
          tanksRes,
          readingsRes,
          deliveriesRes,
          paymentsRes,
          nozzlesRes,
          fuelRes,
        ] = await Promise.all([
          getTanks(),
          getMeterReadingsByDate(today),
          getTankerDeliveriesByDate(today),
          getPaymentsByDate(today),
          getNozzles(),
          getFuelTypes(),
        ]);
        setTanks(tanksRes);
        setReadings(readingsRes);
        setDeliveries(deliveriesRes);
        setPayments(paymentsRes);
        setNozzles(nozzlesRes);
        setFuelTypes(fuelRes);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const fuelSoldByType: Record<string, number> = {};
  readings.forEach((r) => {
    const nozzle = nozzles.find((n) => n.id === r.nozzleId);
    if (nozzle) {
      const name =
        fuelTypes.find((f) => f.id === nozzle.fuelTypeId)?.name ?? "Unknown";
      fuelSoldByType[name] = (fuelSoldByType[name] ?? 0) + (r.fuelSold ?? 0);
    }
  });

  const totalPetrol = fuelSoldByType["Petrol"] ?? 0;
  const totalDiesel = fuelSoldByType["Diesel"] ?? 0;
  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
  const totalTankerReceived = deliveries.reduce(
    (s, d) => s + d.quantityLiters,
    0,
  );
  const totalStock = tanks.reduce((s, t) => s + t.currentStockLiters, 0);

  const chartData = Object.entries(fuelSoldByType).map(([name, value]) => ({
    name,
    value,
  }));
  const COLORS = ["#eab308", "#1e293b", "#0ea5e9"];

  if (loading) {
    return <FuelLoader className="min-h-[40vh]" />;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">{formatDate(today)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="rounded-2xl bg-amber-100 dark:bg-amber-900/40 p-3.5 shrink-0">
            <Fuel className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Petrol sold today
            </p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
              {formatNumber(totalPetrol)} L
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="rounded-2xl bg-slate-100 dark:bg-slate-700/60 p-3.5 shrink-0">
            <Droplets className="h-6 w-6 text-slate-600 dark:text-slate-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Diesel sold today
            </p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
              {formatNumber(totalDiesel)} L
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 p-3.5 shrink-0">
            <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total revenue</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="rounded-2xl bg-sky-100 dark:bg-sky-900/40 p-3.5 shrink-0">
            <Wallet className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Stock remaining
            </p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
              {formatNumber(totalStock)} L
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Today&apos;s fuel sales
          </h2>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                  }}
                  formatter={(v: number) => [formatNumber(v) + " L", "Sold"]}
                />
                <Bar
                  dataKey="value"
                  fill="#0ea5e9"
                  radius={[6, 6, 0, 0]}
                  name="Liters"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 py-8 text-center">
              No meter readings for today yet.
            </p>
          )}
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Stock by tank
          </h2>
          {tanks.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={tanks.map((t) => ({
                    name: t.name,
                    value: t.currentStockLiters,
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) =>
                    `${name}: ${formatNumber(value)} L`
                  }
                >
                  {tanks.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                  }}
                  formatter={(v: number) => [formatNumber(v) + " L", "Stock"]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 py-8 text-center">
              No tanks added yet.
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          Tanker received today
        </h2>
        {deliveries.length ? (
          isMobile ? (
            <ul className="space-y-3 list-none p-0 m-0">
              {deliveries.map((d) => (
                <li key={d.id}>
                  <div className="mobile-list-card">
                    <p className="mobile-list-card-title">{d.tankerCompany}</p>
                    <p className="mobile-list-card-row">Invoice: {d.invoiceNumber}</p>
                    <p className="mobile-list-card-row">Quantity: {formatNumber(d.quantityLiters)} L</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="table-container">
              <table className="table-default">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Invoice</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d.id}>
                      <td>{d.tankerCompany}</td>
                      <td>{d.invoiceNumber}</td>
                      <td>{formatNumber(d.quantityLiters)} L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <p className="text-slate-500 dark:text-slate-400">No tanker deliveries for today.</p>
        )}
      </div>
    </div>
  );
}

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
import type { Tank, MeterReading, TankerDelivery, PaymentEntry, Nozzle, FuelType } from "@/types";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Fuel, TrendingUp, Droplets, Truck, Wallet } from "lucide-react";

const today = new Date().toISOString().split("T")[0];

export default function Dashboard() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [deliveries, setDeliveries] = useState<TankerDelivery[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [nozzles, setNozzles] = useState<Nozzle[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [tanksRes, readingsRes, deliveriesRes, paymentsRes, nozzlesRes, fuelRes] =
          await Promise.all([
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
      const name = fuelTypes.find((f) => f.id === nozzle.fuelTypeId)?.name ?? "Unknown";
      fuelSoldByType[name] = (fuelSoldByType[name] ?? 0) + (r.fuelSold ?? 0);
    }
  });

  const totalPetrol = fuelSoldByType["Petrol"] ?? 0;
  const totalDiesel = fuelSoldByType["Diesel"] ?? 0;
  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
  const totalTankerReceived = deliveries.reduce((s, d) => s + d.quantityLiters, 0);
  const totalStock = tanks.reduce((s, t) => s + t.currentStockLiters, 0);

  const chartData = Object.entries(fuelSoldByType).map(([name, value]) => ({ name, value }));
  const COLORS = ["#eab308", "#1e293b", "#0ea5e9"];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-600">{formatDate(today)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="rounded-full bg-amber-100 p-3">
            <Fuel className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Petrol sold today</p>
            <p className="text-xl font-bold">{formatNumber(totalPetrol)} L</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="rounded-full bg-slate-200 p-3">
            <Droplets className="h-6 w-6 text-slate-700" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Diesel sold today</p>
            <p className="text-xl font-bold">{formatNumber(totalDiesel)} L</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="rounded-full bg-emerald-100 p-3">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total revenue</p>
            <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="rounded-full bg-sky-100 p-3">
            <Wallet className="h-6 w-6 text-sky-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Stock remaining</p>
            <p className="text-xl font-bold">{formatNumber(totalStock)} L</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Today&apos;s fuel sales</h2>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v: number) => [formatNumber(v) + " L", "Sold"]} />
                <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Liters" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 py-8 text-center">No meter readings for today yet.</p>
          )}
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Stock by tank</h2>
          {tanks.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={tanks.map((t) => ({ name: t.name, value: t.currentStockLiters }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${formatNumber(value)} L`}
                >
                  {tanks.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [formatNumber(v) + " L", "Stock"]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 py-8 text-center">No tanks added yet.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Tanker received today
        </h2>
        {deliveries.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Company</th>
                  <th className="pb-2 font-medium">Invoice</th>
                  <th className="pb-2 font-medium">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100">
                    <td className="py-2">{d.tankerCompany}</td>
                    <td className="py-2">{d.invoiceNumber}</td>
                    <td className="py-2">{formatNumber(d.quantityLiters)} L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500">No tanker deliveries for today.</p>
        )}
      </div>
    </div>
  );
}

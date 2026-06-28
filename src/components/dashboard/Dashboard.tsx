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
import { Truck } from "lucide-react";
import FuelLoader from "@/components/FuelLoader";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { StatTile, EmptyState } from "@/components/ui";

const today = new Date().toISOString().split("T")[0];

const CHART_COLORS = ["#b45309", "#1e293b", "#eab308", "#047857", "#0ea5e9"];

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

  // Low-stock tanks (< 15% of capacity)
  const lowStockTanks = tanks.filter(
    (t) => t.capacityLiters > 0 && t.currentStockLiters / t.capacityLiters < 0.15,
  );

  const chartData = Object.entries(fuelSoldByType).map(([name, value]) => ({
    name,
    value,
  }));

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();

  if (loading) {
    return <FuelLoader className="min-h-[40vh]" />;
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">
            {greeting} <em>— today&apos;s pump.</em>
          </h1>
          <p className="page-sub">{formatDate(today)}</p>
        </div>
      </div>

      {lowStockTanks.length > 0 && (
        <div className="banner banner-danger">
          <span>
            <strong>{lowStockTanks.length}</strong> tank
            {lowStockTanks.length > 1 ? "s" : ""} low on stock —{" "}
            {lowStockTanks.map((t) => t.name).join(", ")}. Schedule a delivery.
          </span>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatTile label="Petrol sold" value={`${formatNumber(totalPetrol)} L`} note="Today" />
        <StatTile label="Diesel sold" value={`${formatNumber(totalDiesel)} L`} note="Today" />
        <StatTile
          label="Revenue"
          value={formatCurrency(totalRevenue)}
          note="Collected today"
        />
        <StatTile
          label="Stock remaining"
          value={`${formatNumber(totalStock)} L`}
          note={`${tanks.length} tank${tanks.length === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Tanker received"
          value={`${formatNumber(totalTankerReceived)} L`}
          note="Today"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="card lg:col-span-2">
          <div className="card-head">
            <div>
              <div className="card-title">Today&apos;s fuel sales</div>
              <div className="card-subtitle">Litres by fuel type</div>
            </div>
          </div>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={{ stroke: "#e8e3dc" }} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(15,23,42,0.04)" }}
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid #e8e3dc",
                    fontSize: "12px",
                    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                  }}
                  formatter={(v: number) => [formatNumber(v) + " L", "Sold"]}
                />
                <Bar dataKey="value" fill="#b45309" radius={[6, 6, 0, 0]} name="Litres" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No meter readings yet" hint="Enter today's readings to see sales." />
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Stock by tank</div>
              <div className="card-subtitle">Current litres</div>
            </div>
          </div>
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
                  label={({ name, value }) => `${name}: ${formatNumber(value as number)} L`}
                  style={{ fontSize: "11px" }}
                >
                  {tanks.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid #e8e3dc",
                    fontSize: "12px",
                    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                  }}
                  formatter={(v: number) => [formatNumber(v) + " L", "Stock"]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No tanks added yet" hint="Add a tank to track stock." />
          )}
        </div>
      </div>

      {/* Tanker received */}
      <div className="card">
        <div className="card-head">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-ink-500" />
            <div className="card-title">Tanker received today</div>
          </div>
        </div>
        {deliveries.length ? (
          isMobile ? (
            <ul className="space-y-3 list-none p-0 m-0">
              {deliveries.map((d) => (
                <li key={d.id}>
                  <div className="mobile-list-card">
                    <p className="mobile-list-card-title">{d.tankerCompany}</p>
                    <p className="mobile-list-card-row">Invoice: {d.invoiceNumber}</p>
                    <p className="mobile-list-card-row">
                      Quantity: {formatNumber(d.quantityLiters)} L
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="table-container">
              <table className="table">
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
                      <td className="num">{formatNumber(d.quantityLiters)} L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <EmptyState title="No tanker deliveries today" />
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTankerDeliveriesByDate, addTankerDelivery, getTanks, getFuelTypes } from "@/lib/db";
import type { TankerDelivery, Tank, FuelType } from "@/types";
import { formatNumber, formatDate } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

const today = new Date().toISOString().split("T")[0];

export default function TankerDeliveriesPage() {
  const { profile } = useAuth();
  const [deliveries, setDeliveries] = useState<TankerDelivery[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState("");
  const [invoice, setInvoice] = useState("");
  const [fuelTypeId, setFuelTypeId] = useState("");
  const [tankId, setTankId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getTanks(), getFuelTypes()]).then(([t, f]) => {
      setTanks(t);
      setFuelTypes(f);
      if (f.length && !fuelTypeId) setFuelTypeId(f[0].id);
      if (t.length && !tankId) setTankId(t[0].id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getTankerDeliveriesByDate(date).then(setDeliveries);
  }, [date]);

  const tanksForFuel = tanks.filter((t) => t.fuelTypeId === fuelTypeId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !invoice.trim() || !fuelTypeId || !tankId || !quantity || !profile) return;
    const tank = tanksForFuel.find((t) => t.id === tankId) ?? tanks.find((t) => t.id === tankId);
    if (!tank) return;
    setSaving(true);
    try {
      await addTankerDelivery(
        {
          date,
          tankerCompany: company.trim(),
          invoiceNumber: invoice.trim(),
          fuelTypeId,
          quantityLiters: Number(quantity),
          enteredBy: profile.email,
        },
        tankId
      );
      await logAudit(profile.uid, profile.email, "CREATE", "tankerDelivery", `${company} - ${quantity} L`);
      setCompany("");
      setInvoice("");
      setQuantity("");
      setDeliveries(await getTankerDeliveriesByDate(date));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tanker Delivery Entry</h1>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Record delivery</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label htmlFor="tanker-date" className="label">Date</label>
            <input
              id="tanker-date"
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Delivery date"
            />
          </div>
          <div>
            <label htmlFor="tanker-company" className="label">Tanker company</label>
            <input
              id="tanker-company"
              className="input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
              required
              aria-label="Tanker company name"
            />
          </div>
          <div>
            <label htmlFor="tanker-invoice" className="label">Invoice number</label>
            <input
              id="tanker-invoice"
              className="input"
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
              required
              aria-label="Invoice number"
            />
          </div>
          <div>
            <label htmlFor="tanker-fuel-type" className="label">Fuel type</label>
            <select
              id="tanker-fuel-type"
              className="input"
              value={fuelTypeId}
              onChange={(e) => setFuelTypeId(e.target.value)}
              aria-label="Fuel type"
            >
              {fuelTypes.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tanker-tank" className="label">Tank</label>
            <select id="tanker-tank" className="input" value={tankId} onChange={(e) => setTankId(e.target.value)} aria-label="Tank">
              {tanksForFuel.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tanker-quantity" className="label">Quantity received (L)</label>
            <input
              id="tanker-quantity"
              type="number"
              step="any"
              min="0"
              className="input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              aria-label="Quantity received in liters"
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Add delivery (stock will be updated)"}
            </button>
          </div>
        </form>
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Deliveries for {formatDate(date)}</h2>
        {deliveries.length === 0 ? (
          <p className="text-slate-500">No deliveries for this date.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Company</th>
                  <th className="pb-2 font-medium">Invoice</th>
                  <th className="pb-2 font-medium">Fuel</th>
                  <th className="pb-2 font-medium">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => {
                  const ft = fuelTypes.find((f) => f.id === d.fuelTypeId);
                  return (
                    <tr key={d.id} className="border-b border-slate-100">
                      <td className="py-2">{d.tankerCompany}</td>
                      <td className="py-2">{d.invoiceNumber}</td>
                      <td className="py-2">{ft?.name ?? "-"}</td>
                      <td className="py-2">{formatNumber(d.quantityLiters)} L</td>
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

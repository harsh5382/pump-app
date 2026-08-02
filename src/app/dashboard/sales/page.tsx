"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useOrg } from "@/context/OrgContext";
import {
  getMeterReadingsByDate,
  getNozzles,
  getFuelTypes,
  getPaymentsByDate,
} from "@/lib/db";
import type { MeterReading, Nozzle, FuelType, PaymentEntry, PaymentType } from "@/types";
import { formatNumber, formatCurrency, formatDate, isoLocal } from "@/lib/utils";
import DatePicker from "@/components/DatePicker";
import FuelLoader from "@/components/FuelLoader";
import { EmptyState, StatTile } from "@/components/ui";
import { CreditCard, Gauge, Info } from "lucide-react";

// `toISOString()` is UTC, which rolls the day over at 5:30pm IST — the page
// used to open on tomorrow's (empty) date every evening.
const today = isoLocal(new Date());

/** Display order and wording mirror the Payments page's own type list. */
const PAYMENT_LABELS: Record<PaymentType, string> = {
  cash: "Cash",
  upi: "UPI",
  credit_card: "Credit Card",
  fleet_card: "Fleet Card",
  credit_customer: "Credit Customer",
};
const PAYMENT_ORDER = Object.keys(PAYMENT_LABELS) as PaymentType[];

export default function SalesPage() {
  const { hasCapability } = useOrg();
  const [nozzles, setNozzles] = useState<Nozzle[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [assetsError, setAssetsError] = useState(false);
  const [dayLoading, setDayLoading] = useState(true);
  const [dayError, setDayError] = useState(false);

  const isAdmin = hasCapability("report.view");

  // Machines and fuel types don't change with the date, so they load once
  // rather than on every date change.
  const loadAssets = useCallback(() => {
    setLoading(true);
    setAssetsError(false);
    Promise.all([getNozzles(), getFuelTypes()])
      .then(([n, f]) => {
        setNozzles(n);
        setFuelTypes(f);
      })
      // Without this a failed fetch settled into a page of zeroes, which reads
      // as "this outlet sold nothing today".
      .catch(() => setAssetsError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(loadAssets, [loadAssets]);

  // A quick run of date changes — or a retry fired while the first request is
  // still out — must not let an older response land after a newer one, or the
  // page would summarise the wrong day. Only the latest request may write.
  const requestId = useRef(0);
  const loadDay = useCallback(async () => {
    const id = ++requestId.current;
    setDayLoading(true);
    setDayError(false);
    try {
      const [r, p] = await Promise.all([
        getMeterReadingsByDate(date),
        getPaymentsByDate(date),
      ]);
      if (id !== requestId.current) return;
      setReadings(r);
      setPayments(p);
    } catch {
      if (id === requestId.current) setDayError(true);
    } finally {
      if (id === requestId.current) setDayLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  // Readings whose nozzle no longer exists used to be dropped silently, so the
  // total under-reported the day. They are counted under "Unknown" instead.
  const litresByFuel: Record<string, number> = {};
  readings.forEach((r) => {
    const nozzle = nozzles.find((n) => n.id === r.nozzleId);
    const name = nozzle
      ? (fuelTypes.find((f) => f.id === nozzle.fuelTypeId)?.name ?? "Unknown")
      : "Unknown";
    litresByFuel[name] = (litresByFuel[name] ?? 0) + (r.fuelSold ?? 0);
  });

  const fuelRows = Object.entries(litresByFuel)
    .map(([name, litres]) => ({ name, litres }))
    .sort((a, b) => b.litres - a.litres);
  const totalLitres = fuelRows.reduce((s, f) => s + f.litres, 0);
  const machinesReporting = new Set(readings.map((r) => r.nozzleId)).size;

  const paymentRows = PAYMENT_ORDER.map((type) => ({
    type,
    amount: payments
      .filter((p) => p.paymentType === type)
      .reduce((s, p) => s + p.amount, 0),
    count: payments.filter((p) => p.paymentType === type).length,
  })).filter((row) => row.count > 0);
  const totalPayments = payments.reduce((s, p) => s + p.amount, 0);

  // What a litre actually fetched today. Only meaningful once both sides of the
  // day are in, so it stays blank rather than showing a misleading ₹0.
  const realisation =
    totalLitres > 0 && totalPayments > 0 ? totalPayments / totalLitres : null;

  if (loading) {
    return <FuelLoader />;
  }

  const dimmed = dayLoading ? { opacity: 0.55 } : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="page-title">Daily Sales</h1>
          <p className="page-sub max-w-[68ch]">
            Litres dispensed and money collected for one business day. Every figure here is
            calculated from meter readings and payment entries — nothing is typed in on this
            page.
          </p>
        </div>
        <div className="shrink-0 w-full sm:w-48">
          <label htmlFor="sales-date" className="label mb-1.5">
            Date
          </label>
          <DatePicker
            id="sales-date"
            value={date}
            onChange={setDate}
            aria-label="Sales date"
            floatingLabel={false}
          />
        </div>
      </div>

      {assetsError ? (
        <div className="card">
          <EmptyState
            icon={<Gauge className="h-7 w-7" />}
            title="Couldn't load machines"
            hint="The machine and fuel-type list didn't come through, so sales can't be broken down. Check the connection and try again."
            action={
              <button type="button" className="btn btn-primary" onClick={loadAssets}>
                Try again
              </button>
            }
          />
        </div>
      ) : (
        <>
          {dayError && (
            <div className="banner banner-danger">
              <span>
                Couldn&apos;t load figures for {formatDate(date)}. The summary below may be
                out of date.
              </span>
              <button
                type="button"
                className="btn btn-sm btn-ghost ml-auto shrink-0"
                onClick={loadDay}
              >
                Try again
              </button>
            </div>
          )}

          <div className="space-y-4 sm:space-y-6 transition-opacity" aria-busy={dayLoading}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4" style={dimmed}>
              <StatTile
                label="Fuel sold"
                value={
                  <>
                    {formatNumber(totalLitres)}
                    <span className="unit">L</span>
                  </>
                }
                note={
                  nozzles.length === 0
                    ? "No machines set up"
                    : `${machinesReporting} of ${nozzles.length} machine${
                        nozzles.length === 1 ? "" : "s"
                      } reported`
                }
              />
              <StatTile
                label="Payments collected"
                value={formatCurrency(totalPayments)}
                note={
                  payments.length === 0
                    ? "No entries yet"
                    : `${payments.length} entr${payments.length === 1 ? "y" : "ies"}`
                }
              />
              <StatTile
                label="Avg. realisation"
                value={
                  realisation === null ? (
                    "—"
                  ) : (
                    <>
                      ₹{formatNumber(realisation)}
                      <span className="unit">/L</span>
                    </>
                  )
                }
                note={
                  realisation === null
                    ? "Needs readings and payments"
                    : "Payments ÷ litres sold"
                }
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6" style={dimmed}>
              <div className="card">
                <div className="card-head">
                  <div className="min-w-0">
                    <h2 className="card-title">Fuel sold by type</h2>
                    <p className="card-subtitle">From meter readings · {formatDate(date)}</p>
                  </div>
                </div>
                {fuelRows.length === 0 ? (
                  <EmptyState
                    icon={<Gauge className="h-7 w-7" />}
                    title="No meter readings for this date"
                    hint="Sales are calculated from opening and closing meters. Record them to see the day's litres."
                    action={
                      <Link href="/dashboard/meter-readings" className="btn btn-primary">
                        Enter meter readings
                      </Link>
                    }
                  />
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th className="whitespace-nowrap">Fuel</th>
                          <th className="cell-num whitespace-nowrap">Litres</th>
                          <th className="cell-num whitespace-nowrap w-[11.5rem]">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fuelRows.map((f) => {
                          const share = totalLitres > 0 ? f.litres / totalLitres : 0;
                          return (
                            <tr key={f.name}>
                              <td className="whitespace-nowrap font-medium text-ink-900">
                                {f.name}
                              </td>
                              <td className="cell-num whitespace-nowrap">
                                <span className="num text-ink-900">
                                  {formatNumber(f.litres)}
                                  <span className="unit">L</span>
                                </span>
                              </td>
                              <td className="cell-num whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2.5">
                                  <div className="gauge hidden sm:block" aria-hidden>
                                    <div
                                      className="gauge-fill"
                                      style={{
                                        width: `${Math.min(100, Math.max(0, share * 100))}%`,
                                      }}
                                    />
                                  </div>
                                  {/* The percent sign hugs its figure, so it
                                      stays in the mono face rather than taking
                                      the sans `.unit` treatment. */}
                                  <span className="num text-ink-500">
                                    {formatNumber(share * 100, 1)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>Total</td>
                          <td className="cell-num whitespace-nowrap">
                            <span className="num">
                              {formatNumber(totalLitres)}
                              <span className="unit">L</span>
                            </span>
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              <div className="card flex flex-col">
                <div className="card-head">
                  <div className="min-w-0">
                    <h2 className="card-title">Payments received</h2>
                    <p className="card-subtitle">Collected · {formatDate(date)}</p>
                  </div>
                </div>
                {paymentRows.length === 0 ? (
                  <EmptyState
                    icon={<CreditCard className="h-7 w-7" />}
                    title="No payments recorded for this date"
                    hint="Record what was collected — cash, UPI, cards — to reconcile it against the fuel sold."
                    action={
                      <Link href="/dashboard/payments" className="btn btn-primary">
                        Record payments
                      </Link>
                    }
                  />
                ) : (
                  <>
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th className="whitespace-nowrap">Method</th>
                            <th className="cell-num whitespace-nowrap">Entries</th>
                            <th className="cell-num whitespace-nowrap">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentRows.map((p) => (
                            <tr key={p.type}>
                              <td className="whitespace-nowrap font-medium text-ink-900">
                                {PAYMENT_LABELS[p.type]}
                              </td>
                              <td className="cell-num whitespace-nowrap">
                                <span className="num text-ink-500">{p.count}</span>
                              </td>
                              <td className="cell-num whitespace-nowrap">
                                <span className="num text-ink-900">
                                  {formatCurrency(p.amount)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={2}>Total</td>
                            <td className="cell-num whitespace-nowrap">
                              <span className="num">{formatCurrency(totalPayments)}</span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <p className="text-[12px] text-ink-500 mt-auto pt-4 border-t border-line">
                      Collections should account for the fuel sold above.{" "}
                      <Link
                        href="/dashboard/payments"
                        className="text-accent font-medium underline underline-offset-2"
                      >
                        Reconcile on Payments
                      </Link>
                      , where an expected total can be entered and checked against these
                      entries.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {isAdmin && !assetsError && (
        <div className="card flex items-start gap-3">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-ink-400" aria-hidden />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-ink-900">
              Sales are calculated, not entered
            </p>
            <p className="text-[13px] text-ink-500 mt-1 max-w-[68ch]">
              Litres come straight from each machine&apos;s opening and closing meter, so a
              figure here can only be corrected at its source.{" "}
              <Link
                href="/dashboard/meter-readings"
                className="text-accent font-medium underline underline-offset-2"
              >
                Edit the meter reading
              </Link>{" "}
              for the date and this summary follows.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

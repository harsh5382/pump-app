"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { useToast } from "@/components/ui/Toast";
import {
  getNozzles,
  getFuelTypes,
  getMeterReadingsByDate,
  saveMeterReading,
  updateMeterReading,
  deleteMeterReading,
} from "@/lib/db";
import type { Nozzle, FuelType, MeterReading } from "@/types";
import { formatNumber, formatDate } from "@/lib/utils";
import { useMediaQuery } from "@/lib/useMediaQuery";
import ConfirmDialog from "@/components/ConfirmDialog";
import DatePicker from "@/components/DatePicker";
import FuelLoader from "@/components/FuelLoader";
import { EmptyState } from "@/components/ui";
import { Trash2, Check, Gauge } from "lucide-react";

const today = new Date().toISOString().split("T")[0];

/** Blank stays blank — `Number("")` is 0, which would read as a real meter of zero. */
function parseMeter(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

/** Everything a single machine's row needs to decide what it shows and whether it can save. */
type Row = {
  openingRaw: string;
  closingRaw: string;
  opening: number | null;
  closing: number | null;
  sold: number | null;
  saved: MeterReading | undefined;
  dirty: boolean;
  error: string | null;
  canSave: boolean;
};

export default function MeterReadingsPage() {
  const { profile } = useAuth();
  const { hasCapability } = useOrg();
  const toast = useToast();
  const [nozzles, setNozzles] = useState<Nozzle[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [readingsLoading, setReadingsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [opening, setOpening] = useState<Record<string, string>>({});
  const [closing, setClosing] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<MeterReading | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isAdmin = hasCapability("reading.enter");
  const isMobile = useMediaQuery("(max-width: 768px)");

  const loadAssets = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    Promise.all([getNozzles(), getFuelTypes()])
      .then(([n, f]) => {
        setNozzles(n);
        setFuelTypes(f);
      })
      // Without this the page used to settle into an empty table with no
      // explanation, which reads as "this outlet has no machines".
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(loadAssets, [loadAssets]);

  useEffect(() => {
    let stale = false;
    setReadingsLoading(true);
    getMeterReadingsByDate(date)
      .then((r) => {
        if (stale) return;
        setReadings(r);
        const o: Record<string, string> = {};
        const c: Record<string, string> = {};
        r.forEach((x) => {
          o[x.nozzleId] = String(x.openingMeter);
          c[x.nozzleId] = String(x.closingMeter);
        });
        setOpening(o);
        setClosing(c);
      })
      .catch(() => {
        if (!stale) toast.error("Couldn't load readings for this date.");
      })
      .finally(() => {
        if (!stale) setReadingsLoading(false);
      });
    // A fast run of date changes must not let an older response overwrite a
    // newer one — the grid would then be editing yesterday's figures.
    return () => {
      stale = true;
    };
  }, [date, toast]);

  function rowFor(n: Nozzle): Row {
    const saved = readings.find((x) => x.nozzleId === n.id);
    const openingRaw = opening[n.id] ?? (saved ? String(saved.openingMeter) : "");
    const closingRaw = closing[n.id] ?? (saved ? String(saved.closingMeter) : "");
    const o = parseMeter(openingRaw);
    const c = parseMeter(closingRaw);

    let error: string | null = null;
    if ((o !== null && o < 0) || (c !== null && c < 0)) {
      error = "Meter readings can't be negative.";
    } else if (o !== null && c !== null && c < o) {
      error = "Closing must be at or above opening.";
    } else if ((o === null) !== (c === null)) {
      error = "Enter both opening and closing.";
    } else if (saved && o === null && c === null) {
      // Clearing both fields looks like an erase, but a saved reading can only
      // be removed by deleting it — say so instead of just blocking Save.
      error = isAdmin
        ? "Enter both values, or remove the reading with Delete."
        : "Enter both opening and closing.";
    }

    const complete = o !== null && c !== null && !error;
    const dirty = saved
      ? o !== saved.openingMeter || c !== saved.closingMeter
      : o !== null || c !== null;

    return {
      openingRaw,
      closingRaw,
      opening: o,
      closing: c,
      sold: complete ? c! - o! : null,
      saved,
      dirty,
      error,
      canSave: complete && dirty,
    };
  }

  const rows = nozzles.map((n) => ({ nozzle: n, row: rowFor(n) }));
  const recorded = rows.filter(({ row }) => row.saved).length;
  const totalSold = rows.reduce((sum, { row }) => sum + (row.sold ?? 0), 0);
  const unsaved = rows.filter(({ row }) => row.dirty).length;

  async function handleSave(nozzleId: string) {
    if (!profile) return;
    const entry = rows.find(({ nozzle }) => nozzle.id === nozzleId);
    if (!entry || !entry.row.canSave) return;
    const { opening: o, closing: c, saved: existing } = entry.row;
    setSaving(nozzleId);
    try {
      if (existing) {
        await updateMeterReading(existing.id, { openingMeter: o!, closingMeter: c! });
      } else {
        await saveMeterReading({
          nozzleId,
          date,
          openingMeter: o!,
          closingMeter: c!,
          enteredBy: profile.email,
        });
      }
      const fresh = await getMeterReadingsByDate(date);
      setReadings(fresh);
      const oMap: Record<string, string> = {};
      const cMap: Record<string, string> = {};
      fresh.forEach((x) => {
        oMap[x.nozzleId] = String(x.openingMeter);
        cMap[x.nozzleId] = String(x.closingMeter);
      });
      // Merge, never replace: other rows may hold edits the operator has not
      // saved yet.
      setOpening((prev) => ({ ...prev, ...oMap }));
      setClosing((prev) => ({ ...prev, ...cMap }));
      toast.success("Meter reading saved successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(null);
    }
  }

  async function handleDeleteReading() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMeterReading(deleteTarget.id);
      setDeleteTarget(null);
      setReadings(await getMeterReadingsByDate(date));
      setOpening((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.nozzleId];
        return next;
      });
      setClosing((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.nozzleId];
        return next;
      });
      toast.success("Meter reading deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <FuelLoader />;
  }

  const meterInput =
    "input h-9 text-[13px] font-mono tabular-nums text-right w-full min-w-0";

  /** Save is deliberately three-state: actionable, in flight, or already stored. */
  function saveState(row: Row, nozzleId: string) {
    const inFlight = saving === nozzleId;
    const stored = !!row.saved && !row.dirty;
    return {
      inFlight,
      stored,
      disabled: inFlight || !row.canSave,
      label: inFlight ? "Saving…" : stored ? "Saved" : "Save reading",
    };
  }

  function spinner() {
    return (
      <span
        className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
        aria-hidden
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Daily Meter Readings</h1>
        <p className="page-sub max-w-[68ch]">
          Enter morning opening and evening closing meter for each machine. Fuel sold = Closing −
          Opening.
        </p>
      </div>

      <div className="card">
        <div className="card-head flex-col items-stretch gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <h2 className="card-title">Readings for {formatDate(date)}</h2>
            <p className="card-subtitle" aria-live="polite">
              {nozzles.length === 0
                ? "No machines"
                : `${recorded} of ${nozzles.length} machines recorded${
                    unsaved > 0 ? ` · ${unsaved} unsaved` : ""
                  }`}
            </p>
          </div>
          <div className="shrink-0 sm:w-48">
            <label htmlFor="meter-readings-date" className="label mb-1.5">
              Date
            </label>
            <DatePicker
              id="meter-readings-date"
              value={date}
              onChange={setDate}
              aria-label="Reading date"
              floatingLabel={false}
            />
          </div>
        </div>

        {loadError ? (
          <EmptyState
            icon={<Gauge className="h-7 w-7" />}
            title="Couldn't load machines"
            hint="The machine list didn't come through. Check the connection and try again."
            action={
              <button type="button" className="btn btn-primary" onClick={loadAssets}>
                Try again
              </button>
            }
          />
        ) : nozzles.length === 0 ? (
          <EmptyState
            icon={<Gauge className="h-7 w-7" />}
            title="No dispensing machines yet"
            hint="Add your machines and nozzles first — daily readings are recorded against them."
            action={
              <Link href="/dashboard/nozzles" className="btn btn-primary">
                Go to Nozzles
              </Link>
            }
          />
        ) : isMobile ? (
          <ul
            className="space-y-3 list-none p-0 m-0 transition-opacity"
            aria-busy={readingsLoading}
            style={readingsLoading ? { opacity: 0.55 } : undefined}
          >
            {rows.map(({ nozzle: n, row }) => {
              const ft = fuelTypes.find((f) => f.id === n.fuelTypeId);
              const s = saveState(row, n.id);
              const errId = `meter-error-${n.id}`;
              return (
                <li key={n.id}>
                  <div className="mobile-list-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="mobile-list-card-title">Machine {n.machineNumber}</p>
                        <p className="mobile-list-card-row">Fuel type: {ft?.name ?? "—"}</p>
                      </div>
                      {row.dirty ? (
                        <span className="badge badge-warn">Unsaved</span>
                      ) : row.saved ? (
                        <span className="badge badge-success">Saved</span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-3">
                      <div>
                        <label htmlFor={`opening-mobile-${n.id}`} className="label mb-1">
                          Opening
                        </label>
                        <input
                          id={`opening-mobile-${n.id}`}
                          type="number"
                          step="any"
                          min="0"
                          inputMode="decimal"
                          className={meterInput}
                          value={row.openingRaw}
                          disabled={readingsLoading}
                          aria-invalid={!!row.error}
                          aria-describedby={row.error ? errId : undefined}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) =>
                            setOpening((prev) => ({ ...prev, [n.id]: e.target.value }))
                          }
                          aria-label={`Opening meter for machine ${n.machineNumber}`}
                        />
                      </div>
                      <div>
                        <label htmlFor={`closing-mobile-${n.id}`} className="label mb-1">
                          Closing
                        </label>
                        <input
                          id={`closing-mobile-${n.id}`}
                          type="number"
                          step="any"
                          min="0"
                          inputMode="decimal"
                          className={meterInput}
                          value={row.closingRaw}
                          disabled={readingsLoading}
                          aria-invalid={!!row.error}
                          aria-describedby={row.error ? errId : undefined}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) =>
                            setClosing((prev) => ({ ...prev, [n.id]: e.target.value }))
                          }
                          aria-label={`Closing meter for machine ${n.machineNumber}`}
                        />
                      </div>
                    </div>
                    {row.error && (
                      <p id={errId} className="text-[12px] text-danger pt-2">
                        {row.error}
                      </p>
                    )}
                    <p className="mobile-list-card-row pt-2 text-ink-700">
                      Sold:{" "}
                      {row.sold === null ? (
                        <span className="text-ink-400">—</span>
                      ) : (
                        <span className="num font-medium">
                          {formatNumber(row.sold)}
                          <span className="unit">L</span>
                        </span>
                      )}
                    </p>
                    <div className="mobile-list-card-actions flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn btn-primary min-h-[44px] flex-1"
                        disabled={s.disabled}
                        onClick={() => handleSave(n.id)}
                        aria-label={s.label}
                      >
                        {s.inFlight ? spinner() : <Check className="h-4 w-4" />}
                        <span>{s.inFlight ? "Saving…" : s.stored ? "Saved" : "Save"}</span>
                      </button>
                      {isAdmin && row.saved && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row.saved!)}
                          className="btn btn-danger min-h-[44px] flex-1"
                          aria-label={`Delete reading for machine ${n.machineNumber}`}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
            <li>
              <div className="mobile-list-card mobile-list-card-total">
                <p className="mobile-list-card-row flex items-center justify-between">
                  <span>Total sold</span>
                  <span className="num font-medium text-ink-900">
                    {formatNumber(totalSold)}
                    <span className="unit">L</span>
                  </span>
                </p>
              </div>
            </li>
          </ul>
        ) : (
          <div
            className="table-container transition-opacity"
            aria-busy={readingsLoading}
            style={readingsLoading ? { opacity: 0.55 } : undefined}
          >
            <table className="table">
              <thead>
                <tr>
                  <th className="whitespace-nowrap">Machine</th>
                  <th className="whitespace-nowrap">Fuel type</th>
                  <th className="cell-num whitespace-nowrap w-[8.5rem]">Opening</th>
                  <th className="cell-num whitespace-nowrap w-[8.5rem]">Closing</th>
                  <th className="cell-num whitespace-nowrap w-[7rem]">Sold</th>
                  <th className="whitespace-nowrap w-[6.5rem]">
                    <span className="sr-only">Row actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ nozzle: n, row }) => {
                  const ft = fuelTypes.find((f) => f.id === n.fuelTypeId);
                  const s = saveState(row, n.id);
                  const errId = `meter-error-${n.id}`;
                  return (
                    <tr key={n.id}>
                      <td className="whitespace-nowrap font-medium text-ink-900">
                        {n.machineNumber}
                      </td>
                      <td className="whitespace-nowrap">{ft?.name ?? "—"}</td>
                      <td>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          inputMode="decimal"
                          className={meterInput}
                          value={row.openingRaw}
                          disabled={readingsLoading}
                          aria-invalid={!!row.error}
                          aria-describedby={row.error ? errId : undefined}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) =>
                            setOpening((prev) => ({ ...prev, [n.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave(n.id);
                          }}
                          aria-label={`Opening meter for machine ${n.machineNumber}`}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          inputMode="decimal"
                          className={meterInput}
                          value={row.closingRaw}
                          disabled={readingsLoading}
                          aria-invalid={!!row.error}
                          aria-describedby={row.error ? errId : undefined}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) =>
                            setClosing((prev) => ({ ...prev, [n.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave(n.id);
                          }}
                          aria-label={`Closing meter for machine ${n.machineNumber}`}
                        />
                        {row.error && (
                          <p id={errId} className="text-[11px] leading-snug text-danger mt-1">
                            {row.error}
                          </p>
                        )}
                      </td>
                      <td className="cell-num whitespace-nowrap">
                        {row.sold === null ? (
                          <span className="text-ink-400">—</span>
                        ) : (
                          <span className="num font-medium text-ink-900">
                            {formatNumber(row.sold)}
                            <span className="unit">L</span>
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className={
                              s.stored
                                ? "p-1.5 rounded-lg bg-success-soft text-success"
                                : "btn-icon-primary"
                            }
                            disabled={s.disabled}
                            onClick={() => handleSave(n.id)}
                            aria-label={s.label}
                            title={s.label}
                          >
                            {s.inFlight ? spinner() : <Check className="h-4 w-4" />}
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(row.saved!)}
                              className="btn-icon-delete"
                              disabled={!row.saved}
                              aria-label={`Delete reading for machine ${n.machineNumber}`}
                              title="Delete reading"
                              // Kept mounted so the action column never reflows
                              // as rows are saved and cleared.
                              style={row.saved ? undefined : { visibility: "hidden" }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="cell-num">
                    Total sold
                  </td>
                  <td className="cell-num whitespace-nowrap">
                    <span className="num">
                      {formatNumber(totalSold)}
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete meter reading"
        message={
          deleteTarget
            ? "Delete this meter reading? Fuel sold will be removed for this nozzle/date."
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteReading}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}

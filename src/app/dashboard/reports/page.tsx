"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import {
  getExpensesDateRange,
  getFuelTypes,
  getMeterReadingsDateRange,
  getNozzles,
  getPaymentsDateRange,
  getShiftsDateRange,
  getTankerDeliveriesDateRange,
} from "@/lib/db";
import { useOrg } from "@/context/OrgContext";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui";
import { formatDate, isoLocal } from "@/lib/utils";
import { exportToExcel, exportToPdf } from "@/lib/exportReport";
import DatePicker from "@/components/DatePicker";
import FuelLoader from "@/components/FuelLoader";
import ReportResult from "./ReportResult";
import {
  buildReport,
  REPORT_TYPES,
  SALES_REPORTS,
  toPdfRows,
  toSheetRows,
  type ReportData,
  type ReportType,
} from "./reportModel";

const TODAY = isoLocal(new Date());

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "week", label: "Last 7 days" },
  { key: "month", label: "This month" },
  { key: "lastMonth", label: "Last month" },
] as const;

type PresetKey = (typeof PRESETS)[number]["key"];

function presetRange(key: PresetKey): [string, string] {
  const now = new Date();
  switch (key) {
    case "today":
      return [isoLocal(now), isoLocal(now)];
    case "week": {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return [isoLocal(from), isoLocal(now)];
    }
    case "lastMonth": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return [isoLocal(from), isoLocal(to)];
    }
    case "month":
    default:
      return [isoLocal(new Date(now.getFullYear(), now.getMonth(), 1)), isoLocal(now)];
  }
}

export default function ReportsPage() {
  const toast = useToast();
  const { hasCapability, loading: orgLoading } = useOrg();

  const [reportType, setReportType] = useState<ReportType>("daily");
  const [[startDate, endDate], setRange] = useState<[string, string]>(() =>
    presetRange("month"),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [data, setData] = useState<ReportData>({});
  const [nozzles, setNozzles] = useState<{ id: string; fuelTypeId: string }[]>([]);
  const [fuelTypes, setFuelTypes] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getNozzles()
      .then(setNozzles)
      .catch(() => setNozzles([]));
    getFuelTypes()
      .then(setFuelTypes)
      .catch(() => setFuelTypes([]));
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (SALES_REPORTS.includes(reportType)) {
        const [readings, deliveries, payments] = await Promise.all([
          getMeterReadingsDateRange(startDate, endDate),
          getTankerDeliveriesDateRange(startDate, endDate),
          getPaymentsDateRange(startDate, endDate),
        ]);
        setData({ readings, deliveries, payments });
      } else if (reportType === "staff") {
        setData({ shifts: await getShiftsDateRange(startDate, endDate) });
      } else {
        setData({ expenses: await getExpensesDateRange(startDate, endDate) });
      }
    } catch (err) {
      setData({});
      setError(
        err instanceof Error
          ? err.message
          : "The report could not be loaded. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [reportType, startDate, endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const model = useMemo(
    () => buildReport(reportType, data, { nozzles, fuelTypes }),
    [reportType, data, nozzles, fuelTypes],
  );

  const activePreset = PRESETS.find((p) => {
    const [from, to] = presetRange(p.key);
    return from === startDate && to === endDate;
  })?.key;

  const rangeLabel =
    startDate === endDate
      ? formatDate(startDate)
      : `${formatDate(startDate)} – ${formatDate(endDate)}`;

  const canExport = orgLoading || hasCapability("report.export");
  const hasRows = model.rows.length > 0;
  const exportBlocked = !canExport
    ? "Your role cannot export reports."
    : !hasRows
      ? "There is nothing to export in this period."
      : undefined;

  async function handleExport(kind: "excel" | "pdf") {
    if (exportBlocked) return;
    const filename = `${reportType.replace("_", "-")}-${startDate}-to-${endDate}`;
    setExporting(kind);
    try {
      if (kind === "excel") {
        // Sheet cells are bare numbers, so the unit rides in the header.
        exportToExcel(toSheetRows(model), model.label, filename);
      } else {
        // PDF cells keep their unit inline, so plain headers are correct here.
        await exportToPdf(
          `${model.label} — ${rangeLabel}`,
          model.columns.map((c) => c.label),
          toPdfRows(model),
          filename,
        );
      }
      toast.success(
        `${kind === "excel" ? "Excel" : "PDF"} export saved as ${filename}.${
          kind === "excel" ? "xlsx" : "pdf"
        }`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "The export could not be generated. Try again.",
      );
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          {/* The topbar already says "Reports", so the page heading carries the
              thing that actually changes: which report, over which dates. */}
          <h1 className="page-title">
            {model.label} <em>— {rangeLabel}</em>
          </h1>
          <p className="page-sub">
            {REPORT_TYPES.find((r) => r.value === reportType)?.blurb}
          </p>
        </div>
      </div>

      <div className="card mb-6 sm:mb-8">
        <div className="flex flex-wrap items-end gap-4">
          <div className="field w-full sm:w-[210px]">
            <label htmlFor="report-type" className="label">
              Report type
            </label>
            <select
              id="report-type"
              className="input"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
            >
              {REPORT_TYPES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field w-[calc(50%-0.5rem)] sm:w-[170px]">
            <label htmlFor="report-from" className="label">
              From
            </label>
            <DatePicker
              id="report-from"
              value={startDate}
              onChange={(v) => setRange([v, endDate])}
              max={endDate}
              floatingLabel={false}
            />
          </div>

          <div className="field w-[calc(50%-0.5rem)] sm:w-[170px]">
            <label htmlFor="report-to" className="label">
              To
            </label>
            <DatePicker
              id="report-to"
              value={endDate}
              onChange={(v) => setRange([startDate, v])}
              min={startDate}
              max={TODAY}
              floatingLabel={false}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <button
              type="button"
              className="btn btn-ghost min-h-[44px] sm:min-h-0"
              onClick={loadReport}
              disabled={loading}
              aria-label="Reload this report"
              title="Reload this report"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                aria-hidden
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              className="btn btn-primary flex-1 sm:flex-none min-h-[44px] sm:min-h-0"
              onClick={() => handleExport("excel")}
              disabled={Boolean(exportBlocked) || loading || exporting !== null}
              title={exportBlocked ?? "Download this report as an Excel file"}
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              {exporting === "excel" ? "Preparing…" : "Excel"}
            </button>
            <button
              type="button"
              className="btn btn-ghost flex-1 sm:flex-none min-h-[44px] sm:min-h-0"
              onClick={() => handleExport("pdf")}
              disabled={Boolean(exportBlocked) || loading || exporting !== null}
              title={exportBlocked ?? "Download this report as a PDF"}
            >
              <FileText className="h-4 w-4" aria-hidden />
              {exporting === "pdf" ? "Preparing…" : "PDF"}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-2 mt-5 pt-5 border-t border-line">
          <span className="label shrink-0">Quick range</span>
          {/* Two-up on a phone, one row from sm — the strip never scrolls away. */}
          <div className="seg flex w-full flex-wrap sm:inline-flex sm:w-auto sm:flex-nowrap">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                className={`grow basis-[calc(50%-1px)] sm:grow-0 sm:basis-auto min-h-[36px] sm:min-h-0 ${
                  activePreset === preset.key ? "on" : ""
                }`}
                aria-pressed={activePreset === preset.key}
                onClick={() => setRange(presetRange(preset.key))}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="banner banner-danger">
          <span className="flex-1">{error}</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={loadReport}>
            Try again
          </button>
        </div>
      )}

      <div aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="card min-h-[300px] flex items-center justify-center">
            <FuelLoader size="sm" className="py-0 min-h-0" label="Building report" />
          </div>
        ) : error ? (
          <div className="card">
            <EmptyState
              title="Report unavailable"
              hint="Resolve the error above, then try again."
            />
          </div>
        ) : (
          <ReportResult model={model} />
        )}
      </div>
    </div>
  );
}

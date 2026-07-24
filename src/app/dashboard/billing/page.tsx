"use client";

import { useCallback, useEffect, useState } from "react";
import { useOrg } from "@/context/OrgContext";
import { getBillingOverview, type BillingOverview } from "@/server/billing/overview";
import { rupeesFromPaise } from "@/lib/plans";
import FuelLoader from "@/components/FuelLoader";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  trialing: { label: "Trial", tone: "bg-accent/10 text-accent" },
  active: { label: "Active", tone: "bg-emerald-500/10 text-emerald-700" },
  past_due: { label: "Payment due", tone: "bg-amber-500/15 text-amber-700" },
  grace_period: { label: "Grace period", tone: "bg-amber-500/15 text-amber-700" },
  cancelled_at_period_end: {
    label: "Cancels at period end",
    tone: "bg-amber-500/15 text-amber-700",
  },
  suspended: { label: "Suspended", tone: "bg-red-500/10 text-red-700" },
  cancelled: { label: "Cancelled", tone: "bg-red-500/10 text-red-700" },
};

function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Usage meter — turns amber/red as the org approaches its plan limit. */
function UsageBar({
  label,
  current,
  limit,
}: {
  label: string;
  current: number;
  limit: number;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
  const atLimit = current >= limit;
  const near = !atLimit && pct >= 80;
  const barTone = atLimit
    ? "bg-red-500"
    : near
      ? "bg-amber-500"
      : "bg-accent";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[13px] text-ink-700">{label}</span>
        <span
          className={`text-[13px] tabular-nums ${atLimit ? "text-red-700 font-medium" : "text-ink-500"}`}
        >
          {current} / {limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barTone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {atLimit && (
        <p className="text-[11px] text-red-700 mt-1">
          Limit reached — upgrade to add more.
        </p>
      )}
    </div>
  );
}

export default function BillingPage() {
  const { currentOrg, hasCapability, loading: orgLoading } = useOrg();
  const [data, setData] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const canManageBilling = hasCapability("org.manage_billing");

  const load = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      setData(await getBillingOverview(currentOrg.organisationId));
    } catch {
      setData({ ok: false, error: "Could not load billing details." });
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    if (orgLoading) return;
    if (!canManageBilling) {
      setLoading(false);
      return;
    }
    load();
  }, [orgLoading, canManageBilling, load]);

  if (orgLoading || loading) return <FuelLoader />;

  if (!canManageBilling) {
    return (
      <div className="page space-y-6">
        <div className="card">
          <p className="card-title mb-1">Billing</p>
          <p className="text-sm text-ink-500">
            Only the organisation owner can view billing.
          </p>
        </div>
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <div className="page space-y-6">
        <div className="card">
          <p className="card-title mb-1">Billing</p>
          <p className="text-sm text-ink-500">
            {data?.error ?? "Could not load billing details."}
          </p>
        </div>
      </div>
    );
  }

  const status = STATUS_LABEL[data.status ?? ""] ?? {
    label: data.status ?? "—",
    tone: "bg-[var(--bg-overlay)] text-ink-600",
  };
  const trialEnds = formatDate(data.trialEndsAt);
  const periodEnds = formatDate(data.currentPeriodEnd);
  const ent = data.entitlements!;
  const usage = data.usage!;

  return (
    <div className="page space-y-6">
      {/* Current plan */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="card-title mb-1">Current plan</div>
            <div className="serif text-[28px] leading-tight">
              {data.planName}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status.tone}`}
              >
                {status.label}
              </span>
              {trialEnds && data.status === "trialing" && (
                <span className="text-[12px] text-ink-500">
                  Trial ends {trialEnds}
                </span>
              )}
              {periodEnds && data.status !== "trialing" && (
                <span className="text-[12px] text-ink-500">
                  Renews {periodEnds}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Usage vs plan limits */}
      <div className="card">
        <div className="card-title mb-4">Usage this plan</div>
        <div className="space-y-4 max-w-md">
          <UsageBar
            label="Team members"
            current={usage.members}
            limit={ent.maxMembers}
          />
          <UsageBar label="Managers" current={usage.managers} limit={ent.maxManagers} />
          <UsageBar label="Outlets" current={usage.outlets} limit={ent.maxOutlets} />
        </div>
        <p className="text-[11px] text-ink-400 mt-4">
          Pending invitations count towards your member limit.
        </p>
      </div>

      {/* What's included */}
      <div className="card">
        <div className="card-title mb-3">Included</div>
        <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-[13px] text-ink-700 max-w-2xl">
          <li>Report history · {ent.reportHistoryDays} days</li>
          <li>Support · {ent.supportLevel}</li>
          <li>{ent.excelExport ? "✓" : "—"} Excel export</li>
          <li>{ent.pdfExport ? "✓" : "—"} PDF export</li>
          <li>{ent.whatsappAlerts ? "✓" : "—"} WhatsApp alerts</li>
          <li>{ent.accountingExport ? "✓" : "—"} Accounting export</li>
          <li>{ent.offlineSync ? "✓" : "—"} Offline sync</li>
          <li>{ent.apiAccess ? "✓" : "—"} API access</li>
        </ul>
      </div>

      {/* Upgrade options */}
      {data.upgradeOptions && data.upgradeOptions.length > 0 && (
        <div className="card">
          <div className="card-title mb-1">Upgrade</div>
          <p className="text-sm text-ink-500 mb-4">
            Need more outlets or a bigger team? Move up a plan.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.upgradeOptions.map((p) => (
              <div
                key={p.id}
                className="rounded-[12px] border border-line p-4 flex flex-col"
              >
                <div className="serif text-[20px]">{p.name}</div>
                <div className="text-[13px] text-ink-500 mt-0.5">
                  {p.pricePaise > 0
                    ? `${rupeesFromPaise(p.pricePaise)} / month`
                    : "Custom pricing"}
                </div>
                <ul className="text-[12px] text-ink-600 mt-3 space-y-1 flex-1">
                  <li>{p.maxOutlets} outlets</li>
                  <li>{p.maxMembers} team members</li>
                </ul>
                <button
                  type="button"
                  className="btn btn-primary w-full mt-4"
                  disabled
                  title="Online payments arrive with Razorpay billing"
                >
                  Upgrade
                </button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-ink-400 mt-4">
            Online payment is being connected. Contact support to change your plan
            in the meantime.
          </p>
        </div>
      )}
    </div>
  );
}

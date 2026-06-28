"use client";

import { cn } from "@/lib/utils";

/* ---------- Avatar ---------- */
const TONES = [
  "#0f172a", "#7c2d12", "#334155", "#4c1d95",
  "#065f46", "#831843", "#1e3a8a", "#78350f",
];

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function toneFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

export function Avatar({
  name,
  tone,
  size = "md",
  children,
}: {
  name?: string;
  tone?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children?: React.ReactNode;
}) {
  const cls =
    size === "sm"
      ? "avatar avatar-sm"
      : size === "lg"
        ? "avatar avatar-lg"
        : size === "xl"
          ? "avatar avatar-xl"
          : "avatar";
  return (
    <span className={cls} style={{ background: tone || toneFor(name || "") }}>
      {children ?? initials(name || "")}
    </span>
  );
}

/* ---------- Badge ---------- */
type BadgeTone = "success" | "warn" | "danger" | "neutral" | "accent";

export function Badge({
  tone = "neutral",
  dot = true,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("badge", `badge-${tone}`, !dot && "badge-no-dot")}>
      {children}
    </span>
  );
}

/* ---------- StatTile ---------- */
export function StatTile({
  label,
  value,
  note,
  tone,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: "danger" | "success";
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="stat"
      style={
        tone === "danger"
          ? { borderColor: "#fecaca" }
          : tone === "success"
            ? { borderColor: "#a7f3d0" }
            : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="stat-label">{label}</div>
        {icon && <span className="text-ink-400">{icon}</span>}
      </div>
      <div
        className="stat-value"
        style={tone === "danger" ? { color: "var(--danger)" } : undefined}
      >
        {value}
      </div>
      {note && <div className="stat-delta">{note}</div>}
    </div>
  );
}

/* ---------- Segmented ---------- */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? "on" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- EmptyState ---------- */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon && (
        <div className="flex justify-center mb-3 text-ink-400">{icon}</div>
      )}
      <div className="text-ink-700 font-medium">{title}</div>
      {hint && <div className="mt-1 text-sm text-ink-500">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

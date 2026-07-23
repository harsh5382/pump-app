"use client";

// ───────────────────────────────────────────────────────────────────────────
// Pumpline loader — "meter sweep".
// An amber comet glides across a thin gauge track beneath the serif monogram,
// echoing a fuel meter reading. Calm, editorial, vector-only, transform-based,
// and reduced-motion aware. Animation lives in globals.css (.fuel-*).
// ───────────────────────────────────────────────────────────────────────────

type FuelLoaderProps = {
  /** Full-screen centering (e.g. auth / ProtectedRoute) */
  fullScreen?: boolean;
  /** Visual size; default medium */
  size?: "sm" | "md" | "lg";
  /** Extra wrapper class (e.g. min-h, padding) */
  className?: string;
  /** Optional caption shown under the track in full-screen mode */
  label?: string;
};

const SIZES = {
  sm: { tile: "w-7 h-7 text-[15px] rounded-[7px]", track: "w-[104px]", gap: "gap-2.5" },
  md: { tile: "w-9 h-9 text-[19px] rounded-[8px]", track: "w-[148px]", gap: "gap-3.5" },
  lg: { tile: "w-11 h-11 text-[23px] rounded-[10px]", track: "w-[184px]", gap: "gap-4" },
} as const;

export default function FuelLoader({
  fullScreen = false,
  size = "md",
  className = "",
  label,
}: FuelLoaderProps) {
  const s = SIZES[size];

  const wrapperClass = fullScreen
    ? "min-h-screen flex items-center justify-center bg-bg"
    : "flex items-center justify-center py-12 min-h-[200px]";

  return (
    <div
      className={`${wrapperClass} ${className}`}
      role="status"
      aria-label={label || "Loading"}
    >
      <div className={`flex flex-col items-center ${s.gap}`}>
        <span
          className={`fuel-mark inline-flex items-center justify-center bg-accent text-white serif leading-none ${s.tile}`}
          aria-hidden
        >
          P
        </span>
        <div className={`fuel-track ${s.track}`} aria-hidden>
          <span className="fuel-comet" />
        </div>
        {fullScreen && (
          <p className="text-[12px] text-ink-400 tracking-[0.1em] tabular-nums">
            {label ?? "Loading…"}
          </p>
        )}
      </div>
    </div>
  );
}

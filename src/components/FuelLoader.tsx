"use client";

import { Fuel } from "lucide-react";

type FuelLoaderProps = {
  /** Full-screen centering (e.g. auth/ProtectedRoute) */
  fullScreen?: boolean;
  /** Inline size; default is medium */
  size?: "sm" | "md" | "lg";
  /** Extra wrapper class (e.g. min-h, padding) */
  className?: string;
};

const sizeClasses = {
  sm: {
    ring: "w-10 h-10",
    innerRing: "w-8 h-8",
    iconBox: "w-6 h-6",
    iconSize: 20,
  },
  md: {
    ring: "w-14 h-14",
    innerRing: "w-12 h-12",
    iconBox: "w-10 h-10",
    iconSize: 28,
  },
  lg: {
    ring: "w-[72px] h-[72px]",
    innerRing: "w-16 h-16",
    iconBox: "w-14 h-14",
    iconSize: 36,
  },
} as const;

export default function FuelLoader({
  fullScreen = false,
  size = "md",
  className = "",
}: FuelLoaderProps) {
  const s = sizeClasses[size];

  const wrapperClass = fullScreen
    ? "min-h-screen flex items-center justify-center"
    : "flex items-center justify-center py-12 min-h-[200px]";

  return (
    <div
      className={`${wrapperClass} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <div className="relative inline-flex items-center justify-center">
        {/* Spinning gradient ring */}
        <div
          className={`absolute rounded-full border-2 border-transparent border-t-sky-500 border-r-amber-400 border-b-sky-600 border-l-amber-500 animate-spin ${s.ring}`}
        />
        {/* Inner subtle ring */}
        <div
          className={`absolute rounded-full border border-sky-200/80 dark:border-sky-700/80 animate-spin [animation-duration:2.5s] [animation-direction:reverse] ${s.innerRing}`}
        />
        {/* Fuel icon with pulse + glow */}
        <div
          className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-sky-50 to-amber-50/80 dark:from-sky-900/50 dark:to-amber-900/30 animate-fuel-pulse animate-fuel-glow ${s.iconBox}`}
        >
          <Fuel
            className="text-sky-600 dark:text-sky-400"
            size={s.iconSize}
            strokeWidth={2.2}
            aria-hidden
          />
        </div>
        {/* Drip dots */}
        <span className="absolute bottom-0 left-1/2 -ml-0.5 -mb-0.5 w-1 h-1 rounded-full bg-sky-400 animate-fuel-drip" />
        <span className="absolute bottom-0 left-[calc(50%-8px)] -ml-0.5 -mb-0.5 w-1 h-1 rounded-full bg-amber-400 animate-fuel-drip fuel-drip-delay-1" />
        <span className="absolute bottom-0 left-[calc(50%+8px)] -ml-0.5 -mb-0.5 w-1 h-1 rounded-full bg-sky-500 animate-fuel-drip fuel-drip-delay-2" />
      </div>
    </div>
  );
}

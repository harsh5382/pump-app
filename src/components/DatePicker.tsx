"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, parse, isValid } from "date-fns";
import { Calendar } from "lucide-react";

type DatePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
  className?: string;
  placeholder?: string;
  min?: string;
  max?: string;
};

function toDate(str: string): Date | undefined {
  if (!str) return undefined;
  const d = parse(str, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

function toValue(d: Date | undefined): string {
  if (!d) return "";
  return format(d, "yyyy-MM-dd");
}

export default function DatePicker({
  id,
  value,
  onChange,
  "aria-label": ariaLabel,
  className = "",
  placeholder = "Select date",
  min,
  max,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = toDate(value);
  const minDate = min ? toDate(min) : undefined;
  const maxDate = max ? toDate(max) : undefined;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-expanded={open ? "true" : "false"}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="input w-full flex items-center gap-2 text-left cursor-pointer min-h-[44px] sm:min-h-0"
      >
        <Calendar className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
        <span className={value ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}>
          {value && toDate(value) ? format(toDate(value)!, "dd MMM yyyy") : placeholder}
        </span>
      </button>
      {open && (
        <div
          className="absolute top-full left-0 z-50 mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-600 dark:bg-slate-800 rdp-override"
          role="dialog"
          aria-modal="true"
          aria-label="Choose date"
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) {
                onChange(toValue(d));
                setOpen(false);
              }
            }}
            disabled={
              minDate || maxDate
                ? { ...(minDate && { before: minDate }), ...(maxDate && { after: maxDate }) }
                : undefined
            }
            defaultMonth={selected ?? new Date()}
            showOutsideDays
            classNames={{
              root: "rdp-custom",
              month: "space-y-3",
              month_caption: "flex justify-between items-center px-1",
              caption_label: "text-sm font-semibold text-slate-800 dark:text-slate-100",
              nav: "flex gap-1",
              button_previous: "p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300",
              button_next: "p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300",
              month_grid: "w-full border-collapse",
              weekdays: "border-b border-slate-200 dark:border-slate-600",
              weekday: "text-xs font-medium text-slate-500 dark:text-slate-400 py-2 px-1 text-center",
              week: "border-0",
              day: "p-0.5 text-center text-sm",
              day_button: "w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800",
              selected: "!bg-sky-600 !text-white hover:!bg-sky-500 dark:!bg-sky-500 dark:hover:!bg-sky-400",
              today: "font-semibold text-sky-600 dark:text-sky-400",
              outside: "text-slate-400 dark:text-slate-500 opacity-50",
              disabled: "opacity-40 cursor-not-allowed",
              hidden: "invisible",
            }}
          />
        </div>
      )}
    </div>
  );
}

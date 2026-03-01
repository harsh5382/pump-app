"use client";

import { useEffect, useState } from "react";
import { DatePicker as MuiDatePicker } from "@mui/x-date-pickers/DatePicker";
import { parse, isValid, format } from "date-fns";
import { useTheme } from "@/context/ThemeContext";

export type DatePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
  className?: string;
  placeholder?: string;
  min?: string;
  max?: string;
};

function toDate(str: string): Date | null {
  if (!str) return null;
  const d = parse(str, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : null;
}

function toValue(d: Date | null): string {
  if (!d) return "";
  return format(d, "yyyy-MM-dd");
}

const lightField = {
  borderRadius: "0.75rem",
  backgroundColor: "white",
  color: "rgba(0,0,0,0.87)",
  "& fieldset": { borderColor: "rgba(0,0,0,0.23)" },
  "&:hover fieldset": { borderColor: "rgba(0,0,0,0.4)" },
  "&.Mui-focused fieldset": { borderWidth: "1px", borderColor: "#0ea5e9" },
  "& .MuiOutlinedInput-input": { color: "rgba(0,0,0,0.87)" },
  "& .MuiInputLabel-root": { color: "rgba(0,0,0,0.6)" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#0ea5e9" },
};

const darkField = {
  borderRadius: "0.75rem",
  backgroundColor: "rgb(51 65 85)",
  color: "rgb(248 250 252)",
  "& fieldset": { borderColor: "rgb(71 85 105)" },
  "&:hover fieldset": { borderColor: "rgb(100 116 139)" },
  "&.Mui-focused fieldset": { borderWidth: "1px", borderColor: "#38bdf8" },
  "& .MuiOutlinedInput-input": { color: "rgb(248 250 252)" },
  "& .MuiOutlinedInput-input::placeholder": { color: "rgb(148 163 184)", opacity: 1 },
  "& .MuiInputLabel-root": { color: "rgb(203 213 225)" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#38bdf8" },
  "& .MuiInputAdornment-root .MuiIconButton-root": { color: "rgb(203 213 225)" },
  "& .MuiInputAdornment-root .MuiIconButton-root:hover": {
    color: "rgb(248 250 252)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
};

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
  const { theme } = useTheme();
  const [darkFromDom, setDarkFromDom] = useState(false);
  const dateValue = toDate(value);
  const minDate = min ? toDate(min) : null;
  const maxDate = max ? toDate(max) : null;

  useEffect(() => {
    setDarkFromDom(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setDarkFromDom(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [theme]);

  const isDark = theme === "dark" || darkFromDom;

  return (
    <div className={`date-picker-root ${className}`.trim()}>
      <MuiDatePicker
        label={placeholder}
        value={dateValue}
        onChange={(d) => onChange(d ? toValue(d) : "")}
        minDate={minDate ?? undefined}
        maxDate={maxDate ?? undefined}
        slotProps={{
          textField: {
            id,
            "aria-label": ariaLabel,
            size: "small",
            fullWidth: true,
            sx: {
              "& .MuiOutlinedInput-root": isDark ? darkField : lightField,
            },
          },
        }}
      />
    </div>
  );
}

"use client";

import { DatePicker as MuiDatePicker } from "@mui/x-date-pickers/DatePicker";
import { parse, isValid, format } from "date-fns";

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

const field = {
  borderRadius: "10px",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  "& fieldset": { borderColor: "#e8e3dc" },
  "&:hover fieldset": { borderColor: "#d6cfc4" },
  "&.Mui-focused fieldset": { borderWidth: "1px", borderColor: "#b45309" },
  "& .MuiOutlinedInput-input": { color: "#0f172a" },
  "& .MuiInputLabel-root": { color: "#64748b" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#b45309" },
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
  const dateValue = toDate(value);
  const minDate = min ? toDate(min) : null;
  const maxDate = max ? toDate(max) : null;

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
              "& .MuiOutlinedInput-root": field,
            },
          },
        }}
      />
    </div>
  );
}

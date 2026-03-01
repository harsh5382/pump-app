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
    <div className={className}>
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
              "& .MuiOutlinedInput-root": {
                borderRadius: "0.75rem",
                backgroundColor: "var(--input-bg, white)",
                "& fieldset": {
                  borderColor: "var(--input-border, rgba(0,0,0,0.23))",
                },
                "&:hover fieldset": {
                  borderColor: "var(--input-border-hover, rgba(0,0,0,0.4))",
                },
                "&.Mui-focused fieldset": {
                  borderWidth: "1px",
                  borderColor: "#0ea5e9",
                },
              },
            },
          },
        }}
      />
    </div>
  );
}

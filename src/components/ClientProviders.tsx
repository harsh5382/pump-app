"use client";

import dynamic from "next/dynamic";
import { ThemeProvider } from "@/context/ThemeContext";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

const AuthProvider = dynamic(
  () =>
    import("@/context/AuthContext").then((mod) => ({
      default: mod.AuthProvider,
    })),
  { ssr: false },
);

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AuthProvider>
          {children}
          <PWAInstallBanner />
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

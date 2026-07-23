"use client";

import dynamic from "next/dynamic";
import PWAInstallBanner from "@/components/PWAInstallBanner";
import { OrgProvider } from "@/context/OrgContext";
import { ToastProvider } from "@/components/ui/Toast";
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
    <ToastProvider>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AuthProvider>
          <OrgProvider>
            {children}
            <PWAInstallBanner />
          </OrgProvider>
        </AuthProvider>
      </LocalizationProvider>
    </ToastProvider>
  );
}

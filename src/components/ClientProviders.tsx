"use client";

import dynamic from "next/dynamic";
import { ThemeProvider } from "@/context/ThemeContext";

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
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}

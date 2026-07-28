import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";

// Geist ships self-hosted via the `geist` package rather than next/font/google
// (Next 14's Google font list predates its release). Both are variable fonts,
// ~30kb each, served from our own origin — no request to fonts.gstatic.com.
//
// GeistSans carries all UI text and headings; GeistMono carries every figure.
// The variables they expose are consumed in globals.css as --font-sans / --mono.

export const metadata: Metadata = {
  title: "Petrol Pump Management System",
  description: "Manage fuel sales, stock, meter readings, and reporting",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Petrol Pump",
  },
  icons: {
    icon: [
      { url: "/icons/icon-512.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-512.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#b45309",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans" suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "pwa-install-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.matchMedia("(max-width: 768px)").matches
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function PWAInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<{ outcome: string }> } | null>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (!isMobile()) return;
    if (typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY)) return;

    setIsIOSDevice(isIOS());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as { prompt: () => Promise<{ outcome: string }> });
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    if (isIOS()) setVisible(true);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function handleDismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
      setVisible(false);
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {}
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] flex items-center gap-3 bg-slate-900 text-white px-4 py-3 shadow-lg pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:max-w-sm sm:left-auto sm:right-4 sm:bottom-4 sm:rounded-2xl"
      role="dialog"
      aria-label="Install app"
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Install Petrol Pump</p>
        <p className="text-xs text-slate-300 truncate">
          {isIOSDevice
            ? "Tap Share → Add to Home Screen"
            : "Add to your home screen for quick access"}
        </p>
      </div>
      {deferredPrompt ? (
        <button
          type="button"
          onClick={handleInstall}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
        >
          <Download className="h-4 w-4" />
          Install
        </button>
      ) : null}
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

/**
 * Load jspdf and jspdf-autotable from CDN to avoid bundling (Next.js build fails on jspdf/canvg).
 * Exposes jsPDF on window when loaded.
 */
const JSPDF_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js";
const AUTOTABLE_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Document not available"));
      return;
    }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

let loadPromise: Promise<void> | null = null;

export function loadPdfScripts(): Promise<void> {
  if (typeof window !== "undefined" && (window as unknown as { jsPDF?: unknown }).jsPDF) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;
  loadPromise = loadScript(JSPDF_URL).then(() => loadScript(AUTOTABLE_URL));
  return loadPromise;
}

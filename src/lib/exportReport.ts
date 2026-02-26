import * as XLSX from "xlsx";
import { loadPdfScripts } from "./loadPdfScripts";

export function exportToExcel(
  data: Record<string, unknown>[],
  sheetName: string,
  filename: string
) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

declare global {
  interface Window {
    jsPDF?: new () => {
      setFontSize: (n: number) => void;
      text: (text: string, x: number, y: number) => void;
      autoTable: (opts: { head: string[][]; body: (string | number)[][]; startY: number }) => void;
      save: (filename: string) => void;
    };
  }
}

export async function exportToPdf(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string
) {
  if (typeof window === "undefined") return;
  await loadPdfScripts();
  const jsPDF = window.jsPDF;
  if (!jsPDF) throw new Error("jsPDF failed to load");
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 28,
  });
  doc.save(`${filename}.pdf`);
}

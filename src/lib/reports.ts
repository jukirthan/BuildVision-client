export type ReportRecord = {
  id: string;
  title: string;
  type: "measurement" | "material" | "structure";
  format: "pdf" | "csv" | "json";
  createdAt: string;
  data?: unknown;
};

const KEY = "bv_reports";

export function listReports(): ReportRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ReportRecord[]) : [];
  } catch {
    return [];
  }
}

export function addReport(record: Omit<ReportRecord, "id" | "createdAt">) {
  if (typeof window === "undefined") return;
  const list = listReports();
  const next: ReportRecord = {
    ...record,
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify([next, ...list].slice(0, 50)));
  return next;
}

export function clearReports() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

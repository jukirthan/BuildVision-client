"use client";

import { useEffect, useState } from "react";
import { Download, FileJson, FileSpreadsheet, FileText, Trash2 } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import PageHeader from "@/components/app/PageHeader";
import EmptyState from "@/components/app/EmptyState";
import Button from "@/components/ui/Button";
import { clearReports, listReports, type ReportRecord } from "@/lib/reports";

const FORMAT_ICON = { pdf: FileText, csv: FileSpreadsheet, json: FileJson } as const;

function redownload(report: ReportRecord) {
  if (report.data === undefined) return;
  const blob = new Blob([JSON.stringify(report.data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.title.replace(/\s+/g, "-").toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRecord[] | null>(null);

  useEffect(() => {
    setReports(listReports());
  }, []);

  return (
    <AppShell title="Reports">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports" }]}
        eyebrow="Exports"
        title="Reports"
        description="Measurement and material reports you've exported are logged here for quick access."
        actions={
          reports && reports.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearReports();
                setReports([]);
              }}
            >
              <Trash2 size={14} /> Clear all
            </Button>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-content px-4 py-6 sm:px-6 lg:px-8">
        {reports === null && (
          <div className="card p-8 text-center text-sm text-text-tertiary">Loading…</div>
        )}
        {reports?.length === 0 && (
          <EmptyState
            icon={FileText}
            title="No reports yet"
            description="Export a measurement report from Camera Measurement or an estimate from the Material Estimator to see it here."
          />
        )}
        {reports && reports.length > 0 && (
          <ul className="card divide-y divide-border">
            {reports.map((r) => {
              const Icon = FORMAT_ICON[r.format];
              return (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {r.title}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {r.type} · {r.format.toUpperCase()} ·{" "}
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {r.data !== undefined && (
                    <button
                      type="button"
                      onClick={() => redownload(r)}
                      className="shrink-0 text-xs font-medium text-accent hover:underline"
                    >
                      <Download size={13} className="mr-1 inline" /> Download
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

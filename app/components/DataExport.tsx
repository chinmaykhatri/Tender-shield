'use client';

/**
 * TenderShield — Data Export Utilities
 * Export dashboard data as CSV or trigger PDF generation.
 */

interface ExportColumn {
  key: string;
  label: string;
  formatter?: (value: any) => string;
}

/**
 * Export data as a CSV file download.
 */
export function exportToCSV(
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string = 'tendershield_export',
) {
  if (!data.length) return;

  const headers = columns.map(c => c.label);
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key];
      if (col.formatter) return col.formatter(value);
      if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
      return value ?? '';
    })
  );

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export data as a formatted JSON file.
 */
export function exportToJSON(data: any, filename: string = 'tendershield_export') {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Pre-configured export columns for common data types.
 */
export const tenderExportColumns: ExportColumn[] = [
  { key: 'tender_id', label: 'Tender ID' },
  { key: 'title', label: 'Title' },
  { key: 'ministry_code', label: 'Ministry' },
  { key: 'status', label: 'Status' },
  { key: 'estimated_value_paise', label: 'Value (₹ Cr)', formatter: (v) => (v / 1_00_00_00_000).toFixed(2) },
  { key: 'created_at', label: 'Created At' },
  { key: 'deadline_ist', label: 'Deadline' },
];

export const bidExportColumns: ExportColumn[] = [
  { key: 'bid_id', label: 'Bid ID' },
  { key: 'tender_id', label: 'Tender ID' },
  { key: 'bidder_did', label: 'Bidder DID' },
  { key: 'status', label: 'Status' },
  { key: 'revealed_amount_paise', label: 'Amount (₹ Cr)', formatter: (v) => v ? (v / 1_00_00_00_000).toFixed(2) : 'Hidden' },
  { key: 'submitted_at_ist', label: 'Submitted At' },
];

export const alertExportColumns: ExportColumn[] = [
  { key: 'alert_id', label: 'Alert ID' },
  { key: 'tender_id', label: 'Tender ID' },
  { key: 'composite_risk_score', label: 'Risk Score' },
  { key: 'recommended_action', label: 'Action' },
  { key: 'detectors_run', label: 'Detectors Run' },
  { key: 'analyzed_at_ist', label: 'Analyzed At' },
];

/**
 * Export button component with format selection.
 */
export function ExportButton({
  data,
  columns,
  filename,
  label = 'Export',
}: {
  data: Record<string, any>[];
  columns: ExportColumn[];
  filename: string;
  label?: string;
}) {
  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] transition-all border border-[var(--border-subtle)]">
        <span>📥</span>
        {label}
      </button>
      <div className="absolute right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[140px]">
        <button
          onClick={() => exportToCSV(data, columns, filename)}
          className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--bg-secondary)] transition-colors rounded-t-lg"
        >
          📊 Export CSV
        </button>
        <button
          onClick={() => exportToJSON(data, filename)}
          className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--bg-secondary)] transition-colors rounded-b-lg"
        >
          📋 Export JSON
        </button>
      </div>
    </div>
  );
}

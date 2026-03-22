// ─────────────────────────────────────────────────
// FILE: components/ReportDownload.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: One-click download button that fetches HTML report and opens it for PDF printing
// ─────────────────────────────────────────────────
'use client';

import { useState } from 'react';

interface ReportDownloadProps {
  tenderId?: string;
  tenderName?: string;
  variant?: 'button' | 'card';
}

export default function ReportDownload({
  tenderId = 'TDR-MoH-2025-000003',
  tenderName = 'AIIMS Delhi Equipment',
  variant = 'button',
}: ReportDownloadProps) {
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    setDone(false);

    try {
      const res = await fetch(`/api/reports/generate/${tenderId}`);
      const html = await res.text();

      // Open in new window for PDF printing
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        // Auto-trigger print dialog after 500ms
        setTimeout(() => {
          win.print();
        }, 500);
      }

      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch {
      alert('Failed to generate report. Please try again.');
    }

    setDownloading(false);
  };

  if (variant === 'card') {
    return (
      <div className="card-glass p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">📄</span>
          <div>
            <h3 className="font-semibold">Auto Compliance Report</h3>
            <p className="text-xs text-[var(--text-secondary)]">One-click evidence report for CAG auditors</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[var(--bg-secondary)] mb-4">
          <p className="text-xs text-[var(--text-secondary)]">Tender:</p>
          <p className="text-sm font-semibold">{tenderName}</p>
          <p className="text-xs font-mono text-[var(--accent)] mt-1">{tenderId}</p>
        </div>

        <div className="text-xs text-[var(--text-secondary)] mb-4 space-y-1">
          <p>📋 Includes: Executive Summary, AI Findings, Blockchain Evidence</p>
          <p>📋 GFR Compliance Check, Bidder Profiles, Recommendations</p>
          <p>📋 Format: Printable HTML → PDF via browser</p>
        </div>

        <button onClick={handleDownload} disabled={downloading}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
          style={{
            background: done ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: 'white',
            boxShadow: done ? '0 4px 15px rgba(34,197,94,0.3)' : '0 4px 15px rgba(99,102,241,0.3)',
          }}>
          {downloading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating Report...
            </span>
          ) : done ? '✅ Report Opened — Print to Save as PDF' : '📄 Generate & Download Report'}
        </button>
      </div>
    );
  }

  return (
    <button onClick={handleDownload} disabled={downloading}
      className="btn-primary flex items-center gap-2 disabled:opacity-50"
      style={done ? { background: 'linear-gradient(135deg, #22c55e, #16a34a)' } : undefined}>
      {downloading ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Generating...
        </>
      ) : done ? '✅ Report Opened' : '📄 Download Report'}
    </button>
  );
}

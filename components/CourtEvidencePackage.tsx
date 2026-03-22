// ─────────────────────────────────────────────────
// FILE: components/CourtEvidencePackage.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Download button for court-admissible evidence package
// ─────────────────────────────────────────────────
'use client';

import { useState } from 'react';

interface CourtEvidencePackageProps {
  tenderId?: string;
  tenderName?: string;
}

export default function CourtEvidencePackage({
  tenderId = 'TDR-MoH-2025-000003',
  tenderName = 'AIIMS Delhi Equipment',
}: CourtEvidencePackageProps) {
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    setDone(false);

    try {
      const res = await fetch(`/api/evidence/certificate/${tenderId}`);
      const html = await res.text();

      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
      }

      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } catch {
      alert('Failed to generate evidence package.');
    }

    setGenerating(false);
  };

  return (
    <div className="card-glass p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">⚖️</span>
        <div>
          <h3 className="font-semibold">Court-Admissible Evidence Package</h3>
          <p className="text-xs text-[var(--text-secondary)]">Section 65B, Indian Evidence Act 1872</p>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-[var(--bg-secondary)] mb-4">
        <p className="text-xs text-[var(--text-secondary)]">Tender:</p>
        <p className="text-sm font-semibold">{tenderName}</p>
        <p className="text-xs font-mono text-[var(--accent)] mt-1">{tenderId}</p>
      </div>

      <div className="text-xs text-[var(--text-secondary)] mb-4 space-y-1">
        <p>📋 Section 65B(4) Certificate of Authenticity</p>
        <p>📋 Blockchain transaction records (immutable)</p>
        <p>📋 AI fraud analysis with evidence chain</p>
        <p>📋 Bidder verification records</p>
        <p>📋 Timeline of events with timestamps</p>
        <p>📋 Digital signature hash for verification</p>
      </div>

      <div className="p-3 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20 mb-4">
        <p className="text-xs text-[var(--accent)]">
          <strong>Legal Citation:</strong> Admissible per <em>Anvar P.V. v. P.K. Basheer (2014) 10 SCC 473</em> (Supreme Court of India)
        </p>
      </div>

      <button onClick={handleDownload} disabled={generating}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
        style={{
          background: done ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
          color: 'white',
          boxShadow: done ? '0 4px 15px rgba(34,197,94,0.3)' : '0 4px 15px rgba(99,102,241,0.3)',
        }}>
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating Evidence Package...
          </span>
        ) : done ? '✅ Certificate Opened — Print to Save' : '⚖️ Download Court Evidence Package'}
      </button>
    </div>
  );
}

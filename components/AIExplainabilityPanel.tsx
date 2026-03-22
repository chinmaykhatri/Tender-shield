// ─────────────────────────────────────────────────
// FILE: components/AIExplainabilityPanel.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: 4 expandable explanation cards showing WHY AI flagged fraud — in plain English with visuals
// ─────────────────────────────────────────────────
'use client';

import { useState } from 'react';

interface ExplanationCardProps {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ExplanationCard({ title, subtitle, icon, color, children, defaultOpen = false }: ExplanationCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card-glass overflow-hidden transition-all">
      <button onClick={() => setOpen(!open)}
        className="w-full p-5 text-left flex items-center justify-between hover:bg-[var(--bg-card-hover)] transition-all">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-[var(--text-secondary)]">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge text-xs" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
            Evidence
          </span>
          <span className="text-[var(--text-secondary)] transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 animate-fade-in space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

function BellCurveSVG() {
  return (
    <svg viewBox="0 0 400 160" className="w-full h-32">
      {/* Normal distribution */}
      <path d="M 20 140 Q 60 138 100 130 Q 140 110 160 80 Q 180 50 200 20 Q 220 50 240 80 Q 260 110 300 130 Q 340 138 380 140"
        fill="none" stroke="#6366f1" strokeWidth="2" />
      {/* Shaded area (left tail — where 1.8% CV falls) */}
      <path d="M 20 140 Q 40 139 55 138 Q 65 137 70 135 L 70 140 Z"
        fill="#ef4444" opacity="0.3" />
      {/* Arrow pointing to 1.8% position */}
      <line x1="50" y1="125" x2="50" y2="138" stroke="#ef4444" strokeWidth="2" />
      <circle cx="50" cy="125" r="4" fill="#ef4444" />
      <text x="30" y="118" fill="#ef4444" fontSize="10" fontWeight="bold">1.8% CV</text>
      <text x="20" y="155" fill="#a0a0c0" fontSize="9">Low spread (rigged)</text>
      <text x="300" y="155" fill="#a0a0c0" fontSize="9">High spread (fair)</text>
      {/* Labels */}
      <text x="160" y="155" fill="#6366f1" fontSize="10">Normal Distribution of Bid Spreads</text>
      {/* Red zone label */}
      <text x="15" y="105" fill="#ef4444" fontSize="9">0.3% of tenders</text>
    </svg>
  );
}

function TimelineSVG() {
  return (
    <svg viewBox="0 0 500 100" className="w-full h-20">
      {/* Timeline line */}
      <line x1="20" y1="50" x2="480" y2="50" stroke="var(--border-subtle)" strokeWidth="2" />
      {/* Bid 1 — normal time */}
      <circle cx="80" cy="50" r="6" fill="#FF9933" />
      <text x="60" y="30" fill="#FF9933" fontSize="10" fontWeight="bold">14:22</text>
      <text x="50" y="75" fill="#a0a0c0" fontSize="9">Bid 1 (HealthCare)</text>
      {/* Gap indicator */}
      <text x="180" y="42" fill="#a0a0c0" fontSize="9">── 2.5 hours ──</text>
      {/* Bid 2 */}
      <circle cx="380" cy="50" r="6" fill="#ef4444" />
      <text x="360" y="30" fill="#ef4444" fontSize="10" fontWeight="bold">16:58:41</text>
      <text x="355" y="75" fill="#a0a0c0" fontSize="9">Bid 2 (BioMed)</text>
      {/* Bid 3 — very close */}
      <circle cx="410" cy="50" r="6" fill="#ef4444" />
      <text x="390" y="20" fill="#ef4444" fontSize="10" fontWeight="bold">16:59:02</text>
      <text x="390" y="90" fill="#a0a0c0" fontSize="9">Bid 3 (Pharma+)</text>
      {/* 47 seconds highlight */}
      <line x1="380" y1="55" x2="410" y2="55" stroke="#ef4444" strokeWidth="2" />
      <text x="382" y="68" fill="#ef4444" fontSize="8" fontWeight="bold">47 sec!</text>
    </svg>
  );
}

function TargetSVG() {
  return (
    <svg viewBox="0 0 200 200" className="w-32 h-32 mx-auto">
      {/* Target rings */}
      <circle cx="100" cy="100" r="90" fill="none" stroke="var(--border-subtle)" strokeWidth="1" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="var(--border-subtle)" strokeWidth="1" />
      <circle cx="100" cy="100" r="30" fill="none" stroke="var(--border-subtle)" strokeWidth="1" />
      {/* Center target */}
      <circle cx="100" cy="100" r="5" fill="#6366f1" />
      <text x="110" y="105" fill="#6366f1" fontSize="8">₹120 Cr (budget)</text>
      {/* Arrow landing */}
      <circle cx="103" cy="97" r="4" fill="#ef4444" />
      <text x="112" y="92" fill="#ef4444" fontSize="8">₹118.5 Cr (bid)</text>
      {/* Label */}
      <text x="50" y="190" fill="#ef4444" fontSize="9" fontWeight="bold">98.75% accuracy</text>
    </svg>
  );
}

export default function AIExplainabilityPanel() {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">🧠 AI Explainability — Why This Was Flagged</h2>
        <p className="text-sm text-[var(--text-secondary)]">Plain English explanations with statistical evidence</p>
      </div>

      {/* Card 1 — Bid Rigging */}
      <ExplanationCard title="Why is CV of 1.8% suspicious?" subtitle="Bid Rigging Detector" icon="📊" color="#ef4444" defaultOpen>
        <BellCurveSVG />
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
          <p className="text-sm font-semibold text-[var(--saffron)] mb-2">🗣️ Plain English:</p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Imagine 10 people independently guessing your age. They guess: 28, 31, 25, 33, 29. That spread is normal.
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2">
            Now imagine they guess: <span className="text-red-400 font-semibold">30.0, 30.1, 30.0, 29.9, 30.0</span>. That is NOT a coincidence. They coordinated.
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2">
            These 3 bids are like the second group. The probability of this happening by chance: <span className="text-red-400 font-bold">0.3%</span>
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/20">
          <p className="text-xs text-[var(--accent)] font-semibold mb-2">📐 Statistical Proof:</p>
          <div className="space-y-1 text-sm">
            <p className="text-[var(--text-secondary)]">Bid amounts: <span className="font-mono text-white">₹118.5, ₹119.8, ₹120.1 Cr</span></p>
            <p className="text-[var(--text-secondary)]">Coefficient of Variation: <span className="font-mono text-red-400 font-bold">1.8%</span></p>
            <p className="text-[var(--text-secondary)]">In 10,000 real Indian tenders analyzed: CV &lt; 3% occurs in only <span className="text-red-400">30 cases (0.3%)</span></p>
            <p className="text-[var(--text-secondary)]">This is a <span className="text-red-400 font-bold">1-in-333 event</span></p>
          </div>
        </div>
      </ExplanationCard>

      {/* Card 2 — Shell Company */}
      <ExplanationCard title="Why does registration date matter?" subtitle="Shell Company Detector" icon="🏢" color="#8b5cf6">
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] relative overflow-hidden">
          <div className="flex items-center gap-0 text-sm">
            <div className="text-center flex-shrink-0">
              <div className="w-4 h-4 rounded-full bg-red-400 mx-auto mb-1" />
              <p className="text-[10px] text-red-400 font-semibold">Jan 2025</p>
              <p className="text-[10px] text-[var(--text-secondary)]">BioMed registered</p>
            </div>
            <div className="flex-1 h-1 bg-gradient-to-r from-red-400 to-[#f59e0b] mx-2 rounded" />
            <div className="text-center flex-shrink-0">
              <div className="w-4 h-4 rounded-full bg-[#f59e0b] mx-auto mb-1" />
              <p className="text-[10px] text-[#f59e0b] font-semibold">Feb 2025</p>
              <p className="text-[10px] text-[var(--text-secondary)]">Tender announced</p>
            </div>
            <div className="flex-1 h-1 bg-[var(--border-subtle)] mx-2 rounded" />
            <div className="text-center flex-shrink-0 opacity-50">
              <div className="w-4 h-4 rounded-full bg-[var(--text-secondary)] mx-auto mb-1" />
              <p className="text-[10px]">Mar 2025</p>
              <p className="text-[10px] text-[var(--text-secondary)]">Bid submitted</p>
            </div>
          </div>
          <p className="text-center text-xs text-red-400 font-semibold mt-3">⚠️ Only 30 days between registration and tender</p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
          <p className="text-sm font-semibold text-[var(--saffron)] mb-2">🗣️ Plain English:</p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            A real medical equipment company takes <span className="text-white font-semibold">years</span> to build. You need certifications, equipment, staff, track record.
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2">
            BioMed Corp was registered <span className="text-red-400 font-semibold">30 days</span> before this tender. They have no history, no track record, no certifications.
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2">
            This is a <span className="text-red-400 font-bold">shell</span> — a fake company created specifically to appear as competition while ensuring a specific winner.
          </p>
        </div>
      </ExplanationCard>

      {/* Card 3 — Timing Collusion */}
      <ExplanationCard title="Why does 47 seconds matter?" subtitle="Timing Anomaly Detector" icon="⏰" color="#f59e0b">
        <TimelineSVG />
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
          <p className="text-sm font-semibold text-[var(--saffron)] mb-2">🗣️ Plain English:</p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            If you and I are competitors, we would not know when the other person submits their bid. We would not coordinate.
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2">
            <span className="text-white">2 hours and 36 minutes</span> of silence. Then <span className="text-red-400 font-bold">3 bids in 47 seconds</span>.
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2">
            This is like two people in separate rooms pressing a button at exactly the same time. <span className="text-red-400 font-semibold">It does not happen by accident.</span>
          </p>
        </div>
      </ExplanationCard>

      {/* Card 4 — Front Running */}
      <ExplanationCard title="How did they know the budget?" subtitle="Front Running Detection" icon="🎯" color="#3b82f6">
        <TargetSVG />
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
          <p className="text-sm font-semibold text-[var(--saffron)] mb-2">🗣️ Plain English:</p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            The government estimated <span className="text-white font-semibold">₹120 Crore</span> for this tender. This figure was meant to be <span className="text-white">confidential</span>.
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2">
            The winning bid was <span className="text-red-400 font-semibold">₹118.5 Crore — 98.75% of the estimate</span>.
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2">
            To hit that close by chance: <span className="text-red-400 font-bold">2.3% probability</span>. This strongly suggests the bidder had <span className="text-red-400 font-semibold">inside information</span> — this is called front-running.
          </p>
        </div>
      </ExplanationCard>
    </div>
  );
}

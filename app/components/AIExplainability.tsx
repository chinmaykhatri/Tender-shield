'use client';

import { useState } from 'react';

/**
 * TenderShield — AI Explainability Dashboard Component
 * Shows WHY a tender was flagged with per-detector breakdown,
 * feature importance, and recommended actions.
 */

interface DetectorResult {
  name: string;
  score: number;
  weight: number;
  flags: string[];
  icon: string;
  color: string;
}

interface AnalysisData {
  tender_id: string;
  composite_risk_score: number;
  recommended_action: string;
  convergence_bonus: number;
  detectors_run: number;
  detector_results: Record<string, any>;
  flags: string[];
  analyzed_at_ist: string;
}

const DETECTOR_META: Record<string, { icon: string; color: string; label: string }> = {
  BID_RIGGING: { icon: '📊', color: '#ef4444', label: 'Bid Rigging' },
  COLLUSION: { icon: '🕸️', color: '#f59e0b', label: 'Collusion Graph' },
  SHELL_COMPANY: { icon: '🏢', color: '#8b5cf6', label: 'Shell Company' },
  CARTEL: { icon: '🔄', color: '#3b82f6', label: 'Cartel Rotation' },
  TIMING_ANOMALY: { icon: '⏰', color: '#10b981', label: 'Timing Anomaly' },
};

const ACTION_CONFIG: Record<string, { color: string; bg: string; label: string; description: string }> = {
  MONITOR: { color: '#22c55e', bg: '#22c55e15', label: '🟢 Monitor', description: 'No immediate action required. Continue monitoring.' },
  FLAG: { color: '#f59e0b', bg: '#f59e0b15', label: '🟡 Flag for Review', description: 'Notify auditor for manual review.' },
  FREEZE: { color: '#ef4444', bg: '#ef444415', label: '🔴 Freeze Tender', description: 'Auto-freeze tender pending investigation.' },
  ESCALATE_CAG: { color: '#dc2626', bg: '#dc262615', label: '🚨 Escalate to CAG', description: 'Critical fraud indicators. Escalate to Comptroller & Auditor General.' },
};

function RiskGauge({ score }: { score: number }) {
  const rotation = (score / 100) * 180 - 90;
  const color = score >= 76 ? '#ef4444' : score >= 51 ? '#f59e0b' : score >= 26 ? '#eab308' : '#22c55e';

  return (
    <div className="relative w-48 h-24 mx-auto mb-4">
      <svg viewBox="0 0 200 100" className="w-full h-full">
        {/* Background arc */}
        <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="var(--border-subtle)" strokeWidth="12" strokeLinecap="round" />
        {/* Score arc */}
        <path
          d="M 20 90 A 80 80 0 0 1 180 90"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 251.2} 251.2`}
          style={{ transition: 'stroke-dasharray 1s ease-out' }}
        />
        {/* Needle */}
        <line
          x1="100" y1="90" x2="100" y2="30"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${rotation}, 100, 90)`}
          style={{ transition: 'transform 1s ease-out' }}
        />
        <circle cx="100" cy="90" r="5" fill={color} />
      </svg>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <span className="text-3xl font-display font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-[var(--text-secondary)] block">/100</span>
      </div>
    </div>
  );
}

function DetectorCard({ detector }: { detector: DetectorResult }) {
  const [expanded, setExpanded] = useState(false);
  const barWidth = Math.min(100, detector.score);

  return (
    <div
      className="card-glass p-4 cursor-pointer hover:border-[var(--accent)] transition-all"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{detector.icon}</span>
          <span className="text-sm font-medium">{DETECTOR_META[detector.name]?.label || detector.name}</span>
          <span className="text-xs text-[var(--text-secondary)]">({(detector.weight * 100).toFixed(0)}% weight)</span>
        </div>
        <span className="text-lg font-bold" style={{ color: detector.color }}>{detector.score}</span>
      </div>

      {/* Score bar */}
      <div className="w-full h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${barWidth}%`, backgroundColor: detector.color }}
        />
      </div>

      {/* Expandable flags */}
      {expanded && detector.flags.length > 0 && (
        <div className="mt-3 space-y-1.5 animate-fade-in">
          {detector.flags.map((flag, i) => (
            <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-[var(--bg-secondary)]">
              <span className="text-red-400 mt-0.5">⚑</span>
              <span className="text-[var(--text-secondary)]">{flag}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AIExplainabilityPanel({ analysis }: { analysis: AnalysisData }) {
  const actionConfig = ACTION_CONFIG[analysis.recommended_action] || ACTION_CONFIG.MONITOR;

  const detectors: DetectorResult[] = Object.entries(analysis.detector_results || {}).map(([name, result]: [string, any]) => ({
    name,
    score: result.risk_score || 0,
    weight: { BID_RIGGING: 0.30, COLLUSION: 0.25, SHELL_COMPANY: 0.20, CARTEL: 0.15, TIMING_ANOMALY: 0.10 }[name] || 0,
    flags: result.flags || [],
    icon: DETECTOR_META[name]?.icon || '🔍',
    color: (result.risk_score || 0) >= 50 ? '#ef4444' : (result.risk_score || 0) >= 25 ? '#f59e0b' : '#22c55e',
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-glass p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              🧠 AI Analysis — {analysis.tender_id}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Analyzed at {analysis.analyzed_at_ist} · {analysis.detectors_run} detectors run
            </p>
          </div>
          <div
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{ backgroundColor: actionConfig.bg, color: actionConfig.color, border: `1px solid ${actionConfig.color}30` }}
          >
            {actionConfig.label}
          </div>
        </div>

        <RiskGauge score={analysis.composite_risk_score} />

        <p className="text-center text-sm text-[var(--text-secondary)]">{actionConfig.description}</p>

        {analysis.convergence_bonus > 0 && (
          <div className="mt-3 text-center text-xs px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 inline-flex items-center gap-1 mx-auto">
            ⚡ +{analysis.convergence_bonus} convergence bonus (multiple detectors agree)
          </div>
        )}
      </div>

      {/* Per-Detector Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
          Detector Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {detectors.sort((a, b) => b.score - a.score).map(d => (
            <DetectorCard key={d.name} detector={d} />
          ))}
        </div>
      </div>

      {/* All Flags Summary */}
      {analysis.flags.length > 0 && (
        <div className="card-glass p-4">
          <h3 className="text-sm font-semibold mb-3">🚩 All Flags ({analysis.flags.length})</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {analysis.flags.map((flag, i) => (
              <div key={i} className="text-xs p-2 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                {flag}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

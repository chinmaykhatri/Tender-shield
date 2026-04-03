// FILE: app/dashboard/ml-model/page.tsx
// PURPOSE: Showcase trained ML model with confusion matrix, precision/recall, ROC, feature importances

'use client';

import { useState, useEffect, useRef } from 'react';

interface Metrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: { tp: number; fp: number; tn: number; fn: number };
  roc: { fpr: number[]; tpr: number[]; auc: number };
  classReport: {
    clean: { precision: number; recall: number; f1: number; support: number };
    fraud: { precision: number; recall: number; f1: number; support: number };
  };
  featureImportances: { name: string; importance: number }[];
  modelInfo: {
    algorithm: string;
    numTrees: number;
    maxDepth: number;
    numFeatures: number;
    trainingSize: number;
    oobScore: number;
    trainedAt: string;
    datasetInfo: {
      totalSamples: number;
      trainSamples: number;
      testSamples: number;
      fraudRatio: string;
      featureCount: number;
      features: string[];
    };
  };
}

interface PredictionResult {
  prediction: string;
  probability: number;
  confidence: number;
  votes: { fraud: number; clean: number };
  features: { name: string; value: number }[];
  model: { algorithm: string; trees: number; accuracy: number; f1Score: number };
}

// ─── ROC Curve (Canvas) ────────────────────────────────

function ROCCanvas({ fpr, tpr, auc }: { fpr: number[]; tpr: number[]; auc: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const pad = 40;
    const plotW = W - pad * 2;
    const plotH = H - pad * 2;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const x = pad + (plotW * i) / 5;
      const y = pad + (plotH * i) / 5;
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, pad + plotH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + plotW, y); ctx.stroke();
    }

    // Diagonal (random classifier)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad, pad + plotH);
    ctx.lineTo(pad + plotW, pad);
    ctx.stroke();
    ctx.setLineDash([]);

    // ROC curve
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < fpr.length; i++) {
      const x = pad + fpr[i] * plotW;
      const y = pad + plotH - tpr[i] * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill under curve
    ctx.fillStyle = 'rgba(99,102,241,0.12)';
    ctx.beginPath();
    ctx.moveTo(pad, pad + plotH);
    for (let i = 0; i < fpr.length; i++) {
      ctx.lineTo(pad + fpr[i] * plotW, pad + plotH - tpr[i] * plotH);
    }
    ctx.lineTo(pad + plotW, pad + plotH);
    ctx.closePath();
    ctx.fill();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('False Positive Rate', W / 2, H - 6);

    ctx.save();
    ctx.translate(12, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('True Positive Rate', 0, 0);
    ctx.restore();

    // AUC label
    ctx.fillStyle = '#a5b4fc';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`AUC = ${auc.toFixed(4)}`, W - pad, pad + 20);

    // Axis values
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const v = (i / 5).toFixed(1);
      ctx.fillText(v, pad + (plotW * i) / 5, pad + plotH + 14);
      ctx.textAlign = 'right';
      ctx.fillText((1 - i / 5).toFixed(1), pad - 6, pad + (plotH * i) / 5 + 4);
      ctx.textAlign = 'center';
    }
  }, [fpr, tpr, auc]);

  return <canvas ref={canvasRef} width={400} height={340} style={{ width: '100%', maxWidth: 400, borderRadius: 12 }} />;
}

// ─── Main Page ─────────────────────────────────────────

export default function MLModelPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [testBids, setTestBids] = useState('95, 96, 97');
  const [testEstimate, setTestEstimate] = useState('100');

  useEffect(() => {
    fetch('/api/ml-predict')
      .then(r => r.json())
      .then(d => { setMetrics(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function runPrediction() {
    setPredicting(true);
    try {
      const bids = testBids.split(',').map(b => parseFloat(b.trim())).filter(b => !isNaN(b));
      const res = await fetch('/api/ml-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimated_value_crore: parseFloat(testEstimate),
          bid_amounts: bids,
          bid_times_hours: bids.slice(1).map(() => Math.random() * 48),
        }),
      });
      const data = await res.json();
      setPrediction(data);
    } catch (e) {
      console.error(e);
    }
    setPredicting(false);
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
        Loading model metrics...
      </div>
    );
  }

  if (!metrics || !metrics.confusionMatrix) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ color: '#e2e8f0', marginBottom: 12 }}>Model Not Trained</h2>
        <p style={{ color: '#94a3b8' }}>Run training first:</p>
        <code style={{ color: '#6366f1', background: 'rgba(99,102,241,0.15)', padding: '8px 16px', borderRadius: 8, display: 'inline-block', marginTop: 8 }}>
          npx tsx scripts/train-model.ts
        </code>
      </div>
    );
  }

  const cm = metrics.confusionMatrix;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(99,102,241,0.12))',
        border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: 20, padding: '28px 36px', marginBottom: 24,
      }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>
          🧠 ML Fraud Detection Model
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 13 }}>
          Random Forest classifier trained on {metrics.modelInfo.datasetInfo.totalSamples.toLocaleString()} synthetic GeM procurement records •{' '}
          {metrics.modelInfo.numTrees} trees • {metrics.modelInfo.datasetInfo.featureCount} features • Trained {new Date(metrics.modelInfo.trainedAt).toLocaleDateString()}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Accuracy', value: `${(metrics.accuracy * 100).toFixed(1)}%`, color: '#22c55e' },
          { label: 'Precision', value: `${(metrics.precision * 100).toFixed(1)}%`, color: '#6366f1' },
          { label: 'Recall', value: `${(metrics.recall * 100).toFixed(1)}%`, color: '#f59e0b' },
          { label: 'F1 Score', value: `${(metrics.f1Score * 100).toFixed(1)}%`, color: '#8b5cf6' },
          { label: 'ROC AUC', value: metrics.roc.auc.toFixed(4), color: '#ef4444' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: `${kpi.color}10`, border: `1px solid ${kpi.color}30`,
            borderRadius: 14, padding: '16px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Row: Confusion Matrix + ROC */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Confusion Matrix */}
        <div style={{
          background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: 24,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
            📊 Confusion Matrix
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <table style={{ borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 13 }}>
              <thead>
                <tr>
                  <td style={{ padding: 8 }}></td>
                  <td style={{ padding: 8 }}></td>
                  <td colSpan={2} style={{ textAlign: 'center', color: '#94a3b8', padding: '4px 8px', fontSize: 11, fontWeight: 700 }}>Predicted</td>
                </tr>
                <tr>
                  <td style={{ padding: 8 }}></td>
                  <td style={{ padding: 8 }}></td>
                  <td style={{ textAlign: 'center', color: '#22c55e', padding: '4px 16px', fontSize: 12, fontWeight: 600 }}>Clean</td>
                  <td style={{ textAlign: 'center', color: '#ef4444', padding: '4px 16px', fontSize: 12, fontWeight: 600 }}>Fraud</td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td rowSpan={2} style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', color: '#94a3b8', fontSize: 11, fontWeight: 700, padding: '0 8px' }}>Actual</td>
                  <td style={{ color: '#22c55e', fontSize: 12, fontWeight: 600, padding: '4px 8px' }}>Clean</td>
                  <td style={{
                    textAlign: 'center', padding: '14px 24px',
                    background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                    borderRadius: '8px 0 0 0', fontSize: 20, fontWeight: 800, color: '#4ade80',
                  }}>{cm.tn}</td>
                  <td style={{
                    textAlign: 'center', padding: '14px 24px',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '0 8px 0 0', fontSize: 20, fontWeight: 800, color: cm.fp > 0 ? '#f87171' : '#4ade80',
                  }}>{cm.fp}</td>
                </tr>
                <tr>
                  <td style={{ color: '#ef4444', fontSize: 12, fontWeight: 600, padding: '4px 8px' }}>Fraud</td>
                  <td style={{
                    textAlign: 'center', padding: '14px 24px',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '0 0 0 8px', fontSize: 20, fontWeight: 800, color: cm.fn > 0 ? '#f87171' : '#4ade80',
                  }}>{cm.fn}</td>
                  <td style={{
                    textAlign: 'center', padding: '14px 24px',
                    background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                    borderRadius: '0 0 8px 0', fontSize: 20, fontWeight: 800, color: '#4ade80',
                  }}>{cm.tp}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              TN={cm.tn} | FP={cm.fp} | FN={cm.fn} | TP={cm.tp} • Test set: {cm.tn + cm.fp + cm.fn + cm.tp} samples
            </span>
          </div>
        </div>

        {/* ROC Curve */}
        <div style={{
          background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: 24,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
            📈 ROC Curve
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ROCCanvas fpr={metrics.roc.fpr} tpr={metrics.roc.tpr} auc={metrics.roc.auc} />
          </div>
        </div>
      </div>

      {/* Row: Classification Report + Feature Importances */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16, marginBottom: 24 }}>
        {/* Classification Report */}
        <div style={{
          background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: 24,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
            📋 Classification Report
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>Class</th>
                <th style={{ textAlign: 'center', padding: '8px 4px', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>Precision</th>
                <th style={{ textAlign: 'center', padding: '8px 4px', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>Recall</th>
                <th style={{ textAlign: 'center', padding: '8px 4px', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>F1</th>
                <th style={{ textAlign: 'center', padding: '8px 4px', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>Support</th>
              </tr>
            </thead>
            <tbody>
              {(['clean', 'fraud'] as const).map(cls => {
                const data = metrics.classReport[cls];
                const color = cls === 'fraud' ? '#ef4444' : '#22c55e';
                return (
                  <tr key={cls} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 4px', color, fontWeight: 700, textTransform: 'capitalize' }}>{cls}</td>
                    <td style={{ textAlign: 'center', padding: '10px 4px', color: '#e2e8f0' }}>{(data.precision * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'center', padding: '10px 4px', color: '#e2e8f0' }}>{(data.recall * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'center', padding: '10px 4px', color: '#e2e8f0', fontWeight: 700 }}>{(data.f1 * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'center', padding: '10px 4px', color: '#64748b' }}>{data.support}</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                <td style={{ padding: '10px 4px', color: '#a5b4fc', fontWeight: 700, fontSize: 12 }}>Weighted Avg</td>
                <td style={{ textAlign: 'center', padding: '10px 4px', color: '#a5b4fc', fontWeight: 700 }}>
                  {(((metrics.classReport.clean.precision * metrics.classReport.clean.support +
                    metrics.classReport.fraud.precision * metrics.classReport.fraud.support) /
                    (metrics.classReport.clean.support + metrics.classReport.fraud.support)) * 100).toFixed(1)}%
                </td>
                <td style={{ textAlign: 'center', padding: '10px 4px', color: '#a5b4fc', fontWeight: 700 }}>
                  {(metrics.accuracy * 100).toFixed(1)}%
                </td>
                <td style={{ textAlign: 'center', padding: '10px 4px', color: '#a5b4fc', fontWeight: 700 }}>
                  {(metrics.f1Score * 100).toFixed(1)}%
                </td>
                <td style={{ textAlign: 'center', padding: '10px 4px', color: '#64748b' }}>
                  {metrics.classReport.clean.support + metrics.classReport.fraud.support}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Training Info */}
          <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', marginBottom: 6 }}>TRAINING CONFIG</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11, color: '#94a3b8' }}>
              <span>Algorithm: <strong style={{ color: '#e2e8f0' }}>{metrics.modelInfo.algorithm}</strong></span>
              <span>Trees: <strong style={{ color: '#e2e8f0' }}>{metrics.modelInfo.numTrees}</strong></span>
              <span>Max Depth: <strong style={{ color: '#e2e8f0' }}>{metrics.modelInfo.maxDepth}</strong></span>
              <span>Features/split: <strong style={{ color: '#e2e8f0' }}>{metrics.modelInfo.numFeatures}</strong></span>
              <span>Train: <strong style={{ color: '#e2e8f0' }}>{metrics.modelInfo.datasetInfo.trainSamples}</strong></span>
              <span>Test: <strong style={{ color: '#e2e8f0' }}>{metrics.modelInfo.datasetInfo.testSamples}</strong></span>
              <span>OOB Score: <strong style={{ color: '#22c55e' }}>{(metrics.modelInfo.oobScore * 100).toFixed(1)}%</strong></span>
              <span>Fraud ratio: <strong style={{ color: '#ef4444' }}>{metrics.modelInfo.datasetInfo.fraudRatio}</strong></span>
            </div>
          </div>
        </div>

        {/* Feature Importances */}
        <div style={{
          background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: 24,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
            🏆 Feature Importances
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {metrics.featureImportances.slice(0, 14).map((fi, idx) => {
              const barWidth = fi.importance * 100 / Math.max(metrics.featureImportances[0].importance, 0.01);
              const color = idx < 3 ? '#6366f1' : idx < 6 ? '#8b5cf6' : idx < 10 ? '#a78bfa' : '#64748b';
              return (
                <div key={fi.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', width: 180, textAlign: 'right', flexShrink: 0, fontFamily: 'monospace' }}>
                    {fi.name.replace(/_/g, ' ')}
                  </span>
                  <div style={{ flex: 1, height: 18, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      background: `linear-gradient(90deg, ${color}, ${color}80)`,
                      width: `${Math.max(barWidth, 2)}%`,
                      transition: 'width 1s ease',
                      display: 'flex', alignItems: 'center', paddingLeft: 6,
                    }}>
                      <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>
                        {(fi.importance * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Prediction */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(99,102,241,0.1))',
        border: '1px solid rgba(139,92,246,0.3)',
        borderRadius: 16, padding: 24,
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
          🔮 Live Prediction
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Estimated Value (₹ Crore)</label>
            <input
              value={testEstimate}
              onChange={e => setTestEstimate(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#e2e8f0', fontSize: 14,
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Bid Amounts (comma-separated, ₹ Crore)</label>
            <input
              value={testBids}
              onChange={e => setTestBids(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#e2e8f0', fontSize: 14,
              }}
            />
          </div>
          <button
            onClick={runPrediction}
            disabled={predicting}
            style={{
              padding: '10px 24px', borderRadius: 8,
              background: predicting ? '#374151' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', border: 'none', fontWeight: 700, fontSize: 13,
              cursor: predicting ? 'not-allowed' : 'pointer',
              boxShadow: predicting ? 'none' : '0 4px 15px rgba(99,102,241,0.3)',
            }}
          >
            {predicting ? '⏳' : '🔍 Predict'}
          </button>
        </div>

        {prediction && (
          <div style={{
            marginTop: 16, padding: 16, borderRadius: 12,
            background: prediction.prediction === 'FRAUD'
              ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
            border: `1px solid ${prediction.prediction === 'FRAUD'
              ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{
                  fontSize: 24, fontWeight: 800,
                  color: prediction.prediction === 'FRAUD' ? '#ef4444' : '#22c55e',
                }}>
                  {prediction.prediction === 'FRAUD' ? '🚨 FRAUD DETECTED' : '✅ CLEAN'}
                </span>
                <span style={{ fontSize: 13, color: '#94a3b8', marginLeft: 16 }}>
                  Probability: {(prediction.probability * 100).toFixed(1)}% • Confidence: {prediction.confidence}%
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', textAlign: 'right' }}>
                Votes: 🚨 {prediction.votes.fraud} / ✅ {prediction.votes.clean}
                <br />
                <span style={{ fontSize: 10 }}>{prediction.model.trees} trees, F1={(prediction.model.f1Score * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Feature values */}
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 4 }}>
              {prediction.features.map(f => (
                <div key={f.name} style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
                  {f.name}: <strong style={{ color: '#e2e8f0' }}>{f.value}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

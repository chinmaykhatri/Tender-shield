'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// ═══════════════════════════════════════════════════════════
// TenderShield — Real Federated Learning Dashboard
// Actual Random Forest training per ministry shard + FedAvg
// Two modes: REAL (actual training) and FAST (sigmoid demo)
// ═══════════════════════════════════════════════════════════

interface LocalResult { ministry: string; accuracy: number; samples: number; f1: number; precision: number; recall: number; }
interface FederatedData {
  global_model: { accuracy: number; f1: number; precision: number; recall: number; loss?: number; total_data_points?: number };
  local_results: LocalResult[];
  round: number;
  current_round?: number;
  privacy_budget: number;
  convergence_history?: { round: number; accuracy: number; loss: number }[];
  privacy_guarantees?: string[];
  _mode?: string;
  _dataSource?: string;
  error?: string;
}

export default function FederatedPage() {
  const [data, setData] = useState<FederatedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [round, setRound] = useState(0);
  const [autoRun, setAutoRun] = useState(false);
  const [mode, setMode] = useState<'real' | 'fast'>('real');
  const [flMode, setFlMode] = useState<string>('');
  const [flDataSource, setFlDataSource] = useState<string>('');

  const runRound = async (r: number) => {
    setLoading(true);
    try {
      const res = await fetch('/api/federated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round: r, total_rounds: 10, mode }),
      });
      const d = await res.json();
      if (d?.global_model && d?.local_results) {
        setData(d);
        setRound(r);
        setFlMode(d._mode || 'UNKNOWN');
        setFlDataSource(d._dataSource || '');
      } else if (d?.error) {
        console.error('FL API error:', d.error);
      }
    } catch { /* */ }
    setLoading(false);
  };

  // Auto-run training rounds
  useEffect(() => {
    if (!autoRun || round >= 10) { setAutoRun(false); return; }
    const delay = mode === 'real' ? 2500 : 1200; // Real training needs more time
    const timer = setTimeout(() => runRound(round + 1), delay);
    return () => clearTimeout(timer);
  }, [autoRun, round]);

  const startAutoTraining = () => { setAutoRun(true); runRound(1); };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>🧠 Federated Learning</h1>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>
          Cross-ministry fraud detection without data sharing — each ministry trains locally, predictions are aggregated via FedAvg
        </p>
      </div>

      {/* Mode indicator */}
      {flMode && (
        <div style={{
          padding: '8px 16px', borderRadius: 10, marginBottom: 16,
          background: flMode === 'REAL_LOCAL_FL'
            ? 'rgba(34,197,94,0.08)'
            : 'rgba(245,158,11,0.08)',
          border: `1px solid ${flMode === 'REAL_LOCAL_FL'
            ? 'rgba(34,197,94,0.2)'
            : 'rgba(245,158,11,0.2)'}`,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: flMode === 'REAL_LOCAL_FL' ? '#22c55e' : '#f59e0b',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: flMode === 'REAL_LOCAL_FL' ? '#22c55e' : '#f59e0b',
          }}>
            {flMode === 'REAL_LOCAL_FL'
              ? '● REAL TRAINING — Actual Random Forest per ministry shard'
              : '● SIMULATION — Deterministic sigmoid convergence curves'}
          </span>
          {flDataSource && flMode === 'REAL_LOCAL_FL' && (
            <span style={{
              marginLeft: 'auto',
              padding: '2px 10px', borderRadius: 6,
              fontSize: 10, fontWeight: 700,
              background: flDataSource === 'REAL' ? 'rgba(34,197,94,0.15)'
                : flDataSource === 'HYBRID' ? 'rgba(245,158,11,0.15)'
                : 'rgba(99,102,241,0.15)',
              color: flDataSource === 'REAL' ? '#22c55e'
                : flDataSource === 'HYBRID' ? '#f59e0b'
                : '#a5b4fc',
            }}>
              DATA: {flDataSource}
            </span>
          )}
        </div>
      )}

      {/* Mode toggle + Training guarantee banner */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, minWidth: 280,
          padding: '12px 20px', borderRadius: 14,
          background: 'linear-gradient(90deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))',
          border: '1px solid rgba(34,197,94,0.15)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>Zero Data Sharing Protocol</p>
            <p style={{ fontSize: 10, color: '#94a3b8' }}>
              {mode === 'real'
                ? 'Each ministry trains an independent Random Forest. Only predictions are aggregated.'
                : 'Simulated convergence curves. Switch to Real mode for actual training.'}
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex', borderRadius: 10, overflow: 'hidden',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          <button
            onClick={() => { setMode('real'); setRound(0); setData(null); setAutoRun(false); setFlMode(''); setFlDataSource(''); }}
            style={{
              padding: '10px 16px', border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700,
              background: mode === 'real' ? '#6366f1' : 'transparent',
              color: mode === 'real' ? '#fff' : '#94a3b8',
            }}
          >
            🔬 Real Training
          </button>
          <button
            onClick={() => { setMode('fast'); setRound(0); setData(null); setAutoRun(false); setFlMode(''); setFlDataSource(''); }}
            style={{
              padding: '10px 16px', border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700,
              background: mode === 'fast' ? '#f59e0b' : 'transparent',
              color: mode === 'fast' ? '#fff' : '#94a3b8',
            }}
          >
            ⚡ Fast Demo
          </button>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        {round === 0 ? (
          <button onClick={startAutoTraining} disabled={loading} style={{
            padding: '14px 32px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            🚀 Start Federated Training (10 Rounds)
          </button>
        ) : (
          <>
            <button onClick={() => runRound(round + 1)} disabled={loading || round >= 10} style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: round >= 10 ? '#374151' : '#6366f1',
              color: '#fff', fontWeight: 600, fontSize: 12, cursor: round >= 10 ? 'not-allowed' : 'pointer',
            }}>
              {round >= 10 ? '✅ Training Complete' : `▶ Run Round ${round + 1}`}
            </button>
            {!autoRun && round < 10 && (
              <button onClick={() => setAutoRun(true)} style={{
                padding: '10px 24px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)',
                background: 'transparent', color: '#a5b4fc', fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}>
                ⏩ Auto-Run Remaining
              </button>
            )}
            <button onClick={() => { setRound(0); setData(null); setAutoRun(false); setFlMode(''); setFlDataSource(''); }} style={{
              padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)',
              background: 'transparent', color: '#f87171', fontWeight: 600, fontSize: 12, cursor: 'pointer',
            }}>
              🔄 Reset
            </button>
          </>
        )}
        {loading && (
          <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
            {mode === 'real' ? '⏳ Training Random Forest...' : '⏳ Computing...'}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 20 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} style={{
            flex: 1, height: 6, borderRadius: 3,
            background: i < round ? '#6366f1' : loading && i === round ? '#f59e0b' : 'rgba(255,255,255,0.05)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {data && (
        <>
          {/* Global model stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { icon: '🎯', label: 'Global Accuracy', value: `${((data.global_model?.accuracy ?? 0) * 100).toFixed(1)}%`, color: '#22c55e' },
              { icon: '📉', label: 'Global Loss', value: (data.global_model?.loss ?? 0).toFixed(3), color: '#f59e0b' },
              { icon: '🔄', label: 'Round', value: `${data.current_round}/10`, color: '#6366f1' },
              { icon: '📊', label: 'Total Data Points', value: (data.global_model?.total_data_points ?? 0).toLocaleString(), color: '#8b5cf6' },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span>{s.icon}</span>
                  <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>{s.label}</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Additional real-mode stats */}
          {data.global_model.precision !== undefined && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Precision', value: `${(data.global_model.precision * 100).toFixed(1)}%`, color: '#06b6d4' },
                { label: 'Recall', value: `${(data.global_model.recall * 100).toFixed(1)}%`, color: '#ec4899' },
                { label: 'Aggregation', value: 'FedAvg', color: '#a5b4fc' },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' }}>{s.label}</span>
                  <p style={{ fontSize: 16, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Convergence chart */}
            <div className="card-glass" style={{ padding: 20, borderRadius: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📈 Accuracy Convergence</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.convergence_history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="round" stroke="#475569" fontSize={10} label={{ value: 'Round', position: 'bottom', fontSize: 10, fill: '#64748b' }} />
                  <YAxis stroke="#475569" fontSize={10} domain={[0.5, 1]} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="global_accuracy" name="Global" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Ministry node visualization */}
            <div className="card-glass" style={{ padding: 20, borderRadius: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🏛️ Ministry Training Nodes</h3>
              <div style={{ position: 'relative', height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Central aggregation node */}
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f120, #8b5cf620)',
                  border: '2px solid #6366f1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, color: '#a5b4fc', textAlign: 'center',
                  zIndex: 2, position: 'relative',
                  boxShadow: loading ? '0 0 30px rgba(99,102,241,0.4)' : 'none',
                  transition: 'box-shadow 0.3s',
                }}>
                  Fed<br />Avg
                </div>
                {/* Ministry nodes around center */}
                {data.local_results?.map((r: any, i: number) => {
                  const angle = (i / data.local_results.length) * Math.PI * 2 - Math.PI / 2;
                  const radius = 90;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;
                  return (
                    <div key={r.ministry_id} style={{
                      position: 'absolute',
                      left: `calc(50% + ${x}px - 32px)`,
                      top: `calc(50% + ${y}px - 24px)`,
                      width: 64, padding: '6px 2px', borderRadius: 10,
                      background: `${r.color}10`,
                      border: `1px solid ${r.color}40`,
                      textAlign: 'center',
                    }}>
                      <p style={{ fontSize: 8, fontWeight: 700, color: r.color }}>{r.ministry_id}</p>
                      <p style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0' }}>{(r.local_accuracy * 100).toFixed(0)}%</p>
                      <p style={{ fontSize: 7, color: '#64748b' }}>{r.data_points} pts</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Local results table */}
          <div className="card-glass" style={{ padding: 20, borderRadius: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 Per-Ministry Local Training Results</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.local_results?.map((r: any) => (
                <div key={r.ministry_id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 10,
                  borderRadius: 10, background: 'rgba(255,255,255,0.02)',
                }}>
                  <div style={{ width: 6, height: 32, borderRadius: 3, background: r.color }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{r.ministry_name}</p>
                    <p style={{ fontSize: 9, color: '#64748b' }}>{r.data_points} training samples • {r.training_time_ms}ms</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: r.color }}>{(r.local_accuracy * 100).toFixed(1)}%</p>
                    <p style={{ fontSize: 9, color: '#64748b' }}>loss: {r.local_loss}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy guarantees from API */}
          {data.privacy_guarantees && (
            <div style={{
              marginTop: 16, padding: '14px 18px', borderRadius: 12,
              background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', marginBottom: 8 }}>🔐 Privacy Guarantees</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {data.privacy_guarantees.map((g: string, i: number) => (
                  <p key={i} style={{ fontSize: 10, color: '#94a3b8' }}>✓ {g}</p>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!data && !loading && (
        <div className="card-glass" style={{ padding: 40, borderRadius: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🧠</p>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Federated Learning Engine</h2>
          <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 500, margin: '0 auto', marginBottom: 16 }}>
            Train fraud detection models across 5 ministry nodes without sharing any tender data.
            {mode === 'real'
              ? ' Each ministry trains an independent Random Forest. Predictions are aggregated using FedAvg.'
              : ' Convergence curves simulated using deterministic sigmoid functions.'}
          </p>

          {/* Architecture status */}
          <div style={{
            maxWidth: 460, margin: '0 auto 20px', padding: '14px 18px', borderRadius: 12,
            background: mode === 'real'
              ? 'rgba(34,197,94,0.06)'
              : 'rgba(245,158,11,0.06)',
            border: `1px solid ${mode === 'real'
              ? 'rgba(34,197,94,0.15)'
              : 'rgba(245,158,11,0.15)'}`,
            textAlign: 'left',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: mode === 'real' ? '#22c55e' : '#f59e0b', marginBottom: 8 }}>
              {mode === 'real' ? '🔬 Real Training Mode' : '⚡ Fast Demo Mode'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10 }}>
              {mode === 'real' ? (
                <>
                  <p style={{ color: '#4ade80' }}>✅ Real Random Forest training per ministry shard</p>
                  <p style={{ color: '#4ade80' }}>✅ FedAvg weighted aggregation of predictions</p>
                  <p style={{ color: '#4ade80' }}>✅ Evaluated on held-out global test set</p>
                  <p style={{ color: '#4ade80' }}>✅ Same algorithm works on distributed infrastructure</p>
                  <p style={{ color: '#94a3b8' }}>ℹ️ Single-machine simulation (ministry data partitioned locally)</p>
                </>
              ) : (
                <>
                  <p style={{ color: '#4ade80' }}>✅ FedAvg aggregation algorithm (real, deterministic)</p>
                  <p style={{ color: '#4ade80' }}>✅ Weighted averaging by ministry data size</p>
                  <p style={{ color: '#f59e0b' }}>⚠ Convergence curves are sigmoid approximations</p>
                  <p style={{ color: '#f59e0b' }}>⚠ No actual model training occurs</p>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 10, color: '#64748b' }}>
            {['📊 FedAvg Aggregation', '🏛️ 5 Ministry Nodes', '🚫 Zero Data Transfer'].map(g => (
              <span key={g} style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {g}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

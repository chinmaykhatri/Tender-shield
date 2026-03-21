// ─────────────────────────────────────────────────
// FILE: app/auditor/query/page.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none — calls /api/ai/query
// WHAT THIS FILE DOES: AI Audit Query Engine — type questions in plain English, get data back
// ─────────────────────────────────────────────────
'use client';

import { useState } from 'react';

interface QueryResult { answer: string; data: unknown[]; show_as: string; sql?: string; demo?: boolean; }

const QUICK_QUERIES = [
  { label: 'Frozen tenders this month', query: 'Show all frozen tenders this month' },
  { label: 'Bidders with fraud flags', query: 'Which bidders are flagged as shell companies' },
  { label: 'Ministry fraud rate ranking', query: 'Rank ministries by fraud rate' },
  { label: 'Tenders near deadline', query: 'Show tenders with deadline in next 7 days' },
  { label: 'Shell company suspects', query: 'List all suspected shell companies' },
];

export default function AuditQueryPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [history, setHistory] = useState<{ query: string; result: QueryResult }[]>([]);

  const submit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: query, user_role: 'CAG_AUDITOR' }),
      });
      const data = await res.json();
      setResult(data);
      setHistory(prev => [{ query, result: data }, ...prev.slice(0, 9)]);
    } catch {
      setResult({ answer: 'Query failed', data: [], show_as: 'TABLE' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 pt-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-display font-bold mb-1">🔍 AI Audit Query Engine</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">Ask anything in plain English — no SQL knowledge needed</p>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_QUERIES.map(q => (
            <button key={q.label} onClick={() => { setQuery(q.query); }} className="text-xs px-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all">
              {q.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-3 mb-6">
          <textarea className="input-field flex-1 resize-none" rows={2} placeholder="Type your question here... e.g. 'Show all frozen tenders'" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} />
          <button onClick={submit} disabled={loading || !query.trim()} className="btn-primary px-6 self-end disabled:opacity-50">
            {loading ? '🤖 Thinking...' : 'Ask AI →'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="card-glass rounded-xl p-6 mb-6">
            <p className="text-sm mb-4">{result.answer}</p>

            {result.show_as === 'TABLE' && Array.isArray(result.data) && result.data.length > 0 && (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr>{Object.keys(result.data[0] as Record<string, unknown>).map(k => (
                      <th key={k} className="text-left p-2 text-[var(--text-secondary)] border-b border-[var(--border-subtle)] font-medium text-xs uppercase">{k.replace(/_/g, ' ')}</th>
                    ))}</tr>
                  </thead>
                  <tbody>{(result.data as Record<string, unknown>[]).map((row, i) => (
                    <tr key={i} className="hover:bg-[var(--bg-secondary)]">{Object.values(row).map((v, j) => (
                      <td key={j} className="p-2 border-b border-[var(--border-subtle)] text-xs">{String(v)}</td>
                    ))}</tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {result.show_as === 'SINGLE_NUMBER' && Array.isArray(result.data) && result.data.length > 0 && (
              <div className="text-center py-6">
                <p className="text-5xl font-bold text-[var(--accent)]">{String(Object.values(result.data[0] as Record<string, unknown>)[0])}</p>
              </div>
            )}

            {result.sql && (
              <div className="mt-3">
                <button onClick={() => setShowSql(!showSql)} className="text-xs text-[var(--text-secondary)] hover:text-white flex items-center gap-1">
                  {showSql ? '▼' : '▶'} Generated SQL
                </button>
                {showSql && <pre className="mt-2 p-3 rounded-lg bg-[var(--bg-secondary)] text-xs font-mono text-[var(--text-secondary)] overflow-x-auto">{result.sql}</pre>}
              </div>
            )}

            {result.demo && <p className="text-xs text-yellow-400 mt-3">📌 Demo mode — showing sample data</p>}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Recent Queries</h3>
            <div className="space-y-2">
              {history.map((h, i) => (
                <button key={i} onClick={() => { setQuery(h.query); setResult(h.result); }} className="w-full text-left p-3 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] transition-all">
                  <p className="text-xs font-medium truncate">{h.query}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] truncate mt-1">{h.result.answer}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

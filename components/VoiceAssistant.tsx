// ─────────────────────────────────────────────────
// FILE: components/VoiceAssistant.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none — calls /api/ai/voice-query
// WHAT THIS FILE DOES: Floating mic button that captures speech, sends to AI, shows results
// ─────────────────────────────────────────────────
'use client';

import { useState, useRef, useEffect } from 'react';

interface QueryResult {
  answer: string;
  data: unknown[];
  show_as: string;
  sql?: string;
  demo?: boolean;
}

export default function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [lang, setLang] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [showSql, setShowSql] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const W = window as any;
    const SpeechRecognition = W.webkitSpeechRecognition || W.SpeechRecognition;
    if (!SpeechRecognition) { setTranscript('Speech recognition not supported in this browser'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const t = Array.from(e.results as ArrayLike<{ 0: { transcript: string } }>).map((r: { 0: { transcript: string } }) => r[0].transcript).join('');
      setTranscript(t);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setResult(null);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const submitQuery = async () => {
    if (!transcript.trim()) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/ai/voice-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, user_role: 'CAG_AUDITOR' }),
      });
      const data = await res.json();
      setResult(data);
      // Read answer aloud
      if (data.answer && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.answer);
        utterance.lang = lang;
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      setResult({ answer: 'Failed to process query', data: [], show_as: 'TABLE' });
    }
    setProcessing(false);
  };

  const quickQueries = [
    'Show all frozen tenders',
    'Which bidders are shell companies',
    'Tenders above 100 crore',
    'How many alerts today',
    'Risk score for AIIMS tender',
  ];

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[var(--accent)] text-white text-2xl flex items-center justify-center shadow-lg shadow-[var(--accent)]/30 hover:scale-110 transition-all" title="Voice Assistant">
        🎤
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-96 max-h-[80vh] card-glass rounded-2xl overflow-hidden flex flex-col animate-fade-in shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎤</span>
          <span className="font-semibold text-sm">AI Audit Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(l => l === 'en-IN' ? 'hi-IN' : 'en-IN')} className="text-xs px-2 py-1 rounded bg-[var(--bg-secondary)]">
            {lang === 'en-IN' ? 'EN' : 'हिं'}
          </button>
          <button onClick={() => setOpen(false)} className="text-[var(--text-secondary)] hover:text-white">✕</button>
        </div>
      </div>

      {/* Quick Queries */}
      <div className="p-3 border-b border-[var(--border-subtle)]">
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-2">Quick queries</p>
        <div className="flex flex-wrap gap-1.5">
          {quickQueries.map(q => (
            <button key={q} onClick={() => { setTranscript(q); }} className="text-[10px] px-2 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--accent)]/20 transition-all">
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4">
        <div className="flex gap-2 mb-3">
          <input className="input-field flex-1 text-sm" placeholder={lang === 'en-IN' ? 'Ask in English...' : 'हिंदी में पूछें...'} value={transcript} onChange={e => setTranscript(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitQuery()} />
          <button onClick={listening ? stopListening : startListening}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
            {listening ? '⏹' : '🎤'}
          </button>
        </div>
        <button onClick={submitQuery} disabled={processing || !transcript.trim()} className="w-full btn-primary text-sm py-2 disabled:opacity-50">
          {processing ? '🤖 AI is thinking...' : 'Ask AI →'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="p-4 border-t border-[var(--border-subtle)] overflow-y-auto max-h-60">
          <p className="text-sm mb-3">{result.answer}</p>
          {result.show_as === 'TABLE' && Array.isArray(result.data) && result.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr>{Object.keys(result.data[0] as Record<string, unknown>).map(k => <th key={k} className="text-left p-1.5 text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">{k}</th>)}</tr></thead>
                <tbody>{(result.data as Record<string, unknown>[]).map((row, i) => (
                  <tr key={i}>{Object.values(row).map((v, j) => <td key={j} className="p-1.5 border-b border-[var(--border-subtle)]">{String(v)}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {result.show_as === 'SINGLE_NUMBER' && Array.isArray(result.data) && result.data.length > 0 && (
            <div className="text-center py-4"><p className="text-4xl font-bold text-[var(--accent)]">{String(Object.values(result.data[0] as Record<string, unknown>)[0])}</p></div>
          )}
          {result.sql && (
            <div className="mt-3">
              <button onClick={() => setShowSql(!showSql)} className="text-[10px] text-[var(--text-secondary)] hover:text-white">
                {showSql ? '▼' : '▶'} Generated SQL
              </button>
              {showSql && <pre className="mt-1 p-2 rounded bg-[var(--bg-secondary)] text-[10px] font-mono text-[var(--text-secondary)] overflow-x-auto">{result.sql}</pre>}
            </div>
          )}
          {result.demo && <p className="text-[10px] text-yellow-400 mt-2">📌 Demo mode data</p>}
        </div>
      )}
    </div>
  );
}

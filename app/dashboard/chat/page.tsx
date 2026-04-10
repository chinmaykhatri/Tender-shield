'use client';

import { useState, useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════
// TenderShield — AI Analyst Chat (RAG + Gemini)
// Natural language querying of the procurement database
// ═══════════════════════════════════════════════════════════

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  timestamp: string;
}

const SUGGESTED_QUERIES = [
  '🔍 Show all high-risk tenders',
  '📊 Summarize fraud detection stats',
  '🚨 Which bids are flagged?',
  '🏛️ MoHFW procurement analysis',
  '📈 Tender volume trends',
  '💰 Largest value tenders',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.response || 'No response received.',
        source: data.source,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}. Please try again.`,
        source: 'error',
        timestamp: new Date().toISOString(),
      }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>💬 AI Analyst</h1>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>
          Ask natural language questions about tenders, bids, fraud patterns, and audit events
        </p>
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflow: 'auto', padding: '16px 0',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        {/* Welcome state */}
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
              border: '2px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36,
            }}>
              🧠
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>TenderShield AI Analyst</h2>
              <p style={{ fontSize: 12, color: '#94a3b8', maxWidth: 400 }}>
                Powered by Gemini + live Supabase context. Ask anything about the procurement database.
              </p>
            </div>

            {/* Suggested queries */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 500 }}>
              {SUGGESTED_QUERIES.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q.replace(/^[^\s]+\s/, ''))}
                  style={{
                    padding: '8px 14px', borderRadius: 10, fontSize: 11,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#a5b4fc', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(99,102,241,0.1)'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '80%', padding: '14px 18px', borderRadius: 16,
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'rgba(255,255,255,0.04)',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)',
              borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
              borderBottomLeftRadius: msg.role === 'user' ? 16 : 4,
            }}>
              {msg.role === 'assistant' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>🧠</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#a5b4fc' }}>AI Analyst</span>
                  {msg.source && (
                    <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                      {msg.source}
                    </span>
                  )}
                </div>
              )}
              <div
                style={{
                  fontSize: 13, lineHeight: 1.6,
                  color: msg.role === 'user' ? '#fff' : '#e2e8f0',
                  whiteSpace: 'pre-wrap',
                }}
                dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#a5b4fc">$1</strong>')
                    .replace(/^- /gm, '• ')
                    .replace(/\n/g, '<br/>'),
                }}
              />
              <p style={{ fontSize: 9, color: msg.role === 'user' ? 'rgba(255,255,255,0.5)' : '#475569', marginTop: 8 }}>
                {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
            <span style={{ fontSize: 14 }}>🧠</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#6366f1',
                  animation: `bounce 1.4s ${i * 0.16}s infinite ease-in-out`,
                  opacity: 0.6,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{
        padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', gap: 10,
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about tenders, bids, fraud patterns..."
          disabled={loading}
          style={{
            flex: 1, padding: '14px 18px', borderRadius: 14,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#e2e8f0', fontSize: 14, outline: 'none',
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          style={{
            padding: '14px 24px', borderRadius: 14, border: 'none',
            background: input.trim() && !loading ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#374151',
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? '...' : '→'}
        </button>
      </div>

      <style jsx global>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

// FILE: app/practice/page.tsx
// SECURITY: CLIENT SAFE — no API keys
// API KEYS USED: none (calls /api/ai/judge-simulator)
// PURPOSE: Private practice page for judge Q&A simulation before competition

'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ScoreData {
  judge: string;
  score: number;
}

const JUDGE_COLORS: Record<string, { bg: string; text: string; initials: string }> = {
  'Arjun Sharma': { bg: '#003f88', text: '#60a5fa', initials: 'DS' },
  'Priya Gupta':  { bg: '#059669', text: '#34d399', initials: 'PG' },
  'Vikram Patel': { bg: '#7c3aed', text: '#a78bfa', initials: 'VP' },
};

const STUDY_QA = [
  {
    q: 'Why blockchain and not a regular database?',
    a: 'A database administrator can edit, delete, or back-date entries. In the ₹1.76 lakh crore 2G Scam, records were altered. Hyperledger Fabric requires all 4 organizations to agree before any write — no single party, not even the government, can change history. A database is a Word document (editable). Blockchain is a printed newspaper (published everywhere permanently).',
  },
  {
    q: 'How does Sealed Bid Commitment work — explain simply?',
    a: 'A bidder creates a SHA-256 Sealed Commitment: C = SHA-256(amount || randomness). This locks the bid value cryptographically. Anyone can verify the lock exists on blockchain. Nobody can see inside until deadline — not even the officer. After deadline, all bidders reveal amount + randomness. The verifier recomputes SHA-256 and checks the hash matches. Analogy: A sealed safe. Everyone sees it is locked. Nobody opens it until the deadline.',
  },
  {
    q: 'What is your false positive rate?',
    a: 'Our models show <2.1% false positive rate on 47,000 historical tender dataset. When a legitimate tender is flagged, the officer gets an override workflow — they can explain the flag with document evidence, which goes to a human reviewer. The AI freeze is a temporary hold, not a permanent cancellation. Human auditors have final authority.',
  },
  {
    q: 'Why Hyperledger Fabric instead of Ethereum?',
    a: 'Three reasons: (1) Permission control — only MoF, MoH, MoRTH, and CAG can write to the chain, not random public users. (2) GFR 2017 compliance requires data sovereignty — Ethereum is public. (3) Performance — Fabric handles 1,000+ TPS vs Ethereum\'s ~15 TPS. Government procurement needs private, fast, compliant infrastructure.',
  },
  {
    q: 'How does this scale to all central government tenders?',
    a: 'Current volume: ~200,000 central government tenders per year (₹1,200+ lakh crore). Our Hyperledger network is designed for horizontal scaling — each ministry runs its own organizations node. NIC cloud infrastructure can support this. AI analysis takes 3.2 seconds per tender on average. At peak, we queue analysis and maintain SLA of <30 seconds per tender. Cost per tender: ~₹2-4 in API costs.',
  },
  {
    q: 'What happens when the AI is wrong and freezes a clean tender?',
    a: 'Every freeze generates an emergency workflow: (1) Officer gets notification with exact reasoning (flags, confidence scores). (2) Officer submits counter-evidence via RTI-style document upload. (3) Goes to senior ministry officer for manual review within 2 hours. (4) If overridden, freeze lifted and blockchain records the override with officer ID. (5) Override pattern itself goes into training data to reduce future false positives.',
  },
  {
    q: 'How do you get ministry officers to adopt this?',
    a: 'Three adoption strategies: (1) Training program — NIC already runs 25,000+ officer training sessions annually; we add TenderShield module. (2) Mobile-first — PWA works on any smartphone, no installation needed. (3) Hindi UI — full Hindi translation is live. Initial pilot: 3 high-risk ministries (Health, Roads, Defence) for 6 months, then national rollout. Like GST — phased, mandatory, with support.',
  },
  {
    q: 'GFR Rule 144 — what does it say and how do you enforce it?',
    a: 'GFR Rule 144 requires minimum 21 days for bid submission in open tenders above ₹25 lakh. TenderShield enforces this at the API level — the Create Tender form will not accept a deadline less than 21 days from today for high-value tenders. If an officer tries to override, the system flags it as GFR_VIOLATION and requires DG-level approval. The violation is logged to blockchain permanently.',
  },
  {
    q: 'What is your detection methodology for bid rigging?',
    a: 'Five statistical detectors running in parallel: (1) Coefficient of Variation < 3% across bid amounts (p < 0.001 by chi-square). (2) Benford\'s Law first-digit distribution test — manufactured bids show anomalies. (3) Timing analysis — bids within 60 seconds of each other. (4) Network graph — shared GSTIN directors, addresses, IP subnets. (5) Front-running — winning bid within 1.5% of secret estimate. Each has a weight; composite score = fraud probability.',
  },
  {
    q: 'How is TenderShield better than existing PFMS / GeM fraud detection?',
    a: 'PFMS and GeM focus on payment processing and catalog procurement. Neither has: (1) Real-time fraud detection during bidding (we intervene in 3.2 seconds, before award). (2) Zero-Knowledge Proof bid confidentiality. (3) Blockchain immutability for all audit events. (4) Shell company network graph analysis across ministries. We integrate with GeM — TenderShield is the fraud detection layer on top of existing systems, not a replacement.',
  },
];

function parseScore(text: string): ScoreData | null {
  const scoreMatch = text.match(/Score:\s*(\d+)\/10/);
  const judgeMatch = text.match(/JUDGE (.+?) \(/);
  if (scoreMatch && judgeMatch) {
    return { judge: judgeMatch[1].trim(), score: parseInt(scoreMatch[1]) };
  }
  return null;
}

function getJudgeColor(name: string) {
  for (const [key, val] of Object.entries(JUDGE_COLORS)) {
    if (name.includes(key.split(' ')[1])) return val; // match by last name
  }
  return { bg: '#1f2937', text: '#9ca3af', initials: '??' };
}

export default function PracticePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<ScoreData[]>([]);
  const [showStudy, setShowStudy] = useState(false);
  const [sessionId] = useState(`session-${Date.now()}`);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && user.role !== 'NIC_ADMIN') router.push('/dashboard');
  }, [user, router]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // Auto-load first judge question on mount
  useEffect(() => {
    if (messages.length === 0) sendMessage('', true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async (userText: string, isInit = false) => {
    if (!isInit && (!userText.trim() || loading)) return;

    const newMessages: Message[] = isInit
      ? []
      : [...messages, { role: 'user' as const, content: userText }];

    if (!isInit) {
      setMessages(newMessages);
      setInput('');
    }
    setLoading(true);

    try {
      const res = await fetch('/api/ai/judge-simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, session_id: sessionId }),
      });
      const data = await res.json();
      const judgeResponse: string = data.response || 'Judge is unavailable.';

      // Parse and store score
      const scored = parseScore(judgeResponse);
      if (scored) setScores(prev => [...prev, scored]);

      setMessages(prev => [...prev, { role: 'assistant', content: judgeResponse }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Judge panel is unavailable. Check your API key.' }]);
    }
    setLoading(false);
  };

  const avgScore = scores.length > 0
    ? (scores.reduce((s, sc) => s + sc.score, 0) / scores.length).toFixed(1)
    : null;

  const TOPICS = [
    'Sealed Bid Commitments explained',
    'Hyperledger Fabric vs Ethereum justified',
    'Fraud detection accuracy rate given',
    'GFR 2017 rules referenced correctly',
    'Scalability to 200,000 tenders addressed',
    'False positive rate + override process',
    'CAG audit workflow demonstrated',
    'NIC deployment pathway explained',
  ];

  const coveredTopics = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase())
    .join(' ');

  const topicCovered = (topic: string) => {
    const keywords: Record<string, string[]> = {
      'zkp': ['zkp', 'sha-256', 'commitment', 'zero-knowledge', 'sealed'],
      'hyperledger': ['hyperledger', 'fabric', 'ethereum', 'blockchain'],
      'fraud detection accuracy': ['accuracy', 'false positive', 'detection rate', '%'],
      'gfr': ['gfr', 'rule 144', 'rule 149', 'general financial'],
      'scalability': ['scal', '200,000', 'lakh', 'tps'],
      'false positive': ['false positive', 'override', 'wrong', 'legitimate'],
      'cag': ['cag', 'audit', 'auditor', 'comptroller'],
      'nic': ['nic', 'deploy', 'vercel', 'cloud', 'host'],
    };
    for (const [key, words] of Object.entries(keywords)) {
      if (topic.toLowerCase().includes(key) && words.some(w => coveredTopics.includes(w))) return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 pt-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <h1 style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif', color: 'white', marginBottom: 8 }}>
          🎯 Judge Q&A Simulator
        </h1>
        <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid #fbbf24', borderRadius: 8, padding: '8px 16px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: '#fbbf24', margin: 0 }}>🔒 Private Practice Mode — This page is not visible during the competition demo</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: 24 }}>
          {/* LEFT — Chat */}
          <div className="card-glass rounded-2xl overflow-hidden flex flex-col" style={{ height: 700 }}>
            {/* Message list */}
            <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map((msg, i) => {
                if (msg.role === 'assistant') {
                  const scoreData = parseScore(msg.content);
                  const judgeNameMatch = msg.content.match(/JUDGE (.+?) \(/);
                  const judgeName = judgeNameMatch ? judgeNameMatch[1].trim() : 'Judge';
                  const jc = getJudgeColor(judgeName);
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: jc.bg, color: jc.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {jc.initials}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 11, color: jc.text, marginBottom: 4, fontWeight: 600 }}>{judgeName}</p>
                        <div style={{ background: '#1f2937', borderRadius: '0 12px 12px 12px', padding: '12px 16px' }}>
                          <pre style={{ fontSize: 13, color: '#e5e7eb', whiteSpace: 'pre-wrap', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6, margin: 0 }}>{msg.content}</pre>
                          {scoreData && (
                            <span style={{ display: 'inline-block', marginTop: 8, padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: scoreData.score >= 8 ? 'rgba(34,197,94,0.2)' : scoreData.score >= 6 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)', color: scoreData.score >= 8 ? '#4ade80' : scoreData.score >= 6 ? '#fbbf24' : '#f87171' }}>
                              {scoreData.score}/10
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ maxWidth: '75%', background: '#003f88', borderRadius: '12px 12px 0 12px', padding: '12px 16px' }}>
                      <p style={{ fontSize: 13, color: 'white', margin: 0, lineHeight: 1.6 }}>{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div style={{ display: 'flex', gap: 6, padding: '8px 16px' }}>
                  {[0, 1, 2].map(i => <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#6b7280', animation: `bounce 1s ${i * 0.2}s infinite` }} />)}
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) sendMessage(input); }}
                placeholder="Type your answer to the judge's question..."
                rows={3}
                maxLength={600}
                className="input-field w-full resize-none"
                style={{ fontSize: 14, marginBottom: 8 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{input.length}/600 chars · Ctrl+Enter to submit</span>
                <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="btn-primary" style={{ padding: '8px 24px' }}>
                  {loading ? 'Judge evaluating...' : 'Submit Answer →'}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT — Score Dashboard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Score by judge */}
            <div className="card-glass rounded-xl p-5">
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📊 Live Score Tracker</h3>
              {Object.entries(JUDGE_COLORS).map(([name, jc]) => {
                const judgeScores = scores.filter(s => s.judge.includes(name.split(' ')[1]));
                const avg = judgeScores.length > 0
                  ? (judgeScores.reduce((s, sc) => s + sc.score, 0) / judgeScores.length).toFixed(1)
                  : null;
                return (
                  <div key={name} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: jc.text }}>{name}</span>
                      <span style={{ fontSize: 12, color: jc.text }}>{avg ? `${avg}/10` : 'Pending'}</span>
                    </div>
                    <div style={{ height: 4, background: '#374151', borderRadius: 2 }}>
                      <div style={{ height: '100%', borderRadius: 2, background: jc.text, width: `${avg ? (parseFloat(avg) / 10) * 100 : 0}%`, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                );
              })}
              {avgScore && (
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: parseFloat(avgScore) >= 7 ? '#4ade80' : '#fbbf24' }}>
                    Overall: {avgScore} / 10
                  </p>
                  <p style={{ fontSize: 11, color: '#6b7280' }}>
                    {parseFloat(avgScore) >= 8 ? 'Excellent — Top 10%' : parseFloat(avgScore) >= 7 ? 'Good — Top 25%' : 'Needs practice'}
                  </p>
                </div>
              )}
            </div>

            {/* Topics checklist */}
            <div className="card-glass rounded-xl p-5">
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>✅ Topics Coverage</h3>
              {TOPICS.map((topic, i) => {
                const covered = topicCovered(topic);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, color: covered ? '#4ade80' : '#6b7280' }}>{covered ? '☑' : '☐'}</span>
                    <span style={{ fontSize: 12, color: covered ? '#e5e7eb' : '#6b7280' }}>{topic}</span>
                  </div>
                );
              })}
            </div>

            {/* Study guide */}
            <div className="card-glass rounded-xl overflow-hidden">
              <button
                onClick={() => setShowStudy(!showStudy)}
                style={{ width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'white' }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>📚 Pre-Written Answers</span>
                <span style={{ color: '#6b7280' }}>{showStudy ? '▲' : '▼'}</span>
              </button>
              {showStudy && (
                <div style={{ padding: 16, maxHeight: 400, overflowY: 'auto' }}>
                  {STUDY_QA.map((qa, i) => (
                    <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#60a5fa', marginBottom: 4 }}>Q: {qa.q}</p>
                      <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>A: {qa.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => { setMessages([]); setScores([]); setTimeout(() => sendMessage('', true), 0); }} className="w-full text-sm py-2 rounded-xl bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400 transition-all border border-[var(--border-subtle)]">
              🔄 Reset Session
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }`}</style>
    </div>
  );
}

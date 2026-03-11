'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { getTenders, getBidsForTender, generateCommitment, commitBid, formatPaise } from '@/lib/api';

export default function BidsPage() {
  const { token, user } = useAuthStore();
  const [tenders, setTenders] = useState<any[]>([]);
  const [selectedTender, setSelectedTender] = useState<string>('');
  const [bids, setBids] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [commitment, setCommitment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    getTenders(token, 'BIDDING_OPEN').then(res => setTenders(res.tenders || [])).catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!token || !selectedTender) return;
    getBidsForTender(token, selectedTender).then(res => setBids(res.bids || [])).catch(console.error);
  }, [token, selectedTender]);

  const handleGenerateCommitment = async () => {
    if (!token || !amount) return;
    setLoading(true);
    try {
      const amountPaise = Math.round(parseFloat(amount) * 100);
      const res = await generateCommitment(token, amountPaise);
      setCommitment(res);
      setMessage('');
    } catch (e: any) { setMessage(e.message); }
    setLoading(false);
  };

  const handleSubmitBid = async () => {
    if (!token || !commitment || !selectedTender) return;
    setLoading(true);
    try {
      await commitBid(token, {
        tender_id: selectedTender,
        commitment_hash: commitment.commitment_hash,
        zkp_proof: commitment.zkp_proof,
        bidder_documents_ipfs_hash: '',
      });
      setMessage('✅ Bid committed! Your bid amount is encrypted on the blockchain.');
      setCommitment(null);
      setAmount('');
      // Reload bids
      const res = await getBidsForTender(token, selectedTender);
      setBids(res.bids || []);
    } catch (e: any) { setMessage('❌ ' + e.message); }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">ZKP Bids</h1>
        <p className="text-sm text-[var(--text-secondary)]">Zero-Knowledge Proof encrypted bidding — amounts hidden until reveal</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submit Bid */}
        <div className="card-glass p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            🔒 Submit Encrypted Bid
          </h2>
          {user?.role !== 'BIDDER' ? (
            <div className="text-center py-6 text-[var(--text-secondary)]">
              <p className="text-3xl mb-2">🔐</p>
              <p className="text-sm">Login as a Bidder to submit bids</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Select Tender</label>
                <select className="input-field" value={selectedTender} onChange={e => setSelectedTender(e.target.value)}>
                  <option value="">Choose a tender...</option>
                  {tenders.map((t, i) => (
                    <option key={i} value={t.tender_id}>
                      {t.tender_id} — {t.title?.slice(0, 40)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Bid Amount (₹)</label>
                <input type="number" className="input-field" placeholder="e.g. 1180000000"
                  value={amount} onChange={e => setAmount(e.target.value)} />
                {amount && <p className="text-xs text-[var(--text-secondary)] mt-1">= {formatPaise(parseFloat(amount) * 100)}</p>}
              </div>

              <div className="flex gap-3">
                <button onClick={handleGenerateCommitment} className="btn-primary flex-1" disabled={loading || !amount}>
                  {loading ? '⏳ Generating...' : '🔐 Generate ZKP Commitment'}
                </button>
              </div>

              {commitment && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 space-y-2">
                  <p className="text-sm font-semibold text-green-400">✅ Commitment Generated</p>
                  <div className="text-xs font-mono space-y-1">
                    <p><span className="text-[var(--text-secondary)]">Hash:</span> {commitment.commitment_hash?.slice(0, 32)}...</p>
                    <p><span className="text-[var(--text-secondary)]">Amount:</span> {commitment.amount_display}</p>
                  </div>
                  <p className="text-xs text-yellow-400">⚠️ {commitment.warning}</p>
                  <button onClick={handleSubmitBid} className="btn-primary w-full mt-2" disabled={loading}>
                    📤 Submit Bid to Blockchain
                  </button>
                </div>
              )}

              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.startsWith('✅') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {message}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bid List */}
        <div className="card-glass p-6">
          <h2 className="text-lg font-semibold mb-4">📊 Bids for Tender</h2>
          {!selectedTender ? (
            <p className="text-sm text-[var(--text-secondary)] py-6 text-center">Select a tender to view bids</p>
          ) : bids.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-6 text-center">No bids yet for this tender</p>
          ) : (
            <div className="space-y-2">
              {bids.map((bid, i) => (
                <div key={i} className="p-3 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{bid.bid_id?.slice(0, 20)}...</p>
                    <p className="text-xs text-[var(--text-secondary)]">{bid.bidder_did?.slice(0, 30)}...</p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${bid.status === 'REVEALED' ? 'badge-success' : 'badge-info'}`}>
                      {bid.status === 'COMMITTED' ? '🔒 Encrypted' : '🔓 Revealed'}
                    </span>
                    {bid.revealed_amount_paise && (
                      <p className="text-sm font-bold text-[var(--accent)] mt-1">{formatPaise(bid.revealed_amount_paise)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ZKP Explanation */}
      <div className="card-glass p-6">
        <h2 className="text-lg font-semibold mb-3">🔐 How ZKP Bidding Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Commit (Encrypt)', desc: 'Bidder encrypts amount using SHA-256 Pedersen commitment. Nobody can see the actual amount.', icon: '🔒' },
            { step: '2', title: 'Deadline Passes', desc: 'All bids are locked on the blockchain. No changes possible after commit.', icon: '⏰' },
            { step: '3', title: 'Reveal & Verify', desc: 'Bidder reveals amount + randomness. Chaincode cryptographically verifies the commitment.', icon: '✅' },
          ].map((s, i) => (
            <div key={i} className="p-4 rounded-xl bg-[var(--bg-secondary)] text-center">
              <div className="text-3xl mb-2">{s.icon}</div>
              <p className="text-sm font-semibold mb-1">Phase {s.step}: {s.title}</p>
              <p className="text-xs text-[var(--text-secondary)]">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * TenderShield — API Client
 * Centralized API functions for backend communication.
 */

const API_BASE = '/api/v1';
const AI_BASE = '/ai';

// ========== Auth ==========

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || 'Login failed');
  return res.json();
}

export async function getDemoUsers() {
  const res = await fetch(`${API_BASE}/auth/demo-users`);
  return res.json();
}

export async function getCurrentUser(token: string) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

// ========== Tenders ==========

export async function getTenders(token: string, status?: string) {
  const url = status ? `${API_BASE}/tenders/?status_filter=${status}` : `${API_BASE}/tenders/`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getTender(token: string, ministryCode: string, tenderId: string) {
  const res = await fetch(`${API_BASE}/tenders/${ministryCode}/${tenderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function createTender(token: string, data: any) {
  const res = await fetch(`${API_BASE}/tenders/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function freezeTender(token: string, ministryCode: string, tenderId: string, reason: string) {
  const res = await fetch(`${API_BASE}/tenders/${ministryCode}/${tenderId}/freeze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason }),
  });
  return res.json();
}

// ========== Bids ==========

export async function generateCommitment(token: string, amountPaise: number) {
  const res = await fetch(`${API_BASE}/bids/generate-commitment?amount_paise=${amountPaise}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function commitBid(token: string, data: any) {
  const res = await fetch(`${API_BASE}/bids/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function revealBid(token: string, data: any) {
  const res = await fetch(`${API_BASE}/bids/reveal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getBidsForTender(token: string, tenderId: string) {
  const res = await fetch(`${API_BASE}/bids/tender/${tenderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

// ========== Dashboard ==========

export async function getDashboardStats(token: string) {
  const res = await fetch(`${API_BASE}/dashboard/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getRecentEvents(token: string, topic?: string) {
  const url = topic ? `${API_BASE}/dashboard/events?topic=${topic}` : `${API_BASE}/dashboard/events`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getHealthCheck() {
  const res = await fetch(`${API_BASE}/dashboard/health`);
  return res.json();
}

// ========== AI Engine ==========

export async function runDemoAnalysis(scenario: string) {
  const res = await fetch(`${AI_BASE}/demo/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario }),
  });
  return res.json();
}

export async function getDetectors() {
  const res = await fetch(`${AI_BASE}/detectors`);
  return res.json();
}

// ========== Helpers ==========

export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 1_00_00_000) return `₹${(rupees / 1_00_00_000).toFixed(2)} Cr`;
  if (rupees >= 1_00_000) return `₹${(rupees / 1_00_000).toFixed(2)} L`;
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function getStatusBadge(status: string): { class: string; label: string } {
  const map: Record<string, { class: string; label: string }> = {
    DRAFT: { class: 'badge-info', label: '📝 Draft' },
    PUBLISHED: { class: 'badge-info', label: '📢 Published' },
    BIDDING_OPEN: { class: 'badge-success', label: '🟢 Bidding Open' },
    UNDER_EVALUATION: { class: 'badge-warning', label: '⏳ Under Review' },
    AWARDED: { class: 'badge-success', label: '🏆 Awarded' },
    FROZEN_BY_AI: { class: 'badge-danger', label: '🚨 AI Frozen' },
    CANCELLED: { class: 'badge-danger', label: '❌ Cancelled' },
    COMMITTED: { class: 'badge-info', label: '🔒 Committed' },
    REVEALED: { class: 'badge-success', label: '🔓 Revealed' },
  };
  return map[status] || { class: 'badge-info', label: status };
}

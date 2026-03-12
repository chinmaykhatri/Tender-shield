/**
 * TenderShield — API Client
 * Centralized API functions for backend communication.
 * Includes demo mode fallback when backend is not available.
 */

const API_BASE = '/api/v1';
const AI_BASE = '/ai';

// ========== Demo Mode Data ==========

const DEMO_USERS = [
  { email: 'officer@morth.gov.in', name: 'Rajesh Kumar (MoRTH)', role: 'OFFICER', org: 'MinistryOrg' },
  { email: 'medtech@medtechsolutions.com', name: 'Priya Sharma (MedTech)', role: 'BIDDER', org: 'BidderOrg' },
  { email: 'admin@biomedicorp.com', name: 'Shell Corp (BioMedi)', role: 'BIDDER', org: 'BidderOrg' },
  { email: 'auditor@cag.gov.in', name: 'Amit Verma (CAG)', role: 'AUDITOR', org: 'AuditorOrg' },
  { email: 'admin@nic.in', name: 'NIC Administrator', role: 'NIC_ADMIN', org: 'NICOrg' },
];

const ROLE_PASSWORDS: Record<string, string> = {
  OFFICER: 'Tender@2025',
  BIDDER: 'Bid@2025',
  AUDITOR: 'Audit@2025',
  NIC_ADMIN: 'Admin@2025',
};

function detectRole(email: string): { role: string; org: string; name: string } {
  const demoUser = DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (demoUser) return { role: demoUser.role, org: demoUser.org, name: demoUser.name };

  // For any other email, assign a default role
  if (email.includes('gov.in')) return { role: 'OFFICER', org: 'MinistryOrg', name: email.split('@')[0] };
  if (email.includes('cag')) return { role: 'AUDITOR', org: 'AuditorOrg', name: email.split('@')[0] };
  if (email.includes('nic')) return { role: 'NIC_ADMIN', org: 'NICOrg', name: email.split('@')[0] };
  return { role: 'BIDDER', org: 'BidderOrg', name: email.split('@')[0] };
}

// ========== Auth ==========

export async function login(email: string, password: string) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Login failed');
    return res.json();
  } catch {
    // Demo mode fallback — works without backend
    const { role, org, name } = detectRole(email);
    return {
      access_token: `demo_token_${Date.now()}`,
      role,
      org,
      name,
      demo_mode: true,
    };
  }
}

export async function getDemoUsers() {
  try {
    const res = await fetch(`${API_BASE}/auth/demo-users`);
    if (!res.ok) throw new Error('Backend unavailable');
    return res.json();
  } catch {
    // Return hardcoded demo users when backend is not available
    return {
      demo_users: DEMO_USERS.map(u => ({ ...u, password: ROLE_PASSWORDS[u.role] || 'Demo@2025' })),
    };
  }
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

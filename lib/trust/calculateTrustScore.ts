/**
 * TenderShield — Trust Score Calculation Engine
 * Every company gets a 0-100 trust score based on history.
 */

export interface TrustInput {
  gstin_age_months: number;
  is_gem_verified: boolean;
  is_msme: boolean;
  tenders_won: number;
  tenders_bid: number;
  fraud_confirmed_count: number;
  is_shell_company: boolean;
  pan_duplicate_count: number;
  fraud_flags_count: number;
}

export interface TrustResult {
  score: number;
  grade: string;
  badge: string;
  factors: string[];
}

export function calculateTrustScore(company: TrustInput): TrustResult {
  let score = 50;
  const factors: string[] = [];

  // POSITIVE factors
  const ageBonus = Math.min(20, Math.floor(company.gstin_age_months / 12) * 5);
  if (ageBonus > 0) {
    score += ageBonus;
    factors.push(`GSTIN age: ${company.gstin_age_months} months (+${ageBonus} pts)`);
  }

  if (company.is_gem_verified) {
    score += 10;
    factors.push('GeM Verified Seller (+10 pts)');
  }

  if (company.is_msme) {
    score += 5;
    factors.push('MSME Certified (+5 pts)');
  }

  const wonBonus = Math.min(15, company.tenders_won * 3);
  if (wonBonus > 0) {
    score += wonBonus;
    factors.push(`${company.tenders_won} tenders won cleanly (+${wonBonus} pts)`);
  }

  const bidBonus = Math.min(10, company.tenders_bid * 2);
  if (bidBonus > 0) {
    score += bidBonus;
    factors.push(`${company.tenders_bid} tenders participated (+${bidBonus} pts)`);
  }

  if (company.fraud_flags_count === 0) {
    score += 5;
    factors.push('No fraud flags in last 12 months (+5 pts)');
  }

  // NEGATIVE factors
  if (company.fraud_confirmed_count > 0) {
    const penalty = company.fraud_confirmed_count * 20;
    score -= penalty;
    factors.push(`${company.fraud_confirmed_count} confirmed fraud case(s) (-${penalty} pts)`);
  }

  if (company.is_shell_company) {
    score -= 15;
    factors.push('Shell company risk detected (-15 pts)');
  }

  if (company.pan_duplicate_count > 0) {
    const penalty = company.pan_duplicate_count * 10;
    score -= penalty;
    factors.push(`${company.pan_duplicate_count} shared director PAN(s) (-${penalty} pts)`);
  }

  if (company.fraud_flags_count > 0) {
    const penalty = company.fraud_flags_count * 3;
    score -= penalty;
    factors.push(`${company.fraud_flags_count} AI fraud flag(s) (-${penalty} pts)`);
  }

  if (company.gstin_age_months < 6) {
    score -= 10;
    factors.push('GSTIN age < 6 months (-10 pts)');
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Grade
  let grade: string;
  let badge: string;
  if (score >= 85) { grade = 'PLATINUM'; badge = 'gold'; }
  else if (score >= 70) { grade = 'GOLD'; badge = 'green'; }
  else if (score >= 55) { grade = 'SILVER'; badge = 'blue'; }
  else if (score >= 40) { grade = 'BRONZE'; badge = 'yellow'; }
  else { grade = 'FLAGGED'; badge = 'red'; }

  return { score, grade, badge, factors };
}

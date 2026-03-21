// FILE: lib/verification/gstin.ts
// PURPOSE: Verify company GSTIN via GST portal — shell company detection
// INDIA API: API Setu (Government of India, FREE)
// MOCK MODE: YES — demo GSTINs return real-looking data

import { withFallback } from '@/lib/mode/dualMode';
import type { GSTINVerification } from './types';

// Demo GSTIN database — includes shell company scenarios
const DEMO_GSTIN_DB: Record<string, GSTINVerification> = {
  '07AABCM1234A1ZK': {
    gstin: '07AABCM1234A1ZK',
    legal_name: 'MEDTECH SOLUTIONS PRIVATE LIMITED',
    trade_name: 'MedTech Solutions',
    registration_date: '2018-04-12',
    status: 'ACTIVE',
    business_type: 'Private Limited Company',
    state: 'Delhi',
    filing_frequency: 'MONTHLY',
    age_months: 83,
    is_shell_company_risk: false,
  },
  '07AABCB5678B1ZP': {
    gstin: '07AABCB5678B1ZP',
    legal_name: 'BIOMED CORP INDIA PRIVATE LIMITED',
    trade_name: 'BioMed Corp',
    registration_date: '2025-01-15',
    status: 'ACTIVE',
    business_type: 'Private Limited Company',
    state: 'Delhi',
    filing_frequency: 'QUARTERLY',
    age_months: 3,
    is_shell_company_risk: true, // SHELL COMPANY!
  },
  '07AABCP9012C1ZM': {
    gstin: '07AABCP9012C1ZM',
    legal_name: 'PHARMA PLUS EQUIPMENT LIMITED',
    trade_name: 'Pharma Plus',
    registration_date: '2025-02-20',
    status: 'ACTIVE',
    business_type: 'Private Limited Company',
    state: 'Delhi',
    filing_frequency: 'QUARTERLY',
    age_months: 2,
    is_shell_company_risk: true, // SHELL COMPANY!
  },
  '07AABCH3456D1ZQ': {
    gstin: '07AABCH3456D1ZQ',
    legal_name: 'HEALTHCARE INDIA SYSTEMS LIMITED',
    trade_name: 'HealthCare India',
    registration_date: '2015-08-30',
    status: 'ACTIVE',
    business_type: 'Public Limited Company',
    state: 'Delhi',
    filing_frequency: 'MONTHLY',
    age_months: 115,
    is_shell_company_risk: false,
  },
};

export function validateGSTINFormat(gstin: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
    gstin?.trim().toUpperCase() ?? ''
  );
}

function getStateFromCode(code: string): string {
  const states: Record<string, string> = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
    '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi',
    '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
    '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh', '24': 'Gujarat', '27': 'Maharashtra',
    '29': 'Karnataka', '32': 'Kerala', '33': 'Tamil Nadu',
    '36': 'Telangana', '37': 'Andhra Pradesh',
  };
  return states[code] ?? 'India';
}

export async function verifyGSTIN(gstin: string) {
  const cleaned = gstin.trim().toUpperCase();

  if (!validateGSTINFormat(cleaned)) {
    return {
      data: { success: false as const, error: 'Invalid GSTIN format. Expected: 22AAAAA0000A1Z5 (15 characters)' },
      mode: 'DEMO' as const,
    };
  }

  return withFallback({
    service: 'gstin',
    label: 'GSTIN Verify',
    realFn: async () => {
      const response = await fetch(
        `https://api.apisetu.gov.in/gstn/v3/taxpayerDetails/${cleaned}`,
        {
          headers: {
            'X-APISETU-APIKEY': process.env.API_SETU_KEY!,
            'X-APISETU-CLIENTID': process.env.API_SETU_CLIENT_ID!,
          },
        }
      );
      if (!response.ok) throw new Error(`API Setu error: ${response.status}`);
      const result = await response.json();
      const d = result.taxpayerInfo;
      const [dd, mm, yyyy] = (d.rgdt ?? '01/01/2020').split('/');
      const regDateISO = `${yyyy}-${mm}-${dd}`;
      const ageMonths = Math.floor(
        (Date.now() - new Date(regDateISO).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      return {
        success: true as const,
        data: {
          gstin: cleaned, legal_name: d.lgnm, trade_name: d.tradeName ?? d.lgnm,
          registration_date: regDateISO, status: d.sts, business_type: d.ctb,
          state: d.stj, filing_frequency: 'MONTHLY', age_months: ageMonths,
          is_shell_company_risk: ageMonths < 6,
        } as GSTINVerification,
      };
    },
    demoFn: () => {
      const demo = DEMO_GSTIN_DB[cleaned];
      if (demo) return { success: true as const, data: demo };
      return {
        success: true as const,
        data: {
          gstin: cleaned, legal_name: 'DEMO COMPANY PVT LTD', trade_name: 'Demo Company',
          registration_date: '2020-04-01', status: 'ACTIVE' as const,
          business_type: 'Private Limited', state: getStateFromCode(cleaned.slice(0, 2)),
          filing_frequency: 'MONTHLY', age_months: 59, is_shell_company_risk: false,
        } as GSTINVerification,
      };
    },
  });
}

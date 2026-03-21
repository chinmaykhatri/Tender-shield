// FILE: lib/verification/types.ts
// PURPOSE: Shared TypeScript types for all verification flows
// INDIA API: none — just type definitions
// MOCK MODE: N/A

export type VerificationStatus =
  | 'PENDING'
  | 'OTP_SENT'
  | 'VERIFIED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REJECTED';

export type UserRole =
  | 'MINISTRY_OFFICER'
  | 'SENIOR_OFFICER'
  | 'BIDDER'
  | 'CAG_AUDITOR'
  | 'NIC_ADMIN';

export interface AadhaarVerification {
  aadhaar_number: string;       // last 4 digits only
  name: string;
  date_of_birth: string;
  gender: string;
  address: string;
  mobile_last_4: string;
  verified_at_ist: string;
  transaction_id: string;
}

export interface GSTINVerification {
  gstin: string;
  legal_name: string;
  trade_name: string;
  registration_date: string;
  status: 'ACTIVE' | 'CANCELLED' | 'SUSPENDED';
  business_type: string;
  state: string;
  filing_frequency: string;
  age_months: number;
  is_shell_company_risk: boolean;
}

export interface PANVerification {
  pan: string;
  name: string;
  date_of_birth: string;
  pan_type: 'INDIVIDUAL' | 'COMPANY' | 'FIRM' | 'TRUST';
  is_valid: boolean;
  already_registered: boolean;
}

export interface GovEmailVerification {
  email: string;
  domain: string;
  is_gov_domain: boolean;
  ministry_code: string;
  email_otp_verified: boolean;
}

export interface EmployeeVerification {
  employee_id: string;
  ministry_code: string;
  department: string;
  designation: string;
  is_valid: boolean;
}

export interface GeMVerification {
  gem_seller_id: string;
  seller_name: string;
  registration_date: string;
  categories: string[];
  is_verified: boolean;
  is_active: boolean;
}

export interface UdyamVerification {
  udyam_number: string;
  enterprise_name: string;
  category: 'MICRO' | 'SMALL' | 'MEDIUM';
  registration_date: string;
  nic_codes: string[];
  is_valid: boolean;
}

export interface VerificationRecord {
  user_id: string;
  role: UserRole;
  aadhaar: VerificationStatus;
  email: VerificationStatus;
  gstin?: VerificationStatus;
  pan?: VerificationStatus;
  employee_id?: VerificationStatus;
  gem_id?: VerificationStatus;
  udyam?: VerificationStatus;
  access_code?: VerificationStatus;
  overall_status: VerificationStatus;
  admin_approved: boolean;
  admin_approved_by?: string;
  admin_approved_at_ist?: string;
  created_at_ist: string;
  verified_at_ist?: string;
}

// Ministry domain mapping for auto-detection
export const MINISTRY_DOMAINS: Record<string, string> = {
  'morth.gov.in': 'Ministry of Road Transport & Highways',
  'moh.gov.in': 'Ministry of Health & Family Welfare',
  'moe.gov.in': 'Ministry of Education',
  'mod.gov.in': 'Ministry of Defence',
  'finmin.gov.in': 'Ministry of Finance',
  'railway.gov.in': 'Ministry of Railways',
  'agriculture.gov.in': 'Ministry of Agriculture',
  'commerce.gov.in': 'Ministry of Commerce & Industry',
  'meity.gov.in': 'Ministry of Electronics & IT',
  'mha.gov.in': 'Ministry of Home Affairs',
  'mea.gov.in': 'Ministry of External Affairs',
  'mohua.gov.in': 'Ministry of Housing & Urban Affairs',
  'powermin.gov.in': 'Ministry of Power',
  'petroleum.gov.in': 'Ministry of Petroleum & Natural Gas',
  'coal.gov.in': 'Ministry of Coal',
  'steel.gov.in': 'Ministry of Steel',
  'mowr.gov.in': 'Ministry of Water Resources',
  'moef.gov.in': 'Ministry of Environment',
  'labour.gov.in': 'Ministry of Labour & Employment',
  'wcd.gov.in': 'Ministry of Women & Child Development',
  'tribal.gov.in': 'Ministry of Tribal Affairs',
  'socialjustice.gov.in': 'Ministry of Social Justice',
  'nic.in': 'National Informatics Centre (NIC)',
  'cag.gov.in': 'Comptroller & Auditor General of India',
};

// All Indian ministry options for dropdown
export const MINISTRY_OPTIONS = [
  'Ministry of Finance',
  'Ministry of Road Transport & Highways (MoRTH)',
  'Ministry of Health & Family Welfare',
  'Ministry of Education',
  'Ministry of Defence',
  'Ministry of Railways',
  'Ministry of Agriculture',
  'Ministry of Commerce & Industry',
  'Ministry of Electronics & IT (MeitY)',
  'Ministry of Home Affairs',
  'Ministry of External Affairs',
  'Ministry of Housing & Urban Affairs',
  'Ministry of Power',
  'Ministry of Petroleum & Natural Gas',
  'Ministry of Coal',
  'Ministry of Steel',
  'Ministry of Water Resources',
  'Ministry of Environment',
  'Ministry of Labour & Employment',
  'Ministry of Women & Child Development',
  'Ministry of Tribal Affairs',
  'Ministry of Social Justice',
  'National Informatics Centre (NIC)',
  'Other (specify)',
];

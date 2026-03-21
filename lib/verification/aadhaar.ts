// FILE: lib/verification/aadhaar.ts
// PURPOSE: Aadhaar OTP send + verify via UIDAI sandbox
// INDIA API: Surepass (real: developer.uidai.gov.in)
// MOCK MODE: YES — accepts OTP "123456" in demo mode

import { withFallback } from '@/lib/mode/dualMode';
import type { AadhaarVerification } from './types';

const SUREPASS_API = 'https://kyc-api.surepass.io/api/v1';

// Demo Aadhaar profiles — realistic Indian identity data
const DEMO_AADHAAR_DB: Record<string, AadhaarVerification> = {
  '999999999999': {
    aadhaar_number: '9999',
    name: 'Rajesh Kumar Sharma',
    date_of_birth: '1985-03-15',
    gender: 'MALE',
    address: 'Ministry of Road Transport, New Delhi - 110001',
    mobile_last_4: '7823',
    verified_at_ist: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    transaction_id: 'DEMO-UIDAI-' + Date.now(),
  },
  '888888888888': {
    aadhaar_number: '8888',
    name: 'Vikram Patel',
    date_of_birth: '1978-06-22',
    gender: 'MALE',
    address: 'Plot 45, Sector 18, Gurugram, Haryana - 122001',
    mobile_last_4: '4521',
    verified_at_ist: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    transaction_id: 'DEMO-UIDAI-' + Date.now(),
  },
  '777777777777': {
    aadhaar_number: '7777',
    name: 'Priya Gupta',
    date_of_birth: '1982-11-08',
    gender: 'FEMALE',
    address: 'CAG Bhawan, Bahadur Shah Zafar Marg, New Delhi - 110002',
    mobile_last_4: '9134',
    verified_at_ist: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    transaction_id: 'DEMO-UIDAI-' + Date.now(),
  },
};

export async function sendAadhaarOTP(aadhaarNumber: string) {
  if (!/^\d{12}$/.test(aadhaarNumber)) {
    return { data: { success: false, error: 'Aadhaar number must be exactly 12 digits' }, mode: 'DEMO' as const };
  }

  return withFallback({
    service: 'aadhaar',
    label: 'Aadhaar OTP Send',
    realFn: async () => {
      const response = await fetch(`${SUREPASS_API}/aadhaar-v2/generate-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUREPASS_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_number: aadhaarNumber }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return { success: true, txnId: data.data.client_id as string };
    },
    demoFn: () => ({
      success: true,
      txnId: `DEMO-TXN-${Date.now()}`,
    }),
  });
}

export async function verifyAadhaarOTP(
  aadhaarNumber: string,
  otp: string,
  txnId: string
) {
  if (!/^\d{6}$/.test(otp)) {
    return { data: { success: false, error: 'OTP must be 6 digits' }, mode: 'DEMO' as const };
  }

  return withFallback({
    service: 'aadhaar',
    label: 'Aadhaar OTP Verify',
    realFn: async () => {
      const response = await fetch(`${SUREPASS_API}/aadhaar-v2/submit-otp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUREPASS_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ client_id: txnId, otp }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      const d = result.data;
      return {
        success: true,
        data: {
          aadhaar_number: aadhaarNumber.slice(-4),
          name: d.full_name,
          date_of_birth: d.dob,
          gender: d.gender,
          address: `${d.address?.dist ?? ''}, ${d.address?.state ?? ''}`.trim(),
          mobile_last_4: '****',
          verified_at_ist: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          transaction_id: txnId,
        } as AadhaarVerification,
      };
    },
    demoFn: (): any => {
      if (otp !== '123456') {
        return { success: false, error: 'Invalid OTP. Demo mode accepts: 123456' };
      }
      return {
        success: true,
        data: DEMO_AADHAAR_DB[aadhaarNumber] ?? {
          aadhaar_number: aadhaarNumber.slice(-4),
          name: 'Verified User',
          date_of_birth: '1990-01-01',
          gender: 'MALE',
          address: 'New Delhi, India',
          mobile_last_4: '****',
          verified_at_ist: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          transaction_id: txnId,
        },
      };
    },
  });
}

// FILE: lib/verification/pan.ts
// PURPOSE: Verify PAN + detect shared PANs (collusion detection)
// INDIA API: API Setu (Government of India, FREE)
// MOCK MODE: YES — demo PANs return real-looking data

import { withFallback } from '@/lib/mode/dualMode';
import type { PANVerification } from './types';
import { supabase } from '@/lib/supabase';

const DEMO_PAN_DB: Record<string, PANVerification> = {
  'ABCDE1234F': {
    pan: 'ABCDE1234F',
    name: 'FRAUD DIRECTOR NAME',
    date_of_birth: '1975-05-15',
    pan_type: 'INDIVIDUAL',
    is_valid: true,
    already_registered: false,
  },
  'MEDTK1234M': {
    pan: 'MEDTK1234M',
    name: 'MEDTECH SOLUTIONS PRIVATE LIMITED',
    date_of_birth: '',
    pan_type: 'COMPANY',
    is_valid: true,
    already_registered: false,
  },
};

export function validatePANFormat(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan?.trim().toUpperCase() ?? '');
}

export async function verifyPAN(pan: string) {
  const cleaned = pan.trim().toUpperCase();

  if (!validatePANFormat(cleaned)) {
    return {
      data: { success: false as const, error: 'Invalid PAN format. Expected: ABCDE1234F (10 characters)' },
      mode: 'DEMO' as const,
    };
  }

  return withFallback({
    service: 'pan',
    label: 'PAN Verify',
    realFn: async () => {
      const response = await fetch('https://api.apisetu.gov.in/cams/v3/pan', {
        method: 'POST',
        headers: {
          'X-APISETU-APIKEY': process.env.API_SETU_KEY!,
          'X-APISETU-CLIENTID': process.env.API_SETU_CLIENT_ID!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pan: cleaned }),
      });
      if (!response.ok) throw new Error(`PAN API error: ${response.status}`);
      const result = await response.json();
      return {
        success: true as const,
        data: {
          pan: cleaned, name: result.name, date_of_birth: result.dob ?? '',
          pan_type: (result.panType ?? 'INDIVIDUAL') as PANVerification['pan_type'],
          is_valid: result.valid, already_registered: false,
        } as PANVerification,
      };
    },
    demoFn: () => ({
      success: true as const,
      data: DEMO_PAN_DB[cleaned] ?? {
        pan: cleaned, name: 'DEMO ENTITY', date_of_birth: '',
        pan_type: 'INDIVIDUAL' as const, is_valid: true, already_registered: false,
      } as PANVerification,
    }),
  });
}

// Detect if same PAN is used by multiple bidders (collusion!)
export async function detectSharedPAN(
  pan: string,
  currentUserId: string
): Promise<{ shared: boolean; sharedWith?: string[] }> {
  try {
    const { data } = await supabase
      .from('user_verifications')
      .select('user_id, gstin_legal_name')
      .eq('pan', pan.trim().toUpperCase())
      .neq('user_id', currentUserId);

    if (data && data.length > 0) {
      return {
        shared: true,
        sharedWith: data.map((d: { gstin_legal_name: string }) => d.gstin_legal_name || 'Unknown Company'),
      };
    }
  } catch {
    // Non-critical — don't block registration
  }
  return { shared: false };
}

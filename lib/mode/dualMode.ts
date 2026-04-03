// FILE: lib/mode/dualMode.ts
// PURPOSE: Universal dual-mode engine — try real API, fall back to demo
// WORKS IN DEMO: YES — returns mock data
// WORKS IN REAL: YES — calls real APIs
// SWITCH: NEXT_PUBLIC_DEMO_MODE + individual API keys

export type AppMode = 'DEMO' | 'REAL' | 'PARTIAL';

export interface ModeStatus {
  overall: AppMode;
  services: {
    aadhaar: 'DEMO' | 'REAL';
    gstin: 'DEMO' | 'REAL';
    pan: 'DEMO' | 'REAL';
    claude: 'DEMO' | 'REAL';
    whatsapp: 'DEMO' | 'REAL';
    email: 'DEMO' | 'REAL';
    blockchain: 'DEMO' | 'REAL';
    supabase: 'DEMO' | 'REAL';
  };
  missingKeys: string[];
}

export function getAppMode(): ModeStatus {
  const forcedDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  const keys = {
    aadhaar: !!process.env.SUREPASS_API_TOKEN,
    gstin: !!process.env.API_SETU_KEY,
    pan: !!process.env.API_SETU_KEY,
    claude: !!process.env.ANTHROPIC_API_KEY,
    whatsapp: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    email: !!process.env.RESEND_API_KEY,
    blockchain: !!process.env.FABRIC_CONNECTION_PROFILE,
    supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };

  const missingKeys: string[] = [];
  if (!keys.aadhaar) missingKeys.push('SUREPASS_API_TOKEN');
  if (!keys.gstin) missingKeys.push('API_SETU_KEY');
  if (!keys.claude) missingKeys.push('ANTHROPIC_API_KEY');
  if (!keys.whatsapp) missingKeys.push('TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN');
  if (!keys.email) missingKeys.push('RESEND_API_KEY');
  if (!keys.blockchain) missingKeys.push('FABRIC_CONNECTION_PROFILE');

  const services: ModeStatus['services'] = {
    aadhaar: (forcedDemo || !keys.aadhaar) ? 'DEMO' : 'REAL',
    gstin: (forcedDemo || !keys.gstin) ? 'DEMO' : 'REAL',
    pan: (forcedDemo || !keys.pan) ? 'DEMO' : 'REAL',
    claude: (forcedDemo || !keys.claude) ? 'DEMO' : 'REAL',
    whatsapp: (forcedDemo || !keys.whatsapp) ? 'DEMO' : 'REAL',
    email: (forcedDemo || !keys.email) ? 'DEMO' : 'REAL',
    blockchain: (forcedDemo || !keys.blockchain) ? 'DEMO' : 'REAL',
    supabase: !keys.supabase ? 'DEMO' : 'REAL',
  };

  const realCount = Object.values(services).filter(v => v === 'REAL').length;
  const total = Object.keys(services).length;

  const overall: AppMode =
    forcedDemo ? 'DEMO' :
    realCount === total ? 'REAL' :
    realCount > 0 ? 'PARTIAL' :
    'DEMO';

  return { overall, services, missingKeys };
}

/**
 * Universal try-real-fallback-demo wrapper.
 * Use this for EVERY external API call in TenderShield.
 */
export async function withFallback<T>(options: {
  service: keyof ModeStatus['services'];
  realFn: () => Promise<T>;
  demoFn: () => T | Promise<T>;
  label: string;
}): Promise<{ data: T; mode: 'REAL' | 'DEMO' }> {
  const { service, realFn, demoFn, label } = options;
  const mode = getAppMode();
  const serviceMode = mode.services[service];

  if (serviceMode === 'DEMO') {
    // Demo mode — silent
    const data = await demoFn();
    return { data, mode: 'DEMO' };
  }

  try {
    // Real mode — silent
    const data = await realFn();
    return { data, mode: 'REAL' };
  } catch (error) {
    // Real failed, using demo — silent fallback
    const data = await demoFn();
    return { data, mode: 'DEMO' };
  }
}

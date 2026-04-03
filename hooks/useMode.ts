/**
 * TenderShield — Environment Mode Hook
 * MVP Sandbox = competition demo with pre-loaded data
 * Live Mode = real Supabase database
 */
import { DEMO_MODE } from '@/lib/dataLayer';

export function useMode() {
  return {
    isDemoMode: DEMO_MODE,
    modeName: DEMO_MODE ? 'MVP Sandbox' : 'Live Production',
    modeColor: DEMO_MODE ? '#22c55e' : '#22c55e',
    modeBg: DEMO_MODE ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.1)',
    modeIcon: DEMO_MODE ? '🟢' : '✅',
  };
}

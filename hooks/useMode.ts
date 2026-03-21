/**
 * TenderShield — Demo/Real Mode Hook
 */
import { DEMO_MODE } from '@/lib/dataLayer';

export function useMode() {
  return {
    isDemoMode: DEMO_MODE,
    modeName: DEMO_MODE ? 'Demo Mode' : 'Live Mode',
    modeColor: DEMO_MODE ? '#3b82f6' : '#22c55e',
    modeBg: DEMO_MODE ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)',
    modeIcon: DEMO_MODE ? '🎯' : '✅',
  };
}

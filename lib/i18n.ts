// ═══════════════════════════════════════════════════════════
// TenderShield — Internationalization (i18n) System
// ═══════════════════════════════════════════════════════════

export type Locale = 'en' | 'hi';

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Verify page
    'verify.title': 'Tender Verification Portal',
    'verify.subtitle': 'Verify the integrity of any government tender using SHA-256 blockchain hash chain',
    'verify.enter_id': 'Enter Tender ID',
    'verify.verify_btn': 'Verify Integrity',
    'verify.verifying': 'Verifying on chain...',
    'verify.verified': 'TENDER VERIFIED — INTEGRITY INTACT',
    'verify.failed': 'VERIFICATION FAILED',
    'verify.chain_blocks': 'Chain Blocks',
    'verify.verify_time': 'Verify Time',
    'verify.algorithm': 'Algorithm',
    'verify.powered_by': 'Powered by TenderShield Blockchain',

    // Impact page
    'impact.title': 'National Impact Dashboard',
    'impact.subtitle': 'Real-time statistics on TenderShield\'s impact on government procurement transparency',
    'impact.tenders_secured': 'Tenders Secured',
    'impact.fraud_prevented': 'Fraud Cases Prevented',
    'impact.savings': 'Estimated Savings',
    'impact.transparency': 'Transparency Score',

    // Common
    'common.back_dashboard': '← Back to Dashboard',
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.language': 'Language',
    'common.powered_by': 'Powered by TenderShield',
  },
  hi: {
    // Verify page
    'verify.title': 'टेंडर सत्यापन पोर्टल',
    'verify.subtitle': 'SHA-256 ब्लॉकचेन हैश चेन का उपयोग करके किसी भी सरकारी टेंडर की अखंडता सत्यापित करें',
    'verify.enter_id': 'टेंडर आईडी दर्ज करें',
    'verify.verify_btn': 'अखंडता सत्यापित करें',
    'verify.verifying': 'चेन पर सत्यापित हो रहा है...',
    'verify.verified': '✅ टेंडर सत्यापित — अखंडता बरकरार',
    'verify.failed': '❌ सत्यापन विफल',
    'verify.chain_blocks': 'चेन ब्लॉक',
    'verify.verify_time': 'सत्यापन समय',
    'verify.algorithm': 'एल्गोरिथम',
    'verify.powered_by': 'टेंडरशील्ड ब्लॉकचेन द्वारा संचालित',

    // Impact page
    'impact.title': 'राष्ट्रीय प्रभाव डैशबोर्ड',
    'impact.subtitle': 'सरकारी खरीद पारदर्शिता पर टेंडरशील्ड के प्रभाव के वास्तविक समय के आँकड़े',
    'impact.tenders_secured': 'सुरक्षित टेंडर',
    'impact.fraud_prevented': 'रोके गए धोखाधड़ी मामले',
    'impact.savings': 'अनुमानित बचत',
    'impact.transparency': 'पारदर्शिता स्कोर',

    // Common
    'common.back_dashboard': '← डैशबोर्ड पर वापस जाएँ',
    'common.loading': 'लोड हो रहा है...',
    'common.error': 'कुछ गलत हो गया',
    'common.language': 'भाषा',
    'common.powered_by': 'टेंडरशील्ड द्वारा संचालित',
  },
};

/**
 * Get a translation for a given key and locale
 */
export function t(key: string, locale: Locale = 'en'): string {
  return translations[locale]?.[key] || translations.en[key] || key;
}

/**
 * Get all available locales with labels
 */
export function getLocales(): { code: Locale; label: string; flag: string }[] {
  return [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  ];
}

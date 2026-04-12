// ─────────────────────────────────────────────────
// FILE: components/LanguageToggle.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: EN/हिं toggle + language context provider + useTranslation hook
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { translations, type Language, type TranslationKey } from '@/lib/i18n/translations';

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => translations.en[key] ?? key,
});

export function useLanguage() { return useContext(LanguageContext); }

/** Alias for useLanguage — provides { t, lang, setLang } */
export function useTranslation() { return useContext(LanguageContext); }

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('ts_language') as Language | null;
    if (saved === 'en' || saved === 'hi') setLang(saved);
  }, []);

  const handleSetLang = (l: Language) => {
    setLang(l);
    localStorage.setItem('ts_language', l);
  };

  const t = (key: TranslationKey): string => {
    return translations[lang]?.[key] ?? translations.en[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 6, overflow: 'hidden',
      fontSize: 11, cursor: 'pointer',
    }}>
      <button
        onClick={() => setLang('en')}
        style={{
          padding: '4px 8px',
          background: lang === 'en' ? 'rgba(255,153,51,0.25)' : 'transparent',
          color: lang === 'en' ? '#FF9933' : '#888',
          border: 'none', cursor: 'pointer',
          fontWeight: lang === 'en' ? 600 : 400,
          fontSize: 11,
        }}
      >
        EN
      </button>
      <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.12)' }} />
      <button
        onClick={() => setLang('hi')}
        style={{
          padding: '4px 8px',
          background: lang === 'hi' ? 'rgba(255,153,51,0.25)' : 'transparent',
          color: lang === 'hi' ? '#FF9933' : '#888',
          border: 'none', cursor: 'pointer',
          fontWeight: lang === 'hi' ? 600 : 400,
          fontSize: 11,
          fontFamily: "'Noto Sans Devanagari', sans-serif",
        }}
      >
        हिं
      </button>
    </div>
  );
}

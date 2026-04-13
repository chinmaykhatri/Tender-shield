// ─────────────────────────────────────────────────
// FILE: components/LanguageToggle.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Multi-language selector (6 Indian languages) + context provider + useTranslation hook
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { translations, LANGUAGE_META, type Language, type TranslationKey } from '@/lib/i18n/translations';

const SUPPORTED_LANGUAGES: Language[] = ['en', 'hi', 'ta', 'bn', 'te', 'mr'];

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
    if (saved && SUPPORTED_LANGUAGES.includes(saved)) setLang(saved);
  }, []);

  const handleSetLang = (l: Language) => {
    setLang(l);
    localStorage.setItem('ts_language', l);
  };

  const t = (key: TranslationKey): string => {
    const langData = translations[lang];
    if (langData && key in langData) {
      return langData[key as keyof typeof langData];
    }
    return translations.en[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = LANGUAGE_META[lang];

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 6,
          background: open ? 'rgba(255,153,51,0.12)' : 'transparent',
          color: '#ccc', cursor: 'pointer',
          fontSize: 11, fontWeight: 500,
          transition: 'all 0.2s',
        }}
      >
        <span style={{ fontSize: 13 }}>{current.flag}</span>
        <span style={{ fontWeight: 600, color: '#FF9933' }}>{current.label}</span>
        <span style={{ fontSize: 8, color: '#888' }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, overflow: 'hidden', minWidth: 160,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 100,
        }}>
          {SUPPORTED_LANGUAGES.map(l => {
            const meta = LANGUAGE_META[l];
            const isActive = lang === l;
            return (
              <button
                key={l}
                onClick={() => { setLang(l); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 14px',
                  background: isActive ? 'rgba(255,153,51,0.12)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: isActive ? '#FF9933' : '#ccc',
                  fontSize: 12, fontWeight: isActive ? 700 : 400,
                  transition: 'all 0.15s',
                  textAlign: 'left',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <span style={{ fontSize: 14 }}>{meta.flag}</span>
                <span>{meta.label}</span>
                <span style={{ fontSize: 9, color: '#666', marginLeft: 'auto' }}>{l.toUpperCase()}</span>
                {isActive && <span style={{ color: '#FF9933', fontSize: 10 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


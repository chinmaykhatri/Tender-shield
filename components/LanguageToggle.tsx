// ─────────────────────────────────────────────────
// FILE: components/LanguageToggle.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: EN/हिं toggle button for switching between English and Hindi UI
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { Language } from '@/lib/i18n/translations';

const LanguageContext = createContext<{ lang: Language; setLang: (l: Language) => void }>({ lang: 'en', setLang: () => {} });

export function useLanguage() { return useContext(LanguageContext); }

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('en');
  useEffect(() => {
    const saved = localStorage.getItem('ts_language') as Language | null;
    if (saved) setLang(saved);
  }, []);
  const handleSetLang = (l: Language) => { setLang(l); localStorage.setItem('ts_language', l); };
  return <LanguageContext.Provider value={{ lang, setLang: handleSetLang }}>{children}</LanguageContext.Provider>;
}

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <button onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
      className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] text-xs font-medium transition-all hover:bg-[var(--accent)]/20 border border-[var(--border-subtle)]"
      title={lang === 'en' ? 'Switch to Hindi' : 'Switch to English'}>
      {lang === 'en' ? 'EN | हिं' : 'हिं | EN'}
    </button>
  );
}

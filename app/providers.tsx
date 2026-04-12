'use client';

import { LanguageProvider } from '@/components/LanguageToggle';

/**
 * Client-side providers wrapper for the app.
 * Wraps the entire app in LanguageProvider for i18n support.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  );
}

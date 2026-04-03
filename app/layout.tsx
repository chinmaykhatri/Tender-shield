import './globals.css';
import type { Metadata } from 'next';
import ModeBanner from './components/ModeBanner';
import ThemeToggle from '@/components/ThemeToggle';
import PageTransition from '@/components/PageTransition';
import { assertEnvironment } from '@/lib/env';

// Validate env vars on server startup (dev: warns, prod: throws)
assertEnvironment();

export const metadata: Metadata = {
  title: 'TenderShield — AI-Secured Government Procurement',
  description: 'India\'s First AI-Secured, Blockchain-Based Government Procurement System. Powered by Hyperledger Fabric, Cryptographic Bid Commitments, and Real-time Fraud Detection.',
  keywords: ['TenderShield', 'blockchain', 'government procurement', 'fraud detection', 'Hyperledger Fabric', 'bid commitment', 'India', 'GFR 2017'],
  manifest: '/manifest.json',
  themeColor: '#003f88',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    viewportFit: 'cover',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@400;600;700;800&family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet"/>
        <meta name="theme-color" content="#080808" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-[var(--bg-primary)]" role="application" aria-label="TenderShield Platform">
        {/* Skip to Content — WCAG AAA Accessibility */}
        <a
          href="#main-content"
          className="skip-to-content"
        >
          Skip to main content
        </a>

        {/* India Tricolor Top Bar */}
        <div className="tricolor-bar fixed top-0 left-0 right-0 z-50" aria-hidden="true" />

        {/* Navigation Banner */}
        <nav aria-label="System status">
          <ModeBanner />
        </nav>

        {/* Main Content Area */}
        <main id="main-content" role="main" tabIndex={-1}>
          <PageTransition>{children}</PageTransition>
        </main>

        {/* Live Region for Dynamic Updates */}
        <div aria-live="polite" aria-atomic="true" className="sr-only" id="live-announcements" />

        {/* Theme Toggle */}
        <aside aria-label="Accessibility controls">
          <ThemeToggle />
        </aside>
      </body>
    </html>
  );
}

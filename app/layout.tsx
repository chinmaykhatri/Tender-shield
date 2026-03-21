import './globals.css';
import type { Metadata } from 'next';
import ModeBanner from './components/ModeBanner';

export const metadata: Metadata = {
  title: 'TenderShield — AI-Secured Government Procurement',
  description: 'India\'s First AI-Secured, Blockchain-Based Government Procurement System. Powered by Hyperledger Fabric, Zero-Knowledge Proofs, and Real-time Fraud Detection.',
  keywords: ['TenderShield', 'blockchain', 'government procurement', 'fraud detection', 'Hyperledger Fabric', 'ZKP', 'India', 'GFR 2017'],
  manifest: '/manifest.json',
  themeColor: '#003f88',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@400;600;700;800&family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet"/>
        <meta name="theme-color" content="#080808" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-[var(--bg-primary)]">
        {/* India Tricolor Top Bar */}
        <div className="tricolor-bar fixed top-0 left-0 right-0 z-50" />
        <ModeBanner />
        {children}
      </body>
    </html>
  );
}

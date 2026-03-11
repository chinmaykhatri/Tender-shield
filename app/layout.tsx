import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TenderShield — AI-Secured Government Procurement',
  description: 'India\'s First AI-Secured, Blockchain-Based Government Procurement System. Powered by Hyperledger Fabric, Zero-Knowledge Proofs, and Real-time Fraud Detection.',
  keywords: ['TenderShield', 'blockchain', 'government procurement', 'fraud detection', 'Hyperledger Fabric', 'ZKP', 'India', 'GFR 2017'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[var(--bg-primary)]">
        {/* India Tricolor Top Bar */}
        <div className="tricolor-bar fixed top-0 left-0 right-0 z-50" />
        {children}
      </body>
    </html>
  );
}

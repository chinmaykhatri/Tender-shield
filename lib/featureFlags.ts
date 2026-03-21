// ─────────────────────────────────────────────────
// FILE: lib/featureFlags.ts
// TYPE: SHARED LIB
// SECRET KEYS USED: none — reads env vars only
// WHAT THIS FILE DOES: Controls which features are active based on API key configuration
// ─────────────────────────────────────────────────

export interface FeatureStatus {
  id: string; name: string; enabled: boolean; requires: string;
  icon: string; description: string;
}

export function getFeatureFlags(): FeatureStatus[] {
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  return [
    { id: 'ai_scanner', name: 'AI Document Scanner', enabled: isDemo || !!process.env.ANTHROPIC_API_KEY, requires: 'ANTHROPIC_API_KEY', icon: '📄', description: 'Scan tender PDFs for fraud using Claude AI' },
    { id: 'whatsapp', name: 'WhatsApp Alerts', enabled: isDemo || (!!process.env.TWILIO_AUTH_TOKEN && !!process.env.TWILIO_ACCOUNT_SID), requires: 'TWILIO', icon: '📱', description: 'Instant WhatsApp notifications for fraud alerts' },
    { id: 'email', name: 'Email Notifications', enabled: isDemo || !!process.env.RESEND_API_KEY, requires: 'RESEND_API_KEY', icon: '📧', description: 'HTML email alerts with blockchain proof' },
    { id: 'heatmap', name: 'India Fraud Heatmap', enabled: true, requires: 'MAPBOX (optional)', icon: '🗺️', description: 'Interactive map of procurement fraud across India' },
    { id: 'voice', name: 'Voice Audit Assistant', enabled: isDemo || !!process.env.ANTHROPIC_API_KEY, requires: 'ANTHROPIC_API_KEY', icon: '🎤', description: 'Voice commands for audit queries' },
    { id: 'push', name: 'Push Notifications', enabled: isDemo || !!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID, requires: 'ONESIGNAL', icon: '🔔', description: 'Browser push alerts for fraud' },
    { id: 'price_predictor', name: 'AI Bid Price Predictor', enabled: isDemo || !!process.env.ANTHROPIC_API_KEY, requires: 'ANTHROPIC_API_KEY', icon: '🤖', description: 'AI predicts fair bid ranges' },
    { id: 'cag_reports', name: 'CAG Audit Reports', enabled: isDemo || !!process.env.ANTHROPIC_API_KEY, requires: 'ANTHROPIC_API_KEY', icon: '📊', description: 'Auto-generate audit investigation reports' },
    { id: 'nl_queries', name: 'Natural Language Queries', enabled: isDemo || !!process.env.ANTHROPIC_API_KEY, requires: 'ANTHROPIC_API_KEY', icon: '💬', description: 'Ask questions in English or Hindi' },
    { id: 'reputation', name: 'Bidder Reputation Score', enabled: true, requires: 'None', icon: '🏢', description: 'TRS — algorithmic bidder scoring' },
    { id: 'cartel_timeline', name: 'Cartel Evolution Timeline', enabled: true, requires: 'None', icon: '🕸️', description: 'Animated fraud network growth' },
    { id: 'predictive_fraud', name: 'Predictive Fraud Prevention', enabled: isDemo || !!process.env.ANTHROPIC_API_KEY, requires: 'ANTHROPIC_API_KEY', icon: '🔮', description: 'Predict fraud before bids submitted' },
    { id: 'ministry_scores', name: 'Ministry Scorecard', enabled: true, requires: 'None', icon: '🏛️', description: 'Ministry procurement health scoring' },
    { id: 'zkp_verify', name: 'ZKP Verification Portal', enabled: true, requires: 'None', icon: '🔐', description: 'Public bid verification' },
    { id: 'rti_portal', name: 'RTI Citizen Portal', enabled: true, requires: 'None', icon: '🇮🇳', description: 'Transparency portal' },
    { id: 'pwa', name: 'Mobile PWA', enabled: true, requires: 'None', icon: '📲', description: 'Installable mobile app' },
    { id: 'hindi', name: 'Hindi Support', enabled: true, requires: 'None', icon: '🗣️', description: 'Bilingual English + Hindi UI' },
    { id: 'impact_counter', name: 'Impact Counter', enabled: true, requires: 'None', icon: '💰', description: 'Live fraud savings counter' },
    { id: 'multi_sig', name: 'Multi-Signature Approval', enabled: true, requires: 'None', icon: '📝', description: '3-level tender approval chain' },
    { id: 'role_verification', name: 'Role-Based Registration', enabled: true, requires: 'None', icon: '✅', description: 'Validated role-based signup' },
  ];
}

export function isFeatureEnabled(featureId: string): boolean {
  const flags = getFeatureFlags();
  const feature = flags.find(f => f.id === featureId);
  return feature?.enabled ?? false;
}

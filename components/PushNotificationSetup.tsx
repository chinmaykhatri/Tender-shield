// ─────────────────────────────────────────────────
// FILE: components/PushNotificationSetup.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none — uses NEXT_PUBLIC_ONESIGNAL_APP_ID
// WHAT THIS FILE DOES: One-time prompt to enable browser push notifications
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect } from 'react';

export default function PushNotificationSetup() {
  const [show, setShow] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('ts_push_dismissed');
    const alreadyEnabled = localStorage.getItem('ts_push_enabled');
    if (!dismissed && !alreadyEnabled && 'Notification' in window) {
      setTimeout(() => setShow(true), 5000); // show after 5s
    }
    if (alreadyEnabled) setEnabled(true);
  }, []);

  const handleEnable = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        localStorage.setItem('ts_push_enabled', 'true');
        setEnabled(true);
        setShow(false);
        new Notification('🛡️ TenderShield', {
          body: 'Fraud alerts enabled! You will be notified of critical procurement issues.',
          icon: '/icons/icon-192.png',
        });
      }
    } catch {
      setShow(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('ts_push_dismissed', 'true');
    setShow(false);
  };

  if (!show || enabled) return null;

  return (
    <div className="fixed bottom-24 right-6 z-30 w-80 card-glass rounded-2xl p-5 animate-fade-in shadow-2xl">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔔</span>
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Enable Fraud Alerts</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-3">Get instant browser notifications when AI detects procurement fraud.</p>
          <div className="flex gap-2">
            <button onClick={handleEnable} className="btn-primary text-xs py-1.5 px-4">Enable Notifications</button>
            <button onClick={handleDismiss} className="text-xs text-[var(--text-secondary)] hover:text-white py-1.5 px-3">Not Now</button>
          </div>
        </div>
      </div>
    </div>
  );
}

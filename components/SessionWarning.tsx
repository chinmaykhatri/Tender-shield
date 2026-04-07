// FILE: components/SessionWarning.tsx
// SECURITY LAYER: UI for session timeout warning
// BREAKS IF REMOVED: NO — just no warning shown before logout

'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function SessionWarning() {
  const [visible, setVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300); // 5 minutes = 300 seconds
  const router = useRouter();
  const { logout } = useAuthStore();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Stable refs — prevent re-render loops from router/logout identity changes
  const routerRef = useRef(router);
  const logoutRef = useRef(logout);
  useEffect(() => { routerRef.current = router; }, [router]);
  useEffect(() => { logoutRef.current = logout; }, [logout]);

  const handleStayLoggedIn = useCallback(() => {
    setVisible(false);
    setSecondsLeft(300);
    clearInterval(intervalRef.current);
    // Trigger a mouse event to reset the session timer
    window.dispatchEvent(new MouseEvent('mousemove'));
  }, []);

  const handleLogoutNow = useCallback(() => {
    setVisible(false);
    clearInterval(intervalRef.current);
    logoutRef.current();
    routerRef.current.push('/');
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSecondsLeft(detail.minutesLeft * 60);
      setVisible(true);

      // Start countdown
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            handleLogoutNow();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    window.addEventListener('session-warning', handler);
    return () => {
      window.removeEventListener('session-warning', handler);
      clearInterval(intervalRef.current);
    };
  }, [handleLogoutNow]);

  if (!visible) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        background: 'rgba(8,8,24,0.97)',
        border: '1px solid rgba(255,153,51,0.4)',
        borderRadius: '16px',
        padding: '20px 24px',
        maxWidth: '380px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(255,153,51,0.1)',
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span style={{ fontSize: '20px' }}>⏱️</span>
        <span style={{ fontWeight: 700, color: '#fbbf24', fontSize: '15px' }}>
          Session Expiring
        </span>
      </div>
      <p style={{ color: '#a0a0c0', fontSize: '13px', marginBottom: '4px', lineHeight: 1.5 }}>
        You will be logged out in{' '}
        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#f87171', fontWeight: 700, fontSize: '16px' }}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </p>
      <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '14px' }}>
        Move your mouse or press any key to stay logged in
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleStayLoggedIn}
          style={{
            flex: 1,
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Stay Logged In
        </button>
        <button
          onClick={handleLogoutNow}
          style={{
            flex: 1,
            padding: '8px 16px',
            background: 'rgba(239,68,68,0.15)',
            color: '#f87171',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Logout Now
        </button>
      </div>
    </div>
  );
}

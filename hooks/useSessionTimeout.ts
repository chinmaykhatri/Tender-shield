// FILE: hooks/useSessionTimeout.ts
// SECURITY LAYER: Auto-logout after inactivity
// BREAKS IF REMOVED: NO — just less secure

'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

const TIMEOUT_MS = 30 * 60 * 1000;       // 30 minutes inactivity
const WARNING_MS = 25 * 60 * 1000;       // show warning at 25 min
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

export function useSessionTimeout() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const warningRef = useRef<ReturnType<typeof setTimeout>>();

  const handleLogout = useCallback((reason: string) => {
    // Session ended — silent logout
    logout();
    router.push('/?reason=' + encodeURIComponent(reason));
  }, [logout, router]);

  const resetTimer = useCallback(() => {
    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);

    // Warning at 25 minutes
    warningRef.current = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('session-warning', {
        detail: { minutesLeft: 5 },
      }));
    }, WARNING_MS);

    // Logout at 30 minutes
    timeoutRef.current = setTimeout(() => {
      handleLogout('Session expired due to inactivity');
    }, TIMEOUT_MS);
  }, [handleLogout]);

  useEffect(() => {
    resetTimer();
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });
    return () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(warningRef.current);
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer]);
}

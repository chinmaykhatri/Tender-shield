'use client';

/**
 * TenderShield — Accessibility Helpers
 * Skip navigation, focus management, and ARIA utilities.
 */

/**
 * Skip to main content link — appears on Tab for keyboard users.
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="skip-to-content"
      style={{
        position: 'absolute',
        top: '-100%',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 24px',
        background: 'var(--accent)',
        color: 'white',
        borderRadius: '0 0 12px 12px',
        zIndex: 9999,
        fontSize: '14px',
        fontWeight: 600,
        transition: 'top 0.2s ease',
      }}
      onFocus={(e) => {
        (e.target as HTMLElement).style.top = '0';
      }}
      onBlur={(e) => {
        (e.target as HTMLElement).style.top = '-100%';
      }}
    >
      Skip to main content
    </a>
  );
}

/**
 * Screen reader only text — visually hidden but accessible.
 */
export function SrOnly({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: 0,
      }}
    >
      {children}
    </span>
  );
}

/**
 * Live region for dynamic announcements to screen readers.
 */
export function LiveRegion({
  message,
  assertive = false,
}: {
  message: string;
  assertive?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: 0,
      }}
    >
      {message}
    </div>
  );
}

/**
 * Focus trap hook — traps focus within a modal/dialog.
 */
export function useFocusTrap(ref: React.RefObject<HTMLElement | null>) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !ref.current) return;

    const focusable = ref.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length === 0) return;

    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return {
    onKeyDown: handleKeyDown,
    role: 'dialog' as const,
    'aria-modal': true as const,
  };
}

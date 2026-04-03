/**
 * TenderShield — Accessibility Utilities (WCAG 2.1 AA)
 * ════════════════════════════════════════════════════════
 *
 * Shared keyboard handler and accessibility utilities for use
 * across all interactive components.
 */

import React from 'react';

/** Enable keyboard activation for custom interactive elements */
export function onKeyboardActivate(handler: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };
}

/**
 * Announce a message to screen readers via the live region.
 * Requires a <div aria-live="polite" id="live-announcements"> in layout.
 */
export function announceToScreenReader(message: string): void {
  if (typeof document === 'undefined') return;
  const liveRegion = document.getElementById('live-announcements');
  if (liveRegion) {
    liveRegion.textContent = message;
    // Clear after announcement is processed
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  }
}

/**
 * Generate a descriptive aria-label for a tender card.
 */
export function tenderAriaLabel(tender: {
  title: string;
  ministry?: string;
  status?: string;
  risk_level?: string;
  estimated_value_display?: string;
}): string {
  const parts = [tender.title];
  if (tender.ministry) parts.push(`Ministry: ${tender.ministry}`);
  if (tender.status) parts.push(`Status: ${tender.status}`);
  if (tender.risk_level) parts.push(`Risk: ${tender.risk_level}`);
  if (tender.estimated_value_display) parts.push(`Value: ${tender.estimated_value_display}`);
  return parts.join('. ');
}

'use client';

import { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/**
 * PageTransition — Transparent wrapper for children.
 * 
 * IMPORTANT: Do NOT add `transform`, `filter`, `perspective`, or `will-change`
 * to this wrapper. These CSS properties create a new containing block that
 * breaks `position: fixed` on descendants (sidebar becomes position: absolute).
 * See: https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block
 */
export default function PageTransition({ children }: Props) {
  return <>{children}</>;
}

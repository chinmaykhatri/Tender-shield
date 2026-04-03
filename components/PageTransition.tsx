'use client';

import { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/**
 * PageTransition — Pure CSS page transition wrapper.
 * Uses CSS animations only — no React state that could interfere
 * with child component hook ordering during navigation.
 */
export default function PageTransition({ children }: Props) {
  return (
    <div className="page-transition page-transition-enter">
      {children}
    </div>
  );
}

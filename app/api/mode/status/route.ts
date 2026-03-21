// FILE: app/api/mode/status/route.ts
// PURPOSE: Returns which mode each service is running in
// WORKS IN DEMO: YES — shows all services as DEMO
// WORKS IN REAL: YES — shows real services as REAL
// SWITCH: auto-detected from env variables

import { NextResponse } from 'next/server';
import { getAppMode } from '@/lib/mode/dualMode';

export const dynamic = 'force-dynamic';

export async function GET() {
  const mode = getAppMode();

  return NextResponse.json({
    overall: mode.overall,
    services: mode.services,
    missing_count: mode.missingKeys.length,
    all_real: mode.overall === 'REAL',
    competition_ready: true,
  });
}

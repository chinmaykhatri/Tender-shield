/**
 * TenderShield — Environment Variable Validation
 * Validates all required env vars at build/startup time.
 * Missing vars produce clear, actionable error messages.
 *
 * Usage: imported in next.config.js or layout.tsx
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  example: string;
}

const ENV_SCHEMA: EnvVar[] = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: true, description: 'Supabase project URL', example: 'https://xxxx.supabase.co' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, description: 'Supabase anonymous API key', example: 'eyJhbGciOiJIU...' },
  { name: 'JWT_SECRET', required: true, description: 'JWT signing secret (min 32 chars)', example: 'yFbeEXvLRsK91m8lgJw...' },
  { name: 'NEXT_PUBLIC_DEMO_MODE', required: false, description: 'Enable demo mode with mock data', example: 'true' },
  { name: 'ANTHROPIC_API_KEY', required: false, description: 'Claude API key for AI analysis', example: 'sk-ant-...' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: false, description: 'Supabase admin key for server ops', example: 'eyJhbGciOiJIU...' },
  { name: 'BACKEND_URL', required: false, description: 'Python FastAPI backend URL', example: 'http://localhost:8000' },
];

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
  configured: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  const configured: string[] = [];

  for (const envVar of ENV_SCHEMA) {
    const value = process.env[envVar.name];

    if (!value || value.trim() === '') {
      if (envVar.required) {
        missing.push(`❌ ${envVar.name} — ${envVar.description} (example: ${envVar.example})`);
      } else {
        warnings.push(`⚠️  ${envVar.name} — ${envVar.description} (optional, feature disabled)`);
      }
    } else {
      configured.push(`✅ ${envVar.name}`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
    configured,
  };
}

/**
 * Call this at app startup. If required vars are missing:
 * - In development: logs a clear table and continues
 * - In production: throws an error to prevent silent failures
 */
export function assertEnvironment(): void {
  const result = validateEnvironment();

  if (!result.valid) {
    const message = [
      '',
      '╔══════════════════════════════════════════════════════╗',
      '║      TenderShield — Missing Environment Variables    ║',
      '╚══════════════════════════════════════════════════════╝',
      '',
      ...result.missing,
      '',
      'Create a .env.local file with these variables.',
      'See README.md for full configuration guide.',
      '',
    ].join('\n');

    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    } else {
      // eslint-disable-next-line no-console
      console.warn(message);
    }
  }
}

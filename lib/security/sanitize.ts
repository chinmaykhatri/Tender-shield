// FILE: lib/security/sanitize.ts
// SECURITY LAYER: Blocks SQL injection, XSS, prompt injection
// BREAKS IF REMOVED: YES — security layer removed

// ─────────────────────────────────────────────
// TEXT SANITIZATION
// ─────────────────────────────────────────────

export function sanitizeText(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';

  return input
    .slice(0, maxLength)
    // Remove HTML tags entirely
    .replace(/<[^>]*>/g, '')
    // Remove JavaScript protocol
    .replace(/javascript:/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=/gi, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────
// PROMPT INJECTION DETECTION
// Specifically protects Claude API calls
// ─────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /forget\s+(everything|all|previous)/i,
  /you\s+are\s+now\s+(a|an)/i,
  /act\s+as\s+(a|an|if)/i,
  /pretend\s+(you|to\s+be)/i,
  /jailbreak/i,
  /bypass\s+(safety|filter|restriction|detection)/i,
  /override\s+(system|instructions|prompt)/i,
  /disregard\s+(your|all|previous)/i,
  /new\s+instructions:/i,
  /system\s*:/i,
  /\[INST\]/i,
  /###\s*instruction/i,
  /<\s*system\s*>/i,
];

export function detectPromptInjection(text: string): {
  detected: boolean;
  pattern?: string;
} {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { detected: true, pattern: pattern.source };
    }
  }
  return { detected: false };
}

// ─────────────────────────────────────────────
// FINANCIAL VALUE VALIDATION
// Prevents ridiculous bid amounts
// ─────────────────────────────────────────────

const MAX_TENDER_VALUE_CRORE = 100_000; // ₹1 lakh crore max
const MAX_PAISE = MAX_TENDER_VALUE_CRORE * 1e7; // convert to paise

export function validateFinancialValue(
  value: unknown,
  fieldName: string
): { valid: boolean; sanitized?: number; error?: string } {
  const num = Number(value);

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }
  if (!isFinite(num)) {
    return { valid: false, error: `${fieldName} must be a finite number` };
  }
  if (num < 0) {
    return { valid: false, error: `${fieldName} cannot be negative` };
  }
  if (num > MAX_PAISE) {
    return { valid: false, error: `${fieldName} exceeds maximum allowed value (₹${MAX_TENDER_VALUE_CRORE} Crore)` };
  }

  // Round to nearest paisa
  return { valid: true, sanitized: Math.round(num) };
}

// ─────────────────────────────────────────────
// INDIA-SPECIFIC VALIDATORS
// ─────────────────────────────────────────────

export function validateGSTIN(gstin: string): boolean {
  // Format: 22AAAAA0000A1Z5 — exactly 15 characters
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin?.trim().toUpperCase() ?? '');
}

export function validatePAN(pan: string): boolean {
  // Format: ABCDE1234F — exactly 10 characters
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan?.trim().toUpperCase() ?? '');
}

export function validateGovEmail(email: string): boolean {
  // Must end in .gov.in or .nic.in
  const govEmailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.(gov\.in|nic\.in)$/;
  return govEmailRegex.test(email?.trim().toLowerCase() ?? '');
}

export function validateTenderID(id: string): boolean {
  // Format: TDR-XXXX-2025-000001
  const tenderRegex = /^TDR-[A-Z]{2,10}-\d{4}-\d{6}$/;
  return tenderRegex.test(id?.trim() ?? '');
}

// ─────────────────────────────────────────────
// COMPLETE REQUEST SANITIZER
// Use this at the top of tender creation API route
// ─────────────────────────────────────────────

export interface SanitizationResult<T> {
  valid: boolean;
  data?: T;
  errors: string[];
  injectionDetected: boolean;
}

export function sanitizeTenderInput(raw: unknown): SanitizationResult<{
  title: string;
  ministry: string;
  ministry_code: string;
  description: string;
  estimated_value_paise: number;
  category: string;
}> {
  const errors: string[] = [];
  let injectionDetected = false;

  if (typeof raw !== 'object' || raw === null) {
    return { valid: false, errors: ['Invalid request body'], injectionDetected: false };
  }

  const body = raw as Record<string, unknown>;

  const title = sanitizeText(body.title, 200);
  const ministry = sanitizeText(body.ministry, 100);
  const ministry_code = sanitizeText(body.ministry_code, 20);
  const description = sanitizeText(body.description, 2000);

  // Check for prompt injection in text fields
  const textFields = [title, ministry, description, ministry_code];
  for (const field of textFields) {
    const check = detectPromptInjection(field);
    if (check.detected) {
      injectionDetected = true;
      errors.push('Invalid content detected in request');
      break;
    }
  }

  if (!title || title.length < 5)
    errors.push('Title must be at least 5 characters');

  if (!ministry_code || ministry_code.length < 2)
    errors.push('Ministry code is required');

  const valueResult = validateFinancialValue(body.estimated_value_paise, 'Estimated value');
  if (!valueResult.valid) errors.push(valueResult.error!);

  const allowedCategories = ['WORKS', 'GOODS', 'SERVICES', 'CONSULTANCY'];
  const category = String(body.category ?? '');
  if (!allowedCategories.includes(category))
    errors.push('Category must be WORKS, GOODS, SERVICES, or CONSULTANCY');

  if (errors.length > 0 || injectionDetected) {
    return { valid: false, errors, injectionDetected };
  }

  return {
    valid: true,
    injectionDetected: false,
    errors: [],
    data: {
      title,
      ministry,
      ministry_code,
      description,
      estimated_value_paise: valueResult.sanitized!,
      category,
    },
  };
}

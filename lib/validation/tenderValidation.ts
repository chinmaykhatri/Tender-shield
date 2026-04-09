/**
 * TenderShield — Tender Form Validation
 * 
 * Step-by-step validation for the Create Tender wizard.
 * Enforces GFR (General Financial Rules) 2017 compliance:
 *   - Title: ≥10 chars, ≤200 chars
 *   - Ministry: required
 *   - Description: ≥50 chars
 *   - Value: >0, ≤₹1,00,000 Crore
 *   - Deadline: ≥21 days from today (GFR Rule 144)
 *   - GFR Reference: required
 * 
 * Used by:
 *   - Frontend: app/dashboard/tenders/create/page.tsx (step navigation)
 *   - Server:   app/api/tender-flow/route.ts (POST validation)
 */

export interface TenderFormData {
  title: string;
  ministry: string;
  ministry_code: string;
  category: string;
  estimated_value_crore: number | string;
  description: string;
  deadline: string;
  gfr_reference: string;
  department?: string;
  gem_category?: string;
  gem_id?: string;
  procurement_method?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Step 1 — Basic Details
 */
export function validateStep1(data: Partial<TenderFormData>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.ministry_code?.trim() && !data.ministry?.trim()) {
    errors.ministry_code = 'Ministry is required';
  }

  if (!data.title?.trim()) {
    errors.title = 'Tender title is required';
  } else if (data.title.trim().length < 10) {
    errors.title = 'Title must be at least 10 characters';
  } else if (data.title.trim().length > 200) {
    errors.title = 'Title must be under 200 characters';
  }

  if (!data.description?.trim()) {
    errors.description = 'Description is required';
  } else if (data.description.trim().length < 50) {
    errors.description = `Description must be at least 50 characters (currently ${data.description.trim().length})`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Step 2 — Financial Details
 */
export function validateStep2(data: Partial<TenderFormData>): ValidationResult {
  const errors: Record<string, string> = {};

  const value = typeof data.estimated_value_crore === 'string'
    ? parseFloat(data.estimated_value_crore)
    : data.estimated_value_crore;

  if (!value || value <= 0) {
    errors.estimated_value_crore = 'Estimated value must be greater than ₹0';
  } else if (value > 100_000) {
    errors.estimated_value_crore = 'Value exceeds maximum allowed (₹1,00,000 Crore)';
  }

  if (!data.deadline) {
    errors.deadline = 'Deadline is required';
  } else {
    const deadlineDate = new Date(data.deadline);
    const minDeadline = new Date();
    minDeadline.setDate(minDeadline.getDate() + 21); // GFR Rule 144: 21 days minimum
    if (deadlineDate < minDeadline) {
      errors.deadline = 'Deadline must be at least 21 days from today (GFR Rule 144)';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Step 3 — Compliance (lightweight — most fields have defaults)
 */
export function validateStep3(data: Partial<TenderFormData>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.gfr_reference?.trim()) {
    errors.gfr_reference = 'GFR Reference is required';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Full validation — used server-side before creating the tender.
 * Combines Step 1 + Step 2 + Step 3.
 */
export function validateComplete(data: Partial<TenderFormData>): ValidationResult {
  const step1 = validateStep1(data);
  const step2 = validateStep2(data);
  const step3 = validateStep3(data);
  const allErrors = { ...step1.errors, ...step2.errors, ...step3.errors };
  return {
    valid: Object.keys(allErrors).length === 0,
    errors: allErrors,
  };
}

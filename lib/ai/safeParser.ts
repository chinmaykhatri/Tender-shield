// FILE: lib/ai/safeParser.ts
// SECURITY: CLIENT SAFE — pure parsing function, no secrets
// API KEYS USED: none
// PURPOSE: Safely parse Claude JSON responses — handles markdown fences, leading text, type coercion

import { FraudAnalysis, FALLBACK_ANALYSIS } from '@/lib/types/fraud';

/**
 * safeParseClaudeJSON
 *
 * Claude sometimes wraps JSON in markdown code fences, adds "Here is the analysis:" etc.
 * This function strips all that and returns validated, type-safe FraudAnalysis.
 * Falls back to FALLBACK_ANALYSIS if parsing fails — never throws.
 */
export function safeParseClaudeJSON(rawText: string): FraudAnalysis {
  // Step 1: Strip common Claude preamble patterns
  let cleaned = rawText
    .replace(/^```json\s*/gi, '')          // ```json opening fence
    .replace(/^```\s*/gi, '')              // ``` opening fence without language
    .replace(/```\s*$/gi, '')              // ``` closing fence
    .replace(/^Here is[^:]*:\s*/gi, '')    // "Here is the analysis:"
    .replace(/^Analysis:\s*/gi, '')        // "Analysis:"
    .replace(/^Result:\s*/gi, '')          // "Result:"
    .replace(/^JSON:\s*/gi, '')            // "JSON:"
    .trim();

  // Step 2: Extract JSON object boundaries
  const startIndex = cleaned.indexOf('{');
  const endIndex = cleaned.lastIndexOf('}');

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    // No JSON object found — silent
    // Raw response preview available in debugger
    return { ...FALLBACK_ANALYSIS };
  }

  const jsonString = cleaned.slice(startIndex, endIndex + 1);

  // Step 3: Parse
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonString);
  } catch (parseError) {
    // JSON parse failed — silent
    // Attempted parse string available in debugger
    return { ...FALLBACK_ANALYSIS };
  }

  // Step 4: Validate and coerce each field with safe defaults
  const validRiskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
  const validActions = ['MONITOR', 'FLAG', 'FREEZE', 'ESCALATE_CAG', 'REFER_CBI'] as const;
  const validFlagTypes = ['BID_RIGGING', 'SHELL_COMPANY', 'TIMING_COLLUSION', 'FRONT_RUNNING', 'CARTEL', 'PRICE_DEVIATION', 'REPEATED_BIDDER'] as const;

  const riskLevel = validRiskLevels.includes(parsed.risk_level as typeof validRiskLevels[number])
    ? parsed.risk_level as FraudAnalysis['risk_level']
    : 'LOW';

  const action = validActions.includes(parsed.recommended_action as typeof validActions[number])
    ? parsed.recommended_action as FraudAnalysis['recommended_action']
    : 'MONITOR';

  const rawFlags = Array.isArray(parsed.flags) ? parsed.flags : [];
  const flags: FraudAnalysis['flags'] = rawFlags
    .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
    .map(f => ({
      type: validFlagTypes.includes(f.type as typeof validFlagTypes[number])
        ? f.type as FraudAnalysis['flags'][0]['type']
        : 'BID_RIGGING',
      severity: validRiskLevels.includes(f.severity as typeof validRiskLevels[number])
        ? f.severity as FraudAnalysis['risk_level']
        : 'MEDIUM',
      confidence: typeof f.confidence === 'number' ? Math.min(1, Math.max(0, f.confidence)) : 0.5,
      evidence: typeof f.evidence === 'string' ? f.evidence : '',
      plain_english: typeof f.plain_english === 'string' ? f.plain_english : '',
    }));

  return {
    risk_score: typeof parsed.risk_score === 'number'
      ? Math.min(100, Math.max(0, Math.round(parsed.risk_score)))
      : 0,
    risk_level: riskLevel,
    confidence: typeof parsed.confidence === 'number'
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0,
    detection_time_seconds: typeof parsed.detection_time_seconds === 'number'
      ? parsed.detection_time_seconds
      : 0,
    auto_freeze: typeof parsed.auto_freeze === 'boolean' ? parsed.auto_freeze : false,
    recommended_action: action,
    summary: typeof parsed.summary === 'string'
      ? parsed.summary.slice(0, 100)
      : 'Analysis complete',
    flags,
    investigation_notes: typeof parsed.investigation_notes === 'string'
      ? parsed.investigation_notes
      : '',
  };
}

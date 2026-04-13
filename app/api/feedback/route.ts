import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * ============================================================================
 * TenderShield — Feedback API (Real Local Persistence)
 * ============================================================================
 * POST: Stores officer labels as append-only JSONL (local + backend fallback)
 * GET:  Returns real label counts from the JSONL file
 * 
 * The JSONL file at ai_engine/data/feedback/officer_labels.jsonl is the
 * primary storage. This is not a mock. Labels written here persist across
 * restarts and can be used for model retraining.
 * ============================================================================
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || '';
const VALID_LABELS = new Set(['CLEAN', 'SUSPICIOUS', 'FRAUD_CONFIRMED', 'FALSE_POSITIVE']);

// Resolve JSONL path relative to project root
function getFeedbackFilePath(): string {
  return path.join(process.cwd(), 'ai_engine', 'data', 'feedback', 'officer_labels.jsonl');
}

async function readFeedbackRecords(): Promise<Record<string, unknown>[]> {
  try {
    const filePath = getFeedbackFilePath();
    const content = await fs.readFile(filePath, 'utf-8');
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

async function appendFeedbackRecord(record: Record<string, unknown>): Promise<number> {
  const filePath = getFeedbackFilePath();
  // Ensure directory exists
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  // Append with newline
  await fs.appendFile(filePath, JSON.stringify(record) + '\n', 'utf-8');
  // Return total count
  const records = await readFeedbackRecords();
  return records.length;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate label
    if (!body.label || !VALID_LABELS.has(body.label)) {
      return NextResponse.json(
        { error: `Invalid label '${body.label}'. Must be one of: ${[...VALID_LABELS].join(', ')}` },
        { status: 400 }
      );
    }
    if (!body.tender_id) {
      return NextResponse.json({ error: 'tender_id is required' }, { status: 400 });
    }

    // Try backend first (Python FastAPI)
    if (BACKEND_URL) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/feedback/label`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          // Also store locally for redundancy
          const record = {
            tender_id: body.tender_id,
            label: body.label,
            is_fraud: ['SUSPICIOUS', 'FRAUD_CONFIRMED'].includes(body.label),
            officer_did: body.officer_did || 'unknown',
            original_risk_score: body.risk_score || 0,
            detector_results_summary: body.detector_results || {},
            notes: body.notes || '',
            timestamp: new Date().toISOString(),
            schema_version: 'v1',
          };
          await appendFeedbackRecord(record);
          return NextResponse.json(await res.json());
        }
      } catch {
        // Fall through to local-only storage
      }
    }

    // Local JSONL storage (primary in demo/standalone mode)
    const record = {
      tender_id: body.tender_id,
      label: body.label,
      is_fraud: ['SUSPICIOUS', 'FRAUD_CONFIRMED'].includes(body.label),
      officer_did: body.officer_did || 'demo-officer',
      original_risk_score: body.risk_score || 0,
      detector_results_summary: body.detector_results || {},
      notes: body.notes || '',
      timestamp: new Date().toISOString(),
      schema_version: 'v1',
    };

    const totalRecords = await appendFeedbackRecord(record);

    return NextResponse.json({
      success: true,
      tender_id: body.tender_id,
      label: body.label,
      total_feedback_records: totalRecords,
      retraining_ready: totalRecords >= 50,
      _source: 'LOCAL_JSONL',
      _file: 'ai_engine/data/feedback/officer_labels.jsonl',
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  // Try backend first
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/feedback/stats`, {
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        return NextResponse.json(await res.json());
      }
    } catch {}
  }

  // Read real JSONL stats
  const records = await readFeedbackRecords();
  const labels: Record<string, number> = { CLEAN: 0, SUSPICIOUS: 0, FRAUD_CONFIRMED: 0, FALSE_POSITIVE: 0 };
  for (const r of records) {
    const label = r.label as string;
    if (label in labels) labels[label]++;
  }

  const total = records.length;
  const falsePositiveCount = labels.FALSE_POSITIVE;
  const falsePositiveRate = total > 0 ? Math.round((falsePositiveCount / total) * 1000) / 10 : 0;

  return NextResponse.json({
    success: true,
    _source: 'LOCAL_JSONL',
    _file: 'ai_engine/data/feedback/officer_labels.jsonl',
    stats: {
      total,
      labels,
      retraining_ready: total >= 50,
      false_positive_count: falsePositiveCount,
      false_positive_rate: falsePositiveRate,
      accuracy_improvement_signals: falsePositiveCount,
      data_moat_score: Math.min(100, Math.round((total / 50) * 100)),
      data_moat_status: total >= 50 ? 'READY' : `${total}/50 labels (${Math.round((total/50)*100)}% to retraining)`,
    },
  });
}

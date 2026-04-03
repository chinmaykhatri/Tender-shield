/**
 * API: /api/ml-predict
 * POST — Run a live prediction through BOTH:
 *   1. Client-side TypeScript Random Forest (14 features)
 *   2. Backend Python Gradient Boosting + Isolation Forest (15 features)
 *
 * GET  — Return model metrics (both TS RF and Python GBM+IForest)
 *
 * This dual-model approach provides:
 *   - Instant TS-side predictions for UI responsiveness
 *   - Backend Python predictions for authoritative scoring
 *   - Model agreement indicator when both models are available
 */
import { NextRequest, NextResponse } from 'next/server';
import { extractFeatures } from '@/lib/ml/dataset';
import * as fs from 'fs';
import * as path from 'path';

// Load TS Random Forest model + metrics at startup
let modelData: any = null;
let metricsData: any = null;

function loadModel() {
  if (modelData && metricsData) return;
  try {
    const modelPath = path.join(process.cwd(), 'public', 'model', 'model.json');
    const metricsPath = path.join(process.cwd(), 'public', 'model', 'metrics.json');
    modelData = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
    metricsData = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
  } catch (e) {
    console.error('Failed to load TS ML model:', e);
  }
}

// Traverse compressed tree
function predictTree(node: any, x: number[]): { prediction: number; probability: number } {
  if (node.p !== undefined) {
    return { prediction: node.p, probability: node.pr };
  }
  if (x[node.f] <= node.t) {
    return predictTree(node.l, x);
  }
  return predictTree(node.r, x);
}

function predictForest(x: number[]): { prediction: number; probability: number; votes: { fraud: number; clean: number } } {
  let fraudVotes = 0;
  let totalProb = 0;

  for (const tree of modelData.trees) {
    const { prediction, probability } = predictTree(tree, x);
    if (prediction === 1) fraudVotes++;
    totalProb += probability;
  }

  const avgProb = totalProb / modelData.numTrees;
  return {
    prediction: avgProb >= 0.5 ? 1 : 0,
    probability: Math.round(avgProb * 10000) / 10000,
    votes: { fraud: fraudVotes, clean: modelData.numTrees - fraudVotes },
  };
}

// Call Python backend's AI engine for GBM + IForest predictions
async function getPythonPrediction(body: any): Promise<any | null> {
  try {
    const backendUrl = process.env.AI_ENGINE_URL || 'http://localhost:8001';
    const response = await fetch(`${backendUrl}/analyze/tender`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tender: {
          tender_id: 'LIVE-' + Date.now(),
          ministry_code: body.ministry || 'MoIT',
          estimated_value_paise: Math.round((body.estimated_value_crore || 100) * 1_00_00_000),
          category: body.category || 'GOODS',
        },
        bids: (body.bid_amounts || []).map((amount: number, i: number) => ({
          bidder_did: `did:bidder:live_${i}`,
          revealed_amount_paise: Math.round(amount * 1_00_00_000),
          submitted_minutes_before_deadline: body.bid_times_hours?.[i]
            ? body.bid_times_hours[i] * 60
            : 500 - i * 120,
          gstin: body.bidder_pans?.[i]
            ? `${body.bidder_pans[i].substring(0, 2) || '27'}AABCX${i}234F1Z${i}`
            : `27AABCX${i}234F1Z${i}`,
          incorporation_months: 60 + i * 24,
          employee_count: 50 + i * 30,
          annual_turnover_paise: Math.round(amount * 1_00_00_000 * 2),
        })),
      }),
      signal: AbortSignal.timeout(5000),  // 5s timeout
    });

    if (response.ok) {
      const data = await response.json();
      return data.analysis || null;
    }
  } catch (e) {
    // Backend not available — that's fine, TS model handles it
    console.log('[ML-Predict] Python backend not available, using TS-only mode');
  }
  return null;
}

// GET — Return metrics from both models
export async function GET() {
  loadModel();

  const result: any = {
    success: true,
    models: [],
  };

  // TS Random Forest metrics
  if (metricsData) {
    result.models.push({
      name: 'Random Forest (TypeScript)',
      location: 'frontend',
      ...metricsData,
    });
  }

  // Try to get Python backend model info
  try {
    const backendUrl = process.env.AI_ENGINE_URL || 'http://localhost:8001';
    const res = await fetch(`${backendUrl}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const health = await res.json();
      result.models.push({
        name: 'Gradient Boosting + Isolation Forest (Python)',
        location: 'backend',
        scoring_mode: health.scoring_mode,
        ml_models_loaded: health.ml_models_loaded,
        weights: health.weights,
        ml_pipeline: health.ml_pipeline,
      });
    }
  } catch {
    // Backend not available
  }

  if (result.models.length === 0) {
    return NextResponse.json(
      { error: 'No models available. Run: npx tsx scripts/train-model.ts AND/OR python -m ai_engine.ml.train' },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}

// POST — Live prediction (dual-model)
export async function POST(req: NextRequest) {
  loadModel();

  try {
    const body = await req.json();
    const {
      estimated_value_crore = 100,
      bid_amounts = [95, 97, 102],
      bid_times_hours = [12, 24],
      bidder_pans = [],
      historical_winner_count = 1,
      is_repeat_winner = false,
    } = body;

    const winning_amount = Math.min(...bid_amounts);

    // ── Model 1: TypeScript Random Forest ──
    let tsResult: any = null;
    if (modelData) {
      const { features, names } = extractFeatures({
        tender_id: 'LIVE',
        ministry: body.ministry || 'MoIT',
        category: body.category || 'GOODS',
        estimated_value_crore,
        num_bidders: bid_amounts.length,
        bid_amounts,
        bid_times_hours,
        bidder_pans: bidder_pans.length > 0 ? bidder_pans : bid_amounts.map(() => 'UNIQ' + Math.random().toString(36).slice(2, 7)),
        winning_amount,
        historical_winner_count,
        is_repeat_winner,
      });

      const rfPred = predictForest(features);
      tsResult = {
        model: 'Random Forest (TypeScript)',
        prediction: rfPred.prediction === 1 ? 'FRAUD' : 'CLEAN',
        probability: rfPred.probability,
        confidence: Math.round(Math.abs(rfPred.probability - 0.5) * 200),
        votes: rfPred.votes,
        features: names.map((name: string, i: number) => ({
          name,
          value: Math.round(features[i] * 10000) / 10000,
        })),
        trees: modelData.numTrees,
        accuracy: metricsData?.accuracy,
        f1Score: metricsData?.f1Score,
      };
    }

    // ── Model 2: Python GBM + Isolation Forest ──
    const pythonResult = await getPythonPrediction(body);

    // ── Combine Results ──
    const models_used = [];
    let finalPrediction = 'UNKNOWN';
    let finalProbability = 0;
    let modelAgreement: boolean | null = null;

    if (tsResult) {
      models_used.push('RandomForest_TS');
      finalPrediction = tsResult.prediction;
      finalProbability = tsResult.probability;
    }

    if (pythonResult) {
      models_used.push('GBM+IForest_Python');
      const pythonScore = pythonResult.composite_risk_score || 0;
      const pythonPrediction = pythonScore >= 50 ? 'FRAUD' : 'CLEAN';

      if (tsResult) {
        // Both available — check agreement
        modelAgreement = tsResult.prediction === pythonPrediction;
        // Weighted average: 40% TS RF + 60% Python GBM
        finalProbability = 0.4 * tsResult.probability + 0.6 * (pythonScore / 100);
        finalPrediction = finalProbability >= 0.5 ? 'FRAUD' : 'CLEAN';
      } else {
        finalPrediction = pythonPrediction;
        finalProbability = pythonScore / 100;
      }
    }

    if (!tsResult && !pythonResult) {
      return NextResponse.json(
        { error: 'No ML models available. Train models first.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      // Unified prediction
      prediction: finalPrediction,
      probability: Math.round(finalProbability * 10000) / 10000,
      confidence: Math.round(Math.abs(finalProbability - 0.5) * 200),
      model_agreement: modelAgreement,
      models_used,

      // Individual model results
      ts_random_forest: tsResult,
      python_hybrid: pythonResult ? {
        model: 'GBM + Isolation Forest (Python)',
        composite_score: pythonResult.composite_risk_score,
        scoring_mode: pythonResult.scoring_mode,
        rule_based_score: pythonResult.rule_based_score,
        ml_score: pythonResult.ml_score,
        recommended_action: pythonResult.recommended_action,
        flags: pythonResult.flags,
        detector_results: pythonResult.detector_results,
        ml_results: pythonResult.ml_results,
      } : null,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e instanceof Error ? e.message : String(e)) }, { status: 400 });
  }
}

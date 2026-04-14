/**
 * TenderShield — ML Model Training Script
 * 
 * Supports TWO training modes:
 *   --use-real-data  → Fetches labeled tenders from Supabase (scraped by GeM pipeline)
 *   (default)        → Uses synthetic data (2000 samples, 5 fraud patterns)
 * 
 * Automatic fallback:
 *   Real tenders >= 200  → REAL mode (100% real data)
 *   Real tenders 50-199  → HYBRID mode (real + synthetic augmentation)
 *   Real tenders < 50    → SYNTHETIC mode (falls back to synthetic)
 * 
 * Run:
 *   npx tsx scripts/train-model.ts
 *   npx tsx scripts/train-model.ts --use-real-data
 */

import { generateDataset, trainTestSplit } from '../lib/ml/dataset';
import { loadTrainingData, type RealDataStats } from '../lib/ml/realDataLoader';
import { trainRandomForest, evaluateModel, type ClassificationMetrics, type RandomForestModel } from '../lib/ml/randomForest';
import * as fs from 'fs';
import * as path from 'path';

const USE_REAL_DATA = process.argv.includes('--use-real-data');

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  TenderShield — ML Model Training Pipeline              ║');
  console.log('║  Random Forest for Procurement Fraud Detection          ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Mode: ${USE_REAL_DATA ? '📡 REAL DATA (Supabase → GeM pipeline)' : '🧪 SYNTHETIC DATA (calibrated patterns)'}   ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // ── Step 1: Load Dataset ──────────────────────────────
  console.log('📊 Step 1: Loading training data...');

  let dataset;
  let dataStats: RealDataStats;

  if (USE_REAL_DATA) {
    const result = await loadTrainingData({
      preferReal: true,
      syntheticSize: 2000,
      seed: 42,
    });
    dataset = result.samples;
    dataStats = result.stats;
  } else {
    dataset = generateDataset(2000, 42);
    dataStats = {
      totalTenders: dataset.length,
      fraudCount: dataset.filter(s => s.label === 1).length,
      cleanCount: dataset.filter(s => s.label === 0).length,
      ministries: [...new Set(dataset.map(s => s.ministry))],
      dateRange: { earliest: 'N/A (synthetic)', latest: 'N/A (synthetic)' },
      dataSource: 'SYNTHETIC',
    };
  }

  const fraudCount = dataset.filter(s => s.label === 1).length;
  const cleanCount = dataset.filter(s => s.label === 0).length;

  console.log(`  Data Source: ${dataStats.dataSource}`);
  console.log(`  Total samples: ${dataset.length}`);
  console.log(`  Fraud: ${fraudCount} (${(fraudCount / dataset.length * 100).toFixed(1)}%)`);
  console.log(`  Clean: ${cleanCount} (${(cleanCount / dataset.length * 100).toFixed(1)}%)`);
  if (dataStats.dataSource !== 'SYNTHETIC') {
    console.log(`  Date range: ${dataStats.dateRange.earliest} → ${dataStats.dateRange.latest}`);
    console.log(`  Ministries: ${dataStats.ministries.join(', ')}`);
  }
  console.log('');

  // ── Step 2: Train/Test Split ──────────────────────────
  console.log('✂️  Step 2: Splitting dataset (80/20 stratified)...');
  const { train, test } = trainTestSplit(dataset, 0.2, 42);
  console.log(`  Train: ${train.length} samples`);
  console.log(`  Test:  ${test.length} samples`);
  console.log('');

  // ── Step 3: Train Random Forest ───────────────────────
  console.log('🌲 Step 3: Training Random Forest...');
  const trainX = train.map(s => s.features);
  const trainY = train.map(s => s.label);
  const featureNames = train[0].feature_names;

  const model = trainRandomForest(trainX, trainY, featureNames, {
    numTrees: 100,
    maxDepth: 10,
    minSamples: 5,
    seed: 42,
  });
  console.log('');

  // ── Step 4: Evaluate ──────────────────────────────────
  console.log('📈 Step 4: Evaluating on test set...');
  const testX = test.map(s => s.features);
  const testY = test.map(s => s.label);
  const metrics = evaluateModel(model, testX, testY);

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  CLASSIFICATION REPORT                                  ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Accuracy:   ${(metrics.accuracy * 100).toFixed(1)}%                                    ║`);
  console.log(`║  Precision:  ${(metrics.precision * 100).toFixed(1)}%  (fraud class)                    ║`);
  console.log(`║  Recall:     ${(metrics.recall * 100).toFixed(1)}%  (fraud class)                    ║`);
  console.log(`║  F1 Score:   ${(metrics.f1Score * 100).toFixed(1)}%                                    ║`);
  console.log(`║  ROC AUC:    ${metrics.roc.auc.toFixed(4)}                                  ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  CONFUSION MATRIX                                      ║');
  console.log(`║                  Predicted                              ║`);
  console.log(`║               Clean    Fraud                            ║`);
  console.log(`║  Actual Clean  ${pad(metrics.confusionMatrix.tn)}     ${pad(metrics.confusionMatrix.fp)}    (TN / FP)         ║`);
  console.log(`║  Actual Fraud  ${pad(metrics.confusionMatrix.fn)}     ${pad(metrics.confusionMatrix.tp)}    (FN / TP)         ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  CLASS REPORT                                          ║');
  console.log(`║  Clean:  P=${(metrics.classReport.clean.precision * 100).toFixed(0)}%  R=${(metrics.classReport.clean.recall * 100).toFixed(0)}%  F1=${(metrics.classReport.clean.f1 * 100).toFixed(0)}%  n=${metrics.classReport.clean.support}       ║`);
  console.log(`║  Fraud:  P=${(metrics.classReport.fraud.precision * 100).toFixed(0)}%  R=${(metrics.classReport.fraud.recall * 100).toFixed(0)}%  F1=${(metrics.classReport.fraud.f1 * 100).toFixed(0)}%  n=${metrics.classReport.fraud.support}        ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  DATA SOURCE: ${dataStats.dataSource.padEnd(41)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // ── Step 5: Feature Importance ────────────────────────
  console.log('🏆 Feature Importances:');
  const importances = featureNames.map((name, i) => ({
    name,
    importance: model.featureImportances[i],
  })).sort((a, b) => b.importance - a.importance);

  for (const fi of importances) {
    const bar = '█'.repeat(Math.round(fi.importance * 50));
    console.log(`  ${fi.name.padEnd(28)} ${(fi.importance * 100).toFixed(1)}% ${bar}`);
  }
  console.log('');

  // ── Step 6: Save Model + Metrics ──────────────────────
  console.log('💾 Step 6: Saving model and metrics...');

  const outputDir = path.join(process.cwd(), 'public', 'model');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save metrics (small file for UI)
  const metricsOutput = {
    accuracy: metrics.accuracy,
    precision: metrics.precision,
    recall: metrics.recall,
    f1Score: metrics.f1Score,
    confusionMatrix: metrics.confusionMatrix,
    roc: metrics.roc,
    classReport: metrics.classReport,
    featureImportances: importances,
    modelInfo: {
      algorithm: 'Random Forest',
      numTrees: model.numTrees,
      maxDepth: model.maxDepth,
      numFeatures: model.numFeatures,
      trainingSize: model.trainingSize,
      oobScore: model.oobScore,
      trainedAt: model.trainedAt,
      dataSource: dataStats.dataSource,
      dataStats: {
        totalSamples: dataset.length,
        trainSamples: train.length,
        testSamples: test.length,
        fraudRatio: `${(fraudCount / dataset.length * 100).toFixed(1)}%`,
        featureCount: featureNames.length,
        features: featureNames,
        realTenderCount: dataStats.dataSource !== 'SYNTHETIC' ? dataStats.totalTenders : 0,
        dateRange: dataStats.dateRange,
        ministries: dataStats.ministries,
      },
    },
  };

  fs.writeFileSync(
    path.join(outputDir, 'metrics.json'),
    JSON.stringify(metricsOutput, null, 2)
  );
  console.log(`  ✅ Metrics saved to public/model/metrics.json`);

  // Save model (larger file, needed for predictions)
  function pruneTree(node: any): any {
    const pruned: any = {};
    if (node.prediction !== undefined) {
      pruned.p = node.prediction;
      pruned.pr = Math.round((node.probability || 0) * 1000) / 1000;
      return pruned;
    }
    pruned.f = node.featureIndex;
    pruned.t = Math.round(node.threshold * 10000) / 10000;
    pruned.l = pruneTree(node.left);
    pruned.r = pruneTree(node.right);
    return pruned;
  }

  const modelOutput = {
    v: 1,
    trees: model.trees.map(t => pruneTree(t)),
    featureNames: model.featureNames,
    numTrees: model.numTrees,
    dataSource: dataStats.dataSource,
  };

  fs.writeFileSync(
    path.join(outputDir, 'model.json'),
    JSON.stringify(modelOutput)
  );

  const modelSize = fs.statSync(path.join(outputDir, 'model.json')).size;
  console.log(`  ✅ Model saved to public/model/model.json (${(modelSize / 1024).toFixed(0)} KB)`);

  console.log('');
  console.log('🎉 Training pipeline complete!');
  console.log(`   Data source: ${dataStats.dataSource}`);
  if (dataStats.dataSource === 'SYNTHETIC') {
    console.log('   💡 Run the GeM pipeline first, then re-train with --use-real-data');
    console.log('      python backend/services/data_pipeline/pipeline_runner.py');
  }
}

function pad(n: number): string {
  return n.toString().padStart(4);
}

main().catch(console.error);

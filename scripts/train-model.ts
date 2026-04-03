/**
 * TenderShield — ML Model Training Script
 * 
 * Generates synthetic GeM procurement data → Feature engineering →
 * Trains Random Forest → Evaluates → Saves model + metrics to JSON
 * 
 * Run: npx tsx scripts/train-model.ts
 */

import { generateDataset, trainTestSplit } from '../lib/ml/dataset';
import { trainRandomForest, evaluateModel, type ClassificationMetrics, type RandomForestModel } from '../lib/ml/randomForest';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  TenderShield — ML Model Training Pipeline              ║');
  console.log('║  Random Forest for Procurement Fraud Detection          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // ── Step 1: Generate Dataset ──────────────────────────
  console.log('📊 Step 1: Generating synthetic GeM procurement dataset...');
  const dataset = generateDataset(2000, 42);
  const fraudCount = dataset.filter(s => s.label === 1).length;
  const cleanCount = dataset.filter(s => s.label === 0).length;
  console.log(`  Total samples: ${dataset.length}`);
  console.log(`  Fraud: ${fraudCount} (${(fraudCount / dataset.length * 100).toFixed(1)}%)`);
  console.log(`  Clean: ${cleanCount} (${(cleanCount / dataset.length * 100).toFixed(1)}%)`);
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
      datasetInfo: {
        totalSamples: dataset.length,
        trainSamples: train.length,
        testSamples: test.length,
        fraudRatio: `${(fraudCount / dataset.length * 100).toFixed(1)}%`,
        featureCount: featureNames.length,
        features: featureNames,
      },
    },
  };

  fs.writeFileSync(
    path.join(outputDir, 'metrics.json'),
    JSON.stringify(metricsOutput, null, 2)
  );
  console.log(`  ✅ Metrics saved to public/model/metrics.json`);

  // Save model (larger file, needed for predictions)
  // Strip down tree nodes for size
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
  };

  fs.writeFileSync(
    path.join(outputDir, 'model.json'),
    JSON.stringify(modelOutput)
  );

  const modelSize = fs.statSync(path.join(outputDir, 'model.json')).size;
  console.log(`  ✅ Model saved to public/model/model.json (${(modelSize / 1024).toFixed(0)} KB)`);

  console.log('');
  console.log('🎉 Training pipeline complete!');
}

function pad(n: number): string {
  return n.toString().padStart(4);
}

main().catch(console.error);

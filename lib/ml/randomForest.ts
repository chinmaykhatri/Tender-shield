/**
 * TenderShield — Pure TypeScript Random Forest Implementation
 * 
 * No external ML libraries. Implements:
 *   - CART Decision Tree (Gini impurity)
 *   - Bootstrap Aggregation (Bagging)
 *   - Feature subsampling (sqrt(n) features per split)
 *   - Out-of-Bag error estimation
 * 
 * The entire model serializes to JSON for API serving.
 */

// ─── Decision Tree Node ────────────────────────────────

interface TreeNode {
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  prediction?: number;  // leaf: class label
  probability?: number; // leaf: P(fraud)
  samples?: number;     // leaf: sample count
}

// ─── Gini Impurity ─────────────────────────────────────

function giniImpurity(labels: number[]): number {
  if (labels.length === 0) return 0;
  const counts = new Map<number, number>();
  for (const l of labels) counts.set(l, (counts.get(l) || 0) + 1);
  let gini = 1;
  for (const c of counts.values()) {
    const p = c / labels.length;
    gini -= p * p;
  }
  return gini;
}

// ─── Best Split Finder (CART) ──────────────────────────

function findBestSplit(
  X: number[][],
  y: number[],
  featureSubset: number[]
): { featureIndex: number; threshold: number; gain: number } | null {
  const n = y.length;
  if (n <= 1) return null;

  const parentGini = giniImpurity(y);
  let bestGain = 0;
  let bestFeature = -1;
  let bestThreshold = 0;

  for (const fi of featureSubset) {
    // Get unique sorted values for this feature
    const values = X.map(row => row[fi]);
    const sorted = [...new Set(values)].sort((a, b) => a - b);

    for (let i = 0; i < sorted.length - 1; i++) {
      const threshold = (sorted[i] + sorted[i + 1]) / 2;

      const leftY: number[] = [];
      const rightY: number[] = [];

      for (let j = 0; j < n; j++) {
        if (X[j][fi] <= threshold) leftY.push(y[j]);
        else rightY.push(y[j]);
      }

      if (leftY.length === 0 || rightY.length === 0) continue;

      const weightedGini =
        (leftY.length / n) * giniImpurity(leftY) +
        (rightY.length / n) * giniImpurity(rightY);

      const gain = parentGini - weightedGini;

      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = fi;
        bestThreshold = threshold;
      }
    }
  }

  if (bestFeature === -1) return null;
  return { featureIndex: bestFeature, threshold: bestThreshold, gain: bestGain };
}

// ─── Build Decision Tree ───────────────────────────────

function buildTree(
  X: number[][],
  y: number[],
  maxDepth: number,
  minSamples: number,
  numFeatures: number,
  depth: number = 0,
  rng: () => number
): TreeNode {
  // Leaf conditions
  if (depth >= maxDepth || y.length <= minSamples || new Set(y).size === 1) {
    const ones = y.filter(l => l === 1).length;
    return {
      prediction: ones > y.length / 2 ? 1 : 0,
      probability: ones / Math.max(y.length, 1),
      samples: y.length,
    };
  }

  // Random feature subset (sqrt)
  const allFeatures = Array.from({ length: X[0].length }, (_, i) => i);
  const featureSubset: number[] = [];
  const available = [...allFeatures];
  for (let i = 0; i < Math.min(numFeatures, available.length); i++) {
    const idx = Math.floor(rng() * available.length);
    featureSubset.push(available.splice(idx, 1)[0]);
  }

  const split = findBestSplit(X, y, featureSubset);

  if (!split || split.gain < 1e-7) {
    const ones = y.filter(l => l === 1).length;
    return {
      prediction: ones > y.length / 2 ? 1 : 0,
      probability: ones / Math.max(y.length, 1),
      samples: y.length,
    };
  }

  const leftX: number[][] = [];
  const leftY: number[] = [];
  const rightX: number[][] = [];
  const rightY: number[] = [];

  for (let i = 0; i < y.length; i++) {
    if (X[i][split.featureIndex] <= split.threshold) {
      leftX.push(X[i]);
      leftY.push(y[i]);
    } else {
      rightX.push(X[i]);
      rightY.push(y[i]);
    }
  }

  return {
    featureIndex: split.featureIndex,
    threshold: split.threshold,
    left: buildTree(leftX, leftY, maxDepth, minSamples, numFeatures, depth + 1, rng),
    right: buildTree(rightX, rightY, maxDepth, minSamples, numFeatures, depth + 1, rng),
  };
}

// ─── Predict with single tree ──────────────────────────

function predictTree(node: TreeNode, x: number[]): { prediction: number; probability: number } {
  if (node.prediction !== undefined) {
    return { prediction: node.prediction, probability: node.probability || 0 };
  }
  if (x[node.featureIndex!] <= node.threshold!) {
    return predictTree(node.left!, x);
  }
  return predictTree(node.right!, x);
}

// ─── Random Forest ─────────────────────────────────────

export interface RandomForestModel {
  trees: TreeNode[];
  numTrees: number;
  maxDepth: number;
  numFeatures: number;
  featureNames: string[];
  featureImportances: number[];
  oobScore: number;
  trainedAt: string;
  trainingSize: number;
}

export interface TrainOptions {
  numTrees?: number;
  maxDepth?: number;
  minSamples?: number;
  seed?: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function trainRandomForest(
  X: number[][],
  y: number[],
  featureNames: string[],
  options: TrainOptions = {}
): RandomForestModel {
  const {
    numTrees = 100,
    maxDepth = 10,
    minSamples = 5,
    seed = 42,
  } = options;

  const n = X.length;
  const numFeatures = Math.ceil(Math.sqrt(X[0].length));
  const rng = seededRandom(seed);
  const trees: TreeNode[] = [];

  // Feature importance tracking
  const featureImportances = new Array(X[0].length).fill(0);

  // OOB predictions
  const oobPredictions: number[][] = Array.from({ length: n }, () => []);

  console.log(`  Training ${numTrees} trees (maxDepth=${maxDepth}, features=${numFeatures})...`);

  for (let t = 0; t < numTrees; t++) {
    // Bootstrap sample
    const indices: number[] = [];
    const inBag = new Set<number>();
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rng() * n);
      indices.push(idx);
      inBag.add(idx);
    }

    const bootstrapX = indices.map(i => X[i]);
    const bootstrapY = indices.map(i => y[i]);

    // Build tree
    const tree = buildTree(bootstrapX, bootstrapY, maxDepth, minSamples, numFeatures, 0, rng);
    trees.push(tree);

    // OOB predictions
    for (let i = 0; i < n; i++) {
      if (!inBag.has(i)) {
        const pred = predictTree(tree, X[i]);
        oobPredictions[i].push(pred.probability);
      }
    }

    if ((t + 1) % 20 === 0) {
      process.stdout?.write?.(`  [${t + 1}/${numTrees}] trees trained\r`);
    }
  }

  // Compute OOB score
  let oobCorrect = 0;
  let oobTotal = 0;
  for (let i = 0; i < n; i++) {
    if (oobPredictions[i].length > 0) {
      const avgProb = oobPredictions[i].reduce((a, b) => a + b, 0) / oobPredictions[i].length;
      const prediction = avgProb >= 0.5 ? 1 : 0;
      if (prediction === y[i]) oobCorrect++;
      oobTotal++;
    }
  }
  const oobScore = oobTotal > 0 ? oobCorrect / oobTotal : 0;

  console.log(`  OOB Score: ${(oobScore * 100).toFixed(1)}%`);

  // Compute feature importances (permutation-based approximation)
  // Simple proxy: count how many times each feature was used at root splits
  function countSplits(node: TreeNode, counts: number[]) {
    if (node.prediction !== undefined) return;
    if (node.featureIndex !== undefined) {
      counts[node.featureIndex] += (node.left?.samples || 0) + (node.right?.samples || 0);
    }
    if (node.left) countSplits(node.left, counts);
    if (node.right) countSplits(node.right, counts);
  }

  for (const tree of trees) {
    countSplits(tree, featureImportances);
  }

  // Normalize importances
  const total = featureImportances.reduce((a, b) => a + b, 0) || 1;
  for (let i = 0; i < featureImportances.length; i++) {
    featureImportances[i] = Math.round((featureImportances[i] / total) * 10000) / 10000;
  }

  return {
    trees,
    numTrees,
    maxDepth,
    numFeatures,
    featureNames,
    featureImportances,
    oobScore,
    trainedAt: new Date().toISOString(),
    trainingSize: n,
  };
}

// ─── Predict with forest ───────────────────────────────

export function predictForest(
  model: RandomForestModel,
  x: number[]
): { prediction: number; probability: number; votes: { fraud: number; clean: number } } {
  let fraudVotes = 0;
  let totalProb = 0;

  for (const tree of model.trees) {
    const { prediction, probability } = predictTree(tree, x);
    if (prediction === 1) fraudVotes++;
    totalProb += probability;
  }

  const avgProb = totalProb / model.numTrees;
  return {
    prediction: avgProb >= 0.5 ? 1 : 0,
    probability: Math.round(avgProb * 10000) / 10000,
    votes: {
      fraud: fraudVotes,
      clean: model.numTrees - fraudVotes,
    },
  };
}

// ─── Evaluation Metrics ────────────────────────────────

export interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: {
    tp: number; fp: number; tn: number; fn: number;
  };
  roc: { fpr: number[]; tpr: number[]; auc: number };
  classReport: {
    clean: { precision: number; recall: number; f1: number; support: number };
    fraud: { precision: number; recall: number; f1: number; support: number };
  };
}

export function evaluateModel(
  model: RandomForestModel,
  X: number[][],
  y: number[]
): ClassificationMetrics {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const probabilities: { prob: number; actual: number }[] = [];

  for (let i = 0; i < X.length; i++) {
    const { prediction, probability } = predictForest(model, X[i]);
    probabilities.push({ prob: probability, actual: y[i] });

    if (prediction === 1 && y[i] === 1) tp++;
    else if (prediction === 1 && y[i] === 0) fp++;
    else if (prediction === 0 && y[i] === 0) tn++;
    else fn++;
  }

  const accuracy = (tp + tn) / (tp + fp + tn + fn);
  const precision = tp / Math.max(tp + fp, 1);
  const recall = tp / Math.max(tp + fn, 1);
  const f1Score = 2 * precision * recall / Math.max(precision + recall, 0.001);

  // ROC curve
  const sorted = [...probabilities].sort((a, b) => b.prob - a.prob);
  const totalPos = y.filter(l => l === 1).length;
  const totalNeg = y.filter(l => l === 0).length;
  const fpr: number[] = [0];
  const tpr: number[] = [0];
  let fpCount = 0, tpCount = 0;

  for (const s of sorted) {
    if (s.actual === 1) tpCount++;
    else fpCount++;
    tpr.push(tpCount / Math.max(totalPos, 1));
    fpr.push(fpCount / Math.max(totalNeg, 1));
  }
  fpr.push(1);
  tpr.push(1);

  // AUC via trapezoidal rule
  let auc = 0;
  for (let i = 1; i < fpr.length; i++) {
    auc += (fpr[i] - fpr[i - 1]) * (tpr[i] + tpr[i - 1]) / 2;
  }

  // Class report
  const cleanPrecision = tn / Math.max(tn + fn, 1);
  const cleanRecall = tn / Math.max(tn + fp, 1);
  const cleanF1 = 2 * cleanPrecision * cleanRecall / Math.max(cleanPrecision + cleanRecall, 0.001);

  return {
    accuracy,
    precision,
    recall,
    f1Score,
    confusionMatrix: { tp, fp, tn, fn },
    roc: {
      fpr: fpr.filter((_, i) => i % Math.max(1, Math.floor(fpr.length / 50)) === 0 || i === fpr.length - 1),
      tpr: tpr.filter((_, i) => i % Math.max(1, Math.floor(tpr.length / 50)) === 0 || i === tpr.length - 1),
      auc: Math.round(auc * 10000) / 10000,
    },
    classReport: {
      clean: { precision: cleanPrecision, recall: cleanRecall, f1: cleanF1, support: totalNeg },
      fraud: { precision, recall, f1: f1Score, support: totalPos },
    },
  };
}

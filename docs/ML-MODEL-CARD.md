# ML Model Card — TenderShield Fraud Detection

## Model Overview

| Property | Value |
|----------|-------|
| Algorithm | Random Forest (100 trees, max depth 10) |
| Task | Binary classification — FRAUD vs CLEAN |
| Input | 15 engineered features from procurement data |
| Output | Probability [0,1] + classification label |
| Size | ~19KB serialized JSON |
| Training | `npx tsx scripts/train-model.ts` |

## Training Data

### Current: Synthetic (v1.0)

- **Source:** `lib/ml/dataset.ts` → `generateDataset(2000, seed=42)`
- **Size:** 2,000 samples (80/20 train/test split)
- **Fraud ratio:** ~30% (600 fraud, 1400 clean)
- **Generation method:** Rule-based synthetic generation with realistic Indian procurement parameters

### Known Limitations

> ⚠️ **The model has never seen real fraudulent tenders.**

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| Synthetic data only | Unknown real-world false positive rate | Design supports CSV ingestion for retraining |
| No adversarial examples | Model may miss sophisticated fraud patterns | Feature engineering captures structural anomalies |
| Seed-deterministic | Same model every time | Consistent for competition, not for production |
| India-specific features | May not generalize to other countries | Ministry/category features are India-centric |

### Real Data Ingestion Path

```bash
# When real data is available:
npx tsx scripts/ingest-real-data.ts --input data/real-tenders/*.csv
npx tsx scripts/train-model.ts --source real
```

## Features (15)

| # | Feature | Type | Description |
|---|---------|------|-------------|
| 1 | `bid_spread` | float | (max_bid - min_bid) / estimated_value |
| 2 | `min_bid_ratio` | float | min_bid / estimated_value |
| 3 | `avg_bid_ratio` | float | avg_bid / estimated_value |
| 4 | `num_bidders` | int | Number of bidders |
| 5 | `bid_variance` | float | Statistical variance of bids |
| 6 | `time_spread` | float | Time between first and last bid (hours) |
| 7 | `is_sole_bidder` | bool | Only 1 bidder? |
| 8 | `value_log` | float | log10(estimated_value_crore) |
| 9 | `is_high_value` | bool | estimatedValue > 50 Cr |
| 10 | `is_infra` | bool | Category is WORKS/INFRASTRUCTURE |
| 11 | `bid_clustering` | float | How tightly clustered are bids? |
| 12 | `winner_discount` | float | (estimated - winning) / estimated |
| 13 | `repeat_winner` | bool | Same bidder won previous tender? |
| 14 | `pan_diversity` | float | Unique PAN ratio among bidders |
| 15 | `rush_bidding` | bool | Multiple bids within 1 hour? |

## Evaluation Results (Test Set)

| Metric | Value |
|--------|-------|
| Accuracy | ~92% |
| Precision (Fraud) | ~89% |
| Recall (Fraud) | ~87% |
| F1 Score (Fraud) | ~88% |
| ROC AUC | ~0.95 |

## Ethical Considerations

- **False positives** can unfairly flag legitimate bidders → All ML flags require human review
- **Training bias:** Synthetic data encodes our assumptions about what fraud looks like
- **No demographic data:** Model uses procurement features only, not bidder demographics
- The model is a **decision support tool**, not an automated enforcement mechanism

## Retraining Instructions

```bash
# 1. Generate fresh synthetic data
npx tsx scripts/train-model.ts

# 2. With real data (when available)
# Place CSV files in data/real-tenders/
npx tsx scripts/ingest-real-data.ts --input data/real-tenders/
npx tsx scripts/train-model.ts --source real

# 3. Verify metrics
cat public/model/metrics.json | npx -y json
```

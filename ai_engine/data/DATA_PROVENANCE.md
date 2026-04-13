# TenderShield Training Data — Provenance & Honesty Disclosure

## Data Source: `gem_real_data.csv` (852 rows)

### ⚠️ IMPORTANT: This data is NOT scraped from real government portals.

This dataset is **synthetically generated** to calibrate
TenderShield's fraud detection models. It has **never** been validated
against actual GeM/CPPP tender records.

## Composition

| Source Tag | Row Count | Origin | Real? |
|---|---|---|---|
| `CAG_REPORT_*` | 6 | Manually crafted based on *patterns* described in CAG audit reports (not raw data) | **No** — inspired by report summaries, not transcribed from original documents |
| `GEM_CALIBRATED_2024` | 846 | Statistically generated using procurement distribution parameters (value ranges, bidder counts, CV distributions) derived from published GeM statistics | **No** — synthetic rows following plausible statistical distributions |

## What the "92% accuracy" means

The Random Forest model trained on this data achieves 92% accuracy
**on a test split of this same synthetic dataset**. This metric tells
you that the model learned the patterns we embedded in the data.
It does **not** tell you how the model would perform on real
Indian procurement data.

## What would make this real

1. **Scrape 10,000+ real tenders** from https://gem.gov.in public listings
2. **Parse CAG PDF reports** (Reports 3, 7, 12, 14 of 2023-2024) for actual
   fraud case parameters
3. **Collect officer feedback** via the `/api/feedback` endpoint — each
   label from a real officer is worth 100 synthetic rows

## Column Definitions

| Column | Description |
|---|---|
| `record_id` | Unique identifier — `CAG-*` for report-inspired, `GEM-CAL-*` for calibrated synthetic |
| `data_source` | Provenance tag: `CAG_REPORT_*` or `GEM_CALIBRATED_2024` |
| `is_fraud` | Binary label: `1` = fraudulent pattern, `0` = clean |
| `fraud_type` | Type of fraud injected: `bid_rigging`, `shell_company`, `timing`, `front_running`, `spec_bias`, `split`, `none` |
| `bid_cv_pct` | Coefficient of Variation (%) — low values indicate bid rigging |
| `min_bid_time_gap_minutes` | Minimum time gap between bid submissions — low values indicate timing collusion |
| `winning_bid_pct_of_estimate` | How close the winning bid is to the estimate — values > 97% suggest front-running |
| `spec_bias_score` | Specification bias indicator — high values suggest tailored specs |

## Bottom Line

This dataset is a **calibration tool**, not ground truth.
Treat all accuracy metrics derived from it as **upper bounds**, not production guarantees.

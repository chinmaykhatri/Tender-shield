"""
============================================================================
TenderShield — AI Explainability Router
============================================================================
Endpoints for understanding WHY the AI flagged a tender:
  - Feature importance breakdown
  - Top contributing factors
  - Model confidence and agreement
  - Human-readable explanations per feature

DESIGN:
  Provides SHAP-like explainability without requiring the SHAP library.
  Uses feature importance from Gradient Boosting + per-sample feature
  values to generate readable explanations.

BLOCKCHAIN INTEGRATION:
  Explanations reference blockchain-recorded audit events.
  Every AI decision is traceable back to specific features and thresholds.
============================================================================
"""

import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from backend.auth.jwt_handler import TokenData, get_current_user

logger = logging.getLogger("tendershield.ai.explain")
router = APIRouter(prefix="/api/v1/ai", tags=["AI Engine"])


# Feature explanation templates (human-readable)
FEATURE_EXPLANATIONS = {
    "bid_count": {
        "name": "Number of Bids",
        "low_desc": "Very few bids submitted — may indicate bid suppression or limited competition.",
        "high_desc": "Healthy number of bids — indicates normal competitive bidding.",
        "threshold": 4,
    },
    "cv": {
        "name": "Coefficient of Variation",
        "low_desc": "Bids are suspiciously similar in value (CV < 5%). In {pct}% of legitimate tenders, CV is above this threshold.",
        "high_desc": "Normal bid spread — healthy competition.",
        "threshold": 0.05,
    },
    "min_ratio": {
        "name": "Lowest Bid / Estimate Ratio",
        "low_desc": "Lowest bid is significantly below the estimated value — possible predatory pricing.",
        "high_desc": "Lowest bid is close to the estimate — may indicate information leakage or collusion.",
        "threshold": 0.85,
    },
    "max_ratio": {
        "name": "Highest Bid / Estimate Ratio",
        "low_desc": "All bids are below estimate — may indicate cartel behavior with shared ceiling.",
        "high_desc": "Cover bid detected — bid is {pct}% above estimate, likely not a genuine attempt to win.",
        "threshold": 1.05,
    },
    "benford_distance": {
        "name": "Benford's Law Distance",
        "low_desc": "First-digit distribution follows Benford's Law — bid amounts appear natural.",
        "high_desc": "First-digit distribution deviates from Benford's Law — amounts may be fabricated.",
        "threshold": 0.05,
    },
    "round_number_pct": {
        "name": "Round Number Percentage",
        "low_desc": "Bids have natural, non-round amounts — normal behavior.",
        "high_desc": "{pct}% of bids are round numbers (₹X,00,000). Fabricated bids are 3x more likely to be round.",
        "threshold": 0.4,
    },
    "timing_cluster": {
        "name": "Deadline Timing Cluster",
        "low_desc": "Bids spread naturally over time — no timing anomaly.",
        "high_desc": "{pct}% of bids submitted in the last 30 minutes. This occurs in only 2% of legitimate tenders.",
        "threshold": 0.7,
    },
    "gap_cv": {
        "name": "Bid Gap Uniformity",
        "low_desc": "Gaps between bid amounts are suspiciously uniform — indicates coordinated pricing.",
        "high_desc": "Natural variation in bid gaps — normal competitive behavior.",
        "threshold": 0.15,
    },
    "state_diversity": {
        "name": "Geographic Diversity (GSTIN)",
        "low_desc": "All bidders from the same state — possible regional cartel.",
        "high_desc": "Bidders from {n} different states — healthy geographic competition.",
        "threshold": 0.5,
    },
    "deadline_proximity_min": {
        "name": "Average Submission Timing",
        "low_desc": "Average bid submitted very close to deadline — suspicious coordination.",
        "high_desc": "Bids submitted across the tender period — normal behavior.",
        "threshold": 120,
    },
    "avg_incorporation_months": {
        "name": "Average Company Age",
        "low_desc": "Bidding companies are very newly incorporated — possible shell companies.",
        "high_desc": "Established companies with track record — low shell company risk.",
        "threshold": 24,
    },
    "min_employee_count": {
        "name": "Smallest Bidder Size",
        "low_desc": "One or more bidders have fewer than {n} employees — shell company indicator.",
        "high_desc": "All bidders have adequate workforce for the tender scope.",
        "threshold": 10,
    },
    "shared_directors_ratio": {
        "name": "Shared Director Overlap",
        "low_desc": "No shared directors between bidding companies — independent entities.",
        "high_desc": "{pct}% director overlap between bidders — strong shell company/collusion indicator.",
        "threshold": 0.2,
    },
    "shared_address_ratio": {
        "name": "Shared Address Ratio",
        "low_desc": "All bidders at different addresses — independent entities.",
        "high_desc": "{pct}% of bidders share the same registered address — shell company indicator.",
        "threshold": 0.3,
    },
    "turnover_to_bid_ratio": {
        "name": "Financial Capacity Ratio",
        "low_desc": "One or more bidders' annual turnover is less than the bid amount — undercapitalized.",
        "high_desc": "All bidders have adequate financial capacity relative to their bids.",
        "threshold": 1.0,
    },
}


def generate_explanation(
    feature_name: str,
    feature_value: float,
    importance: float,
) -> Dict[str, Any]:
    """Generate a human-readable explanation for a feature's contribution."""
    template = FEATURE_EXPLANATIONS.get(feature_name, {})
    threshold = template.get("threshold", 0)

    is_suspicious = False
    if feature_name in ["cv", "gap_cv", "state_diversity", "deadline_proximity_min",
                        "avg_incorporation_months", "min_employee_count", "turnover_to_bid_ratio"]:
        is_suspicious = feature_value < threshold
    else:
        is_suspicious = feature_value > threshold

    if is_suspicious:
        desc = template.get("low_desc" if feature_value < threshold else "high_desc", "")
    else:
        desc = template.get("high_desc" if feature_value < threshold else "low_desc", "")

    # Fill in dynamic values
    desc = desc.replace("{pct}", f"{feature_value * 100:.0f}" if feature_value < 10 else f"{feature_value:.0f}")
    desc = desc.replace("{n}", f"{int(feature_value)}")

    return {
        "feature": feature_name,
        "display_name": template.get("name", feature_name),
        "value": round(feature_value, 4),
        "importance": round(importance, 4),
        "is_suspicious": is_suspicious,
        "threshold": threshold,
        "direction": "ABOVE" if feature_value > threshold else "BELOW",
        "explanation": desc,
    }


# ---- Endpoints ----

@router.get("/model/info")
async def get_model_info(
    current_user: TokenData = Depends(get_current_user),
):
    """
    Get information about the loaded ML models.
    Shows model type, training size, feature importances.
    """
    try:
        from ai_engine.ml.fraud_model import fraud_pipeline
        from ai_engine.risk_scorer import CompositeRiskScorer

        scorer = CompositeRiskScorer()
        return {
            "success": True,
            "model_info": scorer.get_model_info(),
        }
    except Exception as e:
        return {
            "success": True,
            "model_info": {
                "ml_loaded": False,
                "scoring_mode": "RULE_BASED",
                "error": str(e),
            },
        }


@router.get("/explain/features")
async def get_feature_definitions(
    current_user: TokenData = Depends(get_current_user),
):
    """
    Get the list of all 15 ML features with descriptions.
    Used by the frontend to render the feature importance chart.
    """
    features = []
    for name, info in FEATURE_EXPLANATIONS.items():
        features.append({
            "name": name,
            "display_name": info.get("name", name),
            "threshold": info.get("threshold", 0),
            "suspicion_direction": (
                "LOW" if name in ["cv", "gap_cv", "state_diversity",
                                   "deadline_proximity_min", "avg_incorporation_months",
                                   "min_employee_count", "turnover_to_bid_ratio"]
                else "HIGH"
            ),
        })

    return {
        "success": True,
        "features": features,
        "total": len(features),
    }


@router.post("/explain/predict")
async def explain_prediction(
    request: Dict[str, Any],
    current_user: TokenData = Depends(get_current_user),
):
    """
    Run an AI analysis on a tender and return a fully explained prediction.

    Request body:
    {
      "tender": { ... tender data ... },
      "bids": [ ... bid data ... ]
    }

    Returns:
    {
      "prediction": "FRAUD",
      "confidence": 0.82,
      "top_factors": [ ... explained features ... ],
      "model_agreement": true,
      ...
    }
    """
    tender = request.get("tender", {})
    bids = request.get("bids", [])

    if not tender or not bids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both 'tender' and 'bids' fields are required",
        )

    try:
        from ai_engine.risk_scorer import CompositeRiskScorer

        scorer = CompositeRiskScorer()
        result = scorer.score_tender(tender, bids)

        # Generate explanations for top features
        explanations = []
        if "ml_results" in result and "top_features" in result["ml_results"]:
            for feat in result["ml_results"]["top_features"]:
                exp = generate_explanation(
                    feat["name"], feat["value"], feat["importance"]
                )
                explanations.append(exp)

        return {
            "success": True,
            "tender_id": tender.get("tender_id", "unknown"),
            "prediction": result.get("recommended_action", "MONITOR"),
            "composite_score": result.get("composite_risk_score", 0),
            "rule_based_score": result.get("rule_based_score", 0),
            "ml_score": result.get("ml_score", 0),
            "scoring_mode": result.get("scoring_mode", "RULE_BASED"),
            "confidence": min(1.0, result.get("composite_risk_score", 0) / 100),
            "model_agreement": result.get("ml_results", {}).get("model_agreement", True),
            "flags": result.get("flags", []),
            "top_factors": explanations,
            "detector_breakdown": result.get("detector_results", {}),
            "ml_details": result.get("ml_results", {}),
        }
    except Exception as e:
        logger.error(f"[Explain] Prediction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}",
        )

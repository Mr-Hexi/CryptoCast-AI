import os
import sys
from datetime import datetime, timezone, timedelta

import numpy as np
import pandas as pd
import joblib

# Ensure ml_pipeline is importable
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
if project_root not in sys.path:
    sys.path.append(project_root)

from ml_pipeline.data.ingest import download_data
from ml_pipeline.features.technical_indicators import add_features
from ml_pipeline.data.preprocessing import scale_data
from .mlflow_service import init_mlflow, resolve_model_reference, get_model_forecasts
import mlflow


def _safe_psi(expected, actual, bins=10):
    expected = np.asarray(expected, dtype=float)
    actual = np.asarray(actual, dtype=float)
    expected = expected[np.isfinite(expected)]
    actual = actual[np.isfinite(actual)]

    if expected.size < 2 or actual.size < 2:
        return 0.0

    quantiles = np.linspace(0, 1, bins + 1)
    bin_edges = np.quantile(expected, quantiles)
    bin_edges[0] = -np.inf
    bin_edges[-1] = np.inf

    expected_counts, _ = np.histogram(expected, bins=bin_edges)
    actual_counts, _ = np.histogram(actual, bins=bin_edges)

    expected_dist = expected_counts / max(expected_counts.sum(), 1)
    actual_dist = actual_counts / max(actual_counts.sum(), 1)

    eps = 1e-6
    expected_dist = np.clip(expected_dist, eps, None)
    actual_dist = np.clip(actual_dist, eps, None)

    psi = np.sum((actual_dist - expected_dist) * np.log(actual_dist / expected_dist))
    return float(max(psi, 0.0))


def _drift_level(score):
    if score < 0.1:
        return "low"
    if score < 0.25:
        return "moderate"
    return "high"


def get_roi_analysis(initial_capital=1000.0):
    """
    Simple ROI analysis based on 24-hour forecasts.
    Returns projected returns for LSTM and GRU models.
    """
    # Get forecasts (24-hour predictions)
    forecasts = get_model_forecasts()
    lstm_forecast = forecasts.get('lstm_forecast', [])
    gru_forecast = forecasts.get('gru_forecast', [])
    history = forecasts.get('history', [])

    # Get current price (most recent historical price)
    current_price = None
    if history and len(history) > 0:
        current_price = history[-1].get('price')

    def compute_model_projection(forecast):
        if not forecast or current_price is None:
            return {
                "signal": "hold",
                "expected_return_pct": None,
                "projected_value": None
            }
        next_price = forecast[0]['price']
        pct_change = ((next_price - current_price) / current_price) * 100.0
        projected_value = initial_capital * (next_price / current_price)
        signal = "buy" if next_price > current_price else "sell" if next_price < current_price else "hold"
        return {
            "signal": signal,
            "expected_return_pct": round(pct_change, 3),
            "projected_value": round(projected_value, 2)
        }

    lstm_proj = compute_model_projection(lstm_forecast)
    gru_proj = compute_model_projection(gru_forecast)

    # Compute consensus
    if lstm_proj["expected_return_pct"] is not None and gru_proj["expected_return_pct"] is not None:
        consensus_pct = (lstm_proj["expected_return_pct"] + gru_proj["expected_return_pct"]) / 2
        consensus_proj = (lstm_proj["projected_value"] + gru_proj["projected_value"]) / 2
        outlook = "bullish" if consensus_pct > 0 else "bearish" if consensus_pct < 0 else "neutral"
    else:
        consensus_pct = None
        consensus_proj = None
        outlook = "neutral"

    return {
        "initial_capital": float(initial_capital),
        "date_range": "24h",
        "current_price": current_price,
        "models": {
            "lstm": lstm_proj,
            "gru": gru_proj
        },
        "consensus": {
            "outlook": outlook,
            "expected_return_pct": round(consensus_pct, 3) if consensus_pct is not None else None,
            "projected_value": round(consensus_proj, 2) if consensus_proj is not None else None
        }
    }



def get_drift_analysis():
    temp_path = os.path.join(project_root, "data", "temp_drift.csv")
    df = download_data(ticker="BTC-USD", period="730d", interval="1h", output_path=temp_path)
    df_features = add_features(df)
    df_features = df_features.replace([np.inf, -np.inf], np.nan).dropna()

    feature_cols = ["Price", "Volume", "MA12", "MA24", "Volatility", "Momentum"]
    if len(df_features) < 300:
        return {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "status": "insufficient_data",
            "overall_drift_score": None,
            "feature_drift": {},
            "timeline": [],
        }

    split_idx = int(len(df_features) * 0.8)
    baseline = df_features.iloc[:split_idx]
    recent = df_features.iloc[split_idx:]

    feature_drift = {}
    scores = []
    for col in feature_cols:
        psi = _safe_psi(baseline[col].values, recent[col].values, bins=10)
        feature_drift[col] = {
            "psi": round(psi, 5),
            "level": _drift_level(psi),
        }
        scores.append(psi)

    overall_score = float(np.mean(scores)) if scores else 0.0

    # Build timeline for plot using rolling window over recent segment.
    window = 72
    timeline = []
    if len(recent) >= window:
        for idx in range(window, len(recent) + 1, 12):
            chunk = recent.iloc[idx - window:idx]
            chunk_scores = []
            for col in feature_cols:
                chunk_scores.append(_safe_psi(baseline[col].values, chunk[col].values, bins=10))
            drift_score = float(np.mean(chunk_scores)) if chunk_scores else 0.0
            timeline.append(
                {
                    "date": str(chunk["Date"].iloc[-1]),
                    "drift_score": round(drift_score, 5),
                    "level": _drift_level(drift_score),
                }
            )

    return {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "status": _drift_level(overall_score),
        "overall_drift_score": round(overall_score, 5),
        "feature_drift": feature_drift,
        "timeline": timeline,
        "baseline_points": int(len(baseline)),
        "recent_points": int(len(recent)),
    }

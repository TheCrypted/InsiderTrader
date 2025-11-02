# app.py
import os, glob, json, pickle, datetime, math
from typing import Optional, Dict, Any

import numpy as np
import pandas as pd
import requests
import yfinance as yf
from fastapi import FastAPI, HTTPException, Query

# =========================
# Load latest artifacts
# =========================
def latest_file(pat: str) -> Optional[str]:
    files = sorted(glob.glob(pat), key=os.path.getmtime)
    return files[-1] if files else None

MODEL_PATH  = latest_file("models/bill_prediction_ensemble_20251102_114402.pkl")
SCALER_PATH = latest_file("models/feature_scaler_20251102_114402.pkl")
FEATS_PATH  = latest_file("models/feature_names_20251102_114402.json")
if not (MODEL_PATH and SCALER_PATH and FEATS_PATH):
    raise RuntimeError("Missing model artifacts in ./models")

with open(MODEL_PATH, "rb") as f:
    MODEL = pickle.load(f)
with open(SCALER_PATH, "rb") as f:
    SCALER = pickle.load(f)
with open(FEATS_PATH, "r") as f:
    FEATURE_NAMES = json.load(f)  # must match the 16-feature list

MODEL_VERSION = datetime.datetime.utcnow().isoformat()

# =========================
# Helpers
# =========================
POLICY_TO_SECTOR = {
    "Health":"XLV","Social Welfare":"XLV","Education":"XLV",
    "Economics and Public Finance":"XLF","Finance and Financial Sector":"XLF",
    "Taxation":"XLF","Foreign Trade and International Finance":"XLF",
    "Commerce":"XLY","Labor and Employment":"XLY",
    "Transportation and Public Works":"XLI","Energy":"XLE",
    "Water Resources Development":"XLU","Environmental Protection":"ICLN",
    "Public Lands and Natural Resources":"XLI","Infrastructure":"XLI",
    "Science, Technology, Communications":"XLK","Telecommunications":"XLC",
    "Armed Forces and National Security":"XAR","Crime and Law Enforcement":"XAR",
    "Emergency Management":"XAR","Agriculture and Food":"MOO","Animals":"MOO",
    "Families":"XLP","Housing and Community Development":"XLRE",
    "Government Operations and Politics":"SPY","Congress":"SPY","Law":"SPY",
    "International Affairs":"SPY","Civil Rights and Liberties, Minority Issues":"XLP",
    "Native Americans":"XLP","Arts, Culture, Religion":"XLY",
}
def sector_from_policy(policy_area: str) -> str:
    if not policy_area:
        return "SPY"
    if policy_area in POLICY_TO_SECTOR:
        return POLICY_TO_SECTOR[policy_area]
    for k, v in POLICY_TO_SECTOR.items():
        if k.lower() in policy_area.lower():
            return v
    return "SPY"

def _safe_float(x, default=0.0) -> float:
    try:
        v = float(x)
        return v if math.isfinite(v) else default
    except Exception:
        return default

def _sanitize_for_json(obj):
    """Recursively JSON-sanitize: numpy scalars -> py scalars; NaN/Inf -> 0.0."""
    if isinstance(obj, dict):
        return {k: _sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_for_json(v) for v in obj]
    if isinstance(obj, tuple):
        return tuple(_sanitize_for_json(v) for v in obj)
    if isinstance(obj, (np.generic,)):
        obj = obj.item()
    if isinstance(obj, float):
        return obj if math.isfinite(obj) else 0.0
    return obj

def safe_int(v, default=0):
    try:
        return int(v)
    except Exception:
        return default

# =========================
# External data fetch
# =========================
def fetch_bill(congress: int, bill_type: str, bill_number: int, api_key: str) -> Dict[str, Any]:
    url = f"https://api.congress.gov/v3/bill/{congress}/{bill_type.lower()}/{bill_number}"
    r = requests.get(url, params={"api_key": api_key, "format": "json"}, timeout=30)
    r.raise_for_status()
    return (r.json() or {}).get("bill", {})

# =========================
# Stock feature builder
# =========================
def stock_features(from_date: Optional[str], policy_area: Optional[str]) -> Dict[str, float]:
    """
    Compute stock features from reference date forward 30 days for mapped sector ETF.
    Always returns finite floats (NaN/Inf -> 0.0).
    """
    out = {
        "stock_avg_return_7d": 0.0,
        "stock_avg_return_30d": 0.0,
        "stock_pct_positive": 0.0,
        "stock_volatility": 0.0,
        "stock_momentum": 0.0,
    }
    try:
        if not from_date:
            return out
        start_dt = datetime.datetime.strptime(from_date, "%Y-%m-%d")
        etf = sector_from_policy(policy_area or "")

        hist = yf.Ticker(etf).history(start=start_dt, end=start_dt + datetime.timedelta(days=30))
        if len(hist) < 2:
            return out

        initial = float(hist["Close"].iloc[0])
        ret7  = (float(hist["Close"].iloc[7]) / initial - 1) * 100.0 if len(hist) > 7 else 0.0
        ret30 = (float(hist["Close"].iloc[-1]) / initial - 1) * 100.0

        daily = hist["Close"].pct_change().dropna()
        if daily.empty:
            pct_pos = 0.0
            vol = 0.0
        else:
            pct_pos = float((daily > 0).mean() * 100.0)
            vol = float(daily.std() * 100.0)

        out["stock_avg_return_7d"]  = _safe_float(ret7)
        out["stock_avg_return_30d"] = _safe_float(ret30)
        out["stock_pct_positive"]   = _safe_float(pct_pos)
        out["stock_volatility"]     = _safe_float(vol)
        out["stock_momentum"]       = _safe_float(out["stock_avg_return_30d"] - out["stock_avg_return_7d"])
        return out
    except Exception:
        return out

# =========================
# Feature engineering (16 features)
# =========================
def engineer_16_features_from_bill(bill: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build exactly 16 numeric features.
    - days_since_intro uses introducedDate
    - stock features use latestAction.actionDate (fallback: introducedDate)
    """
    sponsors = bill.get("sponsors") or []
    dem = sum(1 for s in sponsors if (s or {}).get("party") == "D")
    rep = sum(1 for s in sponsors if (s or {}).get("party") == "R")
    other = max(0, len(sponsors) - dem - rep)

    num_cosponsors = (bill.get("cosponsors") or {}).get("count", 0)
    num_committees = (bill.get("committees") or {}).get("count", 0)
    num_actions    = (bill.get("actions") or {}).get("count", 0)

    # Intro timing -> days_since_intro, intro_year, intro_month
    intro_date = bill.get("introducedDate")
    if intro_date:
        intro_dt = datetime.datetime.strptime(intro_date, "%Y-%m-%d")
        days_since_intro = (datetime.datetime.now() - intro_dt).days
        intro_year, intro_month = intro_dt.year, intro_dt.month
    else:
        days_since_intro, intro_year, intro_month = 0, 0, 0

    total_support = len(sponsors) + safe_int(num_cosponsors)

    # Stock features from latest action date (fallback intro)
    latest_action   = bill.get("latestAction") or {}
    last_action_date = latest_action.get("actionDate") or intro_date
    policy_area     = ((bill.get("policyArea") or {}).get("name")) or ""
    stocks          = stock_features(last_action_date, policy_area)

    feats = {
        "congress": safe_int(bill.get("congress")),
        "sponsor_dem_count": safe_int(dem),
        "sponsor_rep_count": safe_int(rep),
        "sponsor_other_count": safe_int(other),
        "num_cosponsors": safe_int(num_cosponsors),
        "num_committees": safe_int(num_committees),
        "num_actions": safe_int(num_actions),
        "days_since_intro": safe_int(days_since_intro),
        "intro_year": safe_int(intro_year),
        "intro_month": safe_int(intro_month),
        "total_support": safe_int(total_support),
        "stock_avg_return_7d": _safe_float(stocks["stock_avg_return_7d"]),
        "stock_avg_return_30d": _safe_float(stocks["stock_avg_return_30d"]),
        "stock_pct_positive": _safe_float(stocks["stock_pct_positive"]),
        "stock_volatility": _safe_float(stocks["stock_volatility"]),
        "stock_momentum": _safe_float(stocks["stock_momentum"]),
    }

    # NaN/Inf guard
    for k, v in list(feats.items()):
        if v is None or (isinstance(v, float) and not math.isfinite(v)):
            feats[k] = 0.0
    return feats

def align_and_predict(feats: Dict[str, Any], threshold: float):
    """Align to expected feature order, fill NaNs with 0.0, scale and predict."""
    X = pd.DataFrame([feats]).reindex(columns=FEATURE_NAMES, fill_value=0.0).astype(float)
    X = X.fillna(0.0)
    Xs = SCALER.transform(X)
    p = float(MODEL.predict_proba(Xs)[:, 1][0])
    return (1 if p >= threshold else 0), p

# =========================
# FastAPI (single endpoint)
# =========================
app = FastAPI(title="Predict Bill Passage", version="1.0.0")

@app.get("/predict_bill")
def predict_bill(
    congress: int = Query(..., ge=1),
    bill_type: str = Query(..., pattern="^(hr|s|hres|sres|hjres|sjres|hconres|sconres)$"),
    bill_number: int = Query(..., ge=1),
    threshold: float = Query(0.5, ge=0.0, le=1.0),
):
    api_key = os.getenv("CONGRESS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Set CONGRESS_API_KEY env variable.")

    try:
        bill = fetch_bill(congress, bill_type, bill_number, api_key)
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")

        feats = engineer_16_features_from_bill(bill)

        # Validate against model artifacts (helps catch training/inference mismatch)
        missing = [c for c in FEATURE_NAMES if c not in feats]
        extra   = [c for c in feats if c not in FEATURE_NAMES]
        if missing:
            raise HTTPException(
                status_code=500,
                detail=f"Feature mismatch with model artifacts. Missing: {missing}. Extra: {extra}"
            )

        pred, proba_pass = align_and_predict(feats, threshold)

        response = {
            "bill_id": f"{(bill.get('type') or '').upper()}.{bill.get('number') or ''}",
            "congress": bill.get("congress"),
            "policy_area": (bill.get("policyArea") or {}).get("name"),
            "latest_action": (bill.get("latestAction") or {}).get("text"),
            "latest_action_date": (bill.get("latestAction") or {}).get("actionDate"),
            "predicted_class": int(pred),  # 1 = Pass, 0 = Fail
            "prob_pass": round(proba_pass, 3),
            "prob_fail": round(1.0 - proba_pass, 3),
            "threshold": float(threshold),
            "features_used": feats,
            "model_version": MODEL_VERSION,
        }
        return _sanitize_for_json(response)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {e}")

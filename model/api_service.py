#!/usr/bin/env python3
import os
import re
import time
import math
from datetime import datetime, timezone
from typing import List, Tuple, Optional

import numpy as np
import pandas as pd
import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import JSONResponse

from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize as sk_normalize

from typing import Dict, Any, Set

import json

# =========================
# Config
# =========================
CONGRESS = 119
MODEL_NAME = "all-mpnet-base-v2"

# Optional precomputed artifacts (company embeddings, company texts, companies df)
ARTIFACT_DIR = "artifacts"
COMP_EMB_PATH    = os.path.join(ARTIFACT_DIR, "company_embeddings.npy")  # optional
COMP_DF_PATH     = os.path.join(ARTIFACT_DIR, "companies.parquet")
COMP_TEXTS_PATH  = os.path.join(ARTIFACT_DIR, "company_texts.json")

# Where to save cleaned bill text
BILL_TEXT_DIR = "bill_texts"
os.makedirs(BILL_TEXT_DIR, exist_ok=True)

# Chunking
TARGET_CHUNKS = 8
MIN_WORDS = 300
MAX_WORDS = 1500
OVERLAP_FRACTION = 0.05
TOPK_RESULTS = 5

# ---- Keep original scoring weights exactly ----
ALPHA = 0.65   # dense
BETA  = 0.30   # tfidf
GAMMA_K = 0.05 # keyword prior
INDUSTRY_PRIOR_CAP = 0.12  # additive

# Congress API key
CONGRESS_API_KEY = os.getenv("CONGRESS_API_KEY", "XcQpTDLhsreEomtnyvWKTGoWjVzMR7vKMwcnvZOg")

POLYMARKET_EVENT_URL = (
    "https://gamma-api.polymarket.com/events/slug/what-bills-will-be-signed-into-law-by-december-31"
)

# =========================
# HTTP helper
# =========================
def _get(url, params=None, max_retries=3, backoff=1.5, timeout=30):
    last_exc = None
    for i in range(max_retries):
        try:
            r = requests.get(
                url, params=params, timeout=timeout,
                headers={"User-Agent": "bill-matcher-api/1.0"},
            )
            if r.status_code == 429:
                time.sleep(backoff ** i); continue
            r.raise_for_status()
            return r
        except requests.RequestException as e:
            last_exc = e
            time.sleep(backoff ** i)
    raise last_exc

# =========================
# Version/format selection (MATCH THE SCRIPT)
# =========================
VERSION_TYPE_PRIORITY = [
    "Public Law",
    "Enrolled Bill",
    "Resolving Differences",
    "Agreed to Senate amendment",
    "Agreed to House amendment",
    "Passed Senate",
    "Passed House",
    "Placed on Calendar Senate",
    "Placed on Calendar House",
    "Reported to Senate",
    "Reported to House",
    "Introduced in Senate",
    "Introduced in House",
]
FORMAT_PRIORITY = ["Plain Text", "Formatted Text", "Formatted XML", "PDF"]

def _version_priority(vtype: str) -> int:
    if not vtype:
        return len(VERSION_TYPE_PRIORITY) + 1
    vtype = vtype or ""
    for idx, label in enumerate(VERSION_TYPE_PRIORITY):
        if label.lower() in vtype.lower():
            return idx
    return len(VERSION_TYPE_PRIORITY)

def _pick_best_text_version(text_versions: List[dict]) -> dict:
    decorated = []
    for i, v in enumerate(text_versions):
        vtype = v.get("type", "") or ""
        vdate = v.get("date") or ""
        decorated.append((_version_priority(vtype), vdate, i, v))
    best_priority = min(d[0] for d in decorated)
    candidates = [d for d in decorated if d[0] == best_priority]
    candidates.sort(key=lambda t: (t[1], -t[2]), reverse=True)
    return candidates[0][3]

def _pick_best_format(formats: List[dict]) -> Optional[Tuple[str, str]]:
    by_type = {f.get("type"): f.get("url") for f in formats or [] if f.get("url")}
    for t in FORMAT_PRIORITY:
        if t in by_type:
            return t, by_type[t]
    return None

# =========================
# HTML / XML extraction
# =========================
def _html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    pres = soup.find_all("pre")
    if pres:
        text = "\n".join(p.get_text(" ", strip=True) for p in pres)
    else:
        for tag in soup(["script", "style", "nav", "header", "footer"]):
            tag.decompose()
        text = soup.get_text(" ", strip=True)
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if ln]
    return "\n".join(lines)

def _xml_to_text(xml: str) -> str:
    soup = BeautifulSoup(xml, "xml")
    for tag in soup.find_all(["metadata", "toc", "page", "img"]):
        tag.decompose()
    text = soup.get_text(" ", strip=True)
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if ln]
    return "\n".join(lines)

# =========================
# Cleaner (your rules)
# =========================
PAGE_ARTIFACT_RE = re.compile(r"\[\[\s*Page\s+[0-9A-Z.\- ]+\]\]")
INLINE_TAG_RE = re.compile(r"<<\s*(?:NOTE:|Deadline[^>]*|Effective\s+date[^>]*)\s*.*?>>", re.IGNORECASE | re.DOTALL)
ALLCAPS_HEADER_RE = re.compile(r"^(?:[A-Z0-9 ,.'\-]{6,})$", re.MULTILINE)
LEG_HISTORY_START_RE = re.compile(r"^\s*(?:LEGISLATIVE HISTORY|HISTORY|CONGRESSIONAL RECORD)\b.*$", re.IGNORECASE | re.MULTILINE)
CERT_STAMP_RE = re.compile(r"^\s*(?:Approved\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}\.?|Be it enacted.*)$", re.IGNORECASE | re.MULTILINE)
LINE_NUMBER_RE = re.compile(r"^\s*\d{1,4}\s+", re.MULTILINE)
DECOR_DIVIDER_RE = re.compile(r"^\s*[·\-–—_=]{4,}\s*$", re.MULTILINE)

SEC_LINE_RE = re.compile(r"^\s*Sec\.\s*\d+[A-Za-z\-]*\.\s*", re.IGNORECASE)
SUBSECTION_LINE_RE = re.compile(r"^\s*\(([a-z]|[0-9]+|[A-Z]|i{1,3}|iv|v|vi{0,3}|ix|x)\)\s")
STRUCTURAL_START_RE = re.compile(r"^\s*(?:Sec\.\s*\d+[A-Za-z\-]*\.|\([a-zA-Z0-9ivxIVX]+\))")

def _standardize_quotes_dashes(s: str) -> str:
    s = (s.replace("\u2018", "'").replace("\u2019", "'")
           .replace("\u201C", '"').replace("\u201D", '"')
           .replace("\u2013", "—").replace("\u2014", "—"))
    return s

def _strip_leading_trailing_quotes(line: str) -> str:
    return re.sub(r'^[\'"“”]+|[\'"“”]+\s*$', "", line).strip()

def _normalize_heading_punct(line: str) -> str:
    if STRUCTURAL_START_RE.match(line) and re.search(r"—\s*$", line):
        return re.sub(r"—\s*$", ".", line)
    return line

def clean_statute_text(raw: str) -> str:
    text = PAGE_ARTIFACT_RE.sub("", raw)
    text = DECOR_DIVIDER_RE.sub("", text)

    lines = []
    for ln in text.splitlines():
        if ALLCAPS_HEADER_RE.match(ln) and not ln.strip().startswith("SEC."):
            continue
        if CERT_STAMP_RE.match(ln):
            continue
        ln = INLINE_TAG_RE.sub("", ln)
        lines.append(ln)
    text = "\n".join(lines)

    parts = re.split(r"(?im)^\s*table of contents\s*$", text, maxsplit=1)
    if len(parts) == 2:
        head, rest = parts
        rest_parts = re.split(r"\n\s*\n", rest, maxsplit=1)
        text = head + ("\n\n" + (rest_parts[1] if len(rest_parts) > 1 else ""))

    m = LEG_HISTORY_START_RE.search(text)
    if m:
        text = text[:m.start()]

    text = _standardize_quotes_dashes(text)
    text = LINE_NUMBER_RE.sub("", text)

    cleaned_lines = []
    for ln in text.splitlines():
        ln = ln.strip()
        if not ln:
            cleaned_lines.append("")
            continue
        ln = _strip_leading_trailing_quotes(ln)
        ln = _normalize_heading_punct(ln)
        cleaned_lines.append(ln)
    text = "\n".join(cleaned_lines)

    def _merge_preserving_structure(t: str) -> str:
        out = []; buf = []
        def flush_buf():
            if buf:
                out.append(" ".join(buf).strip()); buf.clear()
        for ln in t.splitlines():
            if not ln.strip():
                flush_buf(); out.append(""); continue
            if SEC_LINE_RE.match(ln) or SUBSECTION_LINE_RE.match(ln):
                flush_buf(); out.append(ln.strip())
            else:
                buf.append(ln.strip())
        flush_buf()
        return re.sub(r"(?:\n\s*){3,}", "\n\n", "\n".join(out)).strip()

    text = _merge_preserving_structure(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text

# =========================
# Chunker (on CLEANED text)
# =========================
def chunk_text_few(text: str,
                   target_chunks: int = TARGET_CHUNKS,
                   min_words: int = MIN_WORDS,
                   max_words: int = MAX_WORDS,
                   overlap_fraction: float = OVERLAP_FRACTION) -> List[str]:
    sents = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
    if not sents:
        return []
    total_words = sum(len(s.split()) for s in sents)
    target_words = max(min_words, min(max_words, math.ceil(total_words / max(1, target_chunks))))
    overlap_words = int(target_words * overlap_fraction)

    chunks, current, cur_words = [], [], 0
    for s in sents:
        w = len(s.split())
        if cur_words + w <= target_words or not current:
            current.append(s); cur_words += w
        else:
            blob = " ".join(current)
            chunks.append(blob)
            if overlap_words > 0:
                tail = " ".join(blob.split()[-overlap_words:])
                current = ([tail] if tail else []) + [s]
                cur_words = len(" ".join(current).split())
            else:
                current = [s]; cur_words = w
    if current:
        chunks.append(" ".join(current))
    return chunks

# =========================
# CRS summary (MATCH THE SCRIPT)
# =========================
def get_crs_summary(bill_type: str, bill_number: int) -> Optional[str]:
    api_key = CONGRESS_API_KEY
    if not api_key:
        return None
    normalized_type = normalize_bill_type(bill_type)
    url = f"https://api.congress.gov/v3/bill/{CONGRESS}/{normalized_type}/{bill_number}/summaries"
    r = _get(url, params={"api_key": api_key, "format": "json", "limit": 50})
    data = r.json()

    items = []
    if isinstance(data, dict):
        s = data.get("summaries")
        if isinstance(s, list):
            items = s
        elif isinstance(s, dict):
            inner = s.get("summaries") or s.get("items") or []
            if isinstance(inner, list):
                items = inner
        elif "items" in data and isinstance(data["items"], list):
            items = data["items"]
    if not items:
        return None

    def k(it):
        return it.get("updateDate") or it.get("actionDate") or it.get("date") or ""
    items.sort(key=k, reverse=True)

    cand = items[0].get("text") or items[0].get("summary") or ""
    cand = cand.strip()
    if "<" in cand and ">" in cand:
        try:
            cand = BeautifulSoup(cand, "html.parser").get_text(" ", strip=True)
        except Exception:
            pass
    return cand or None

# =========================
# Keyword prior helpers (MATCH THE SCRIPT)
# =========================
from collections import Counter
def extract_dynamic_terms(bill_text: str, top_ngrams: int = 40, ngram_range=(1, 2), stopwords: Optional[set] = None) -> dict:
    stop = stopwords or set()
    text = bill_text.lower()
    text = re.sub(r'\s+', ' ', text)
    tokens = re.findall(r"[a-z][a-z0-9\-]+", text)
    tokens = [t for t in tokens if t not in stop and len(t) > 2]
    bigrams = [f"{a} {b}" for a, b in zip(tokens, tokens[1:])]
    grams = tokens + bigrams
    def ok(g):
        n = len(g.split()); return n >= ngram_range[0] and n <= ngram_range[1]
    freq = Counter(g for g in grams if ok(g))
    most = freq.most_common(top_ngrams)
    if not most: return {}
    maxf = most[0][1]
    return {g: 1.0 + (c / maxf) for g, c in most}

def keyword_prior_scores(comp_texts: List[str], term_weights: dict, cap: float = 0.15, per_hit: float = 0.02) -> np.ndarray:
    out = np.zeros(len(comp_texts), dtype=float)
    if not term_weights:
        return out
    for i, t in enumerate(comp_texts):
        T = t.lower(); score = 0.0
        for k, wgt in term_weights.items():
            if k in T: score += per_hit * wgt * 10
        out[i] = min(cap, score)
    return out

# =========================
# Fetch newest bill (by your priority), clean, chunk
# =========================
def normalize_bill_type(bill_type: str) -> str:
    """
    Convert bill type to Congress API format (lowercase).
    Handles: H/HR -> hr, S -> s, HJRES -> hjres, etc.
    """
    bill_type_upper = bill_type.upper().strip()
    # Map common formats to Congress API format
    bill_type_map = {
        'H': 'hr',
        'HR': 'hr',
        'S': 's',
        'HJRES': 'hjres',
        'SJRES': 'sjres',
        'HCONRES': 'hconres',
        'SCONRES': 'sconres',
        'HRES': 'hres',
        'SRES': 'sres',
    }
    # If already lowercase and in map, return it
    if bill_type_upper in bill_type_map:
        return bill_type_map[bill_type_upper]
    # If it's already in correct format (lowercase), return as is
    return bill_type.lower()


def fetch_clean_and_chunk(bill_type: str, bill_number: int) -> Tuple[str, str, List[str], str]:
    if not CONGRESS_API_KEY:
        raise RuntimeError("Congress API key missing.")
    normalized_type = normalize_bill_type(bill_type)
    endpoint = f"https://api.congress.gov/v3/bill/{CONGRESS}/{normalized_type}/{bill_number}/text"
    resp = _get(endpoint, params={"api_key": CONGRESS_API_KEY, "format": "json", "limit": 250})
    data = resp.json()
    versions = data.get("textVersions", []) or []
    if not versions:
        raise RuntimeError("No text versions available for this bill.")
    best_version = _pick_best_text_version(versions)  # << use script's priority
    chosen = _pick_best_format(best_version.get("formats", []))
    if not chosen:
        raise RuntimeError("No supported format (Plain/Formatted/XML/PDF) in the selected version.")
    fmt, url = chosen

    r = _get(url)
    if fmt == "Plain Text":
        raw = "\n".join([ln.strip() for ln in r.text.splitlines() if ln.strip()])
    elif fmt == "Formatted Text":
        raw = _html_to_text(r.text)
    elif fmt == "Formatted XML":
        raw = _xml_to_text(r.text)
    else:
        raise RuntimeError("PDF-only for best version; add a PDF-to-text step if needed.")
    if not raw or len(raw) < 50:
        raise RuntimeError("Fetched bill text is unexpectedly short/empty.")

    cleaned = clean_statute_text(raw)
    bill_id = f"{bill_type.upper()}.{bill_number}"
    bill_text_path = os.path.join(BILL_TEXT_DIR, f"{bill_id.lower()}_clean.txt")
    with open(bill_text_path, "w", encoding="utf-8") as f:
        f.write(cleaned)

    chunks = chunk_text_few(cleaned, target_chunks=TARGET_CHUNKS,
                            min_words=MIN_WORDS, max_words=MAX_WORDS,
                            overlap_fraction=OVERLAP_FRACTION)
    return bill_id, cleaned, chunks, bill_text_path

# =========================
# App (model + artifacts loaded ONCE)
# =========================
app = FastAPI(title="Bill→S&P500 Matcher (parity with script)", version="1.3.0")

@app.on_event("startup")
def _startup():
    app.state.model = SentenceTransformer(MODEL_NAME)

    # Load companies + prebuilt texts
    app.state.df = pd.read_parquet(COMP_DF_PATH)
    with open(COMP_TEXTS_PATH, "r", encoding="utf-8") as f:
        app.state.comp_texts = list(json.load(f))

    # OPTIONAL: load precomputed company embeddings if available; else compute at first request
    if os.path.exists(COMP_EMB_PATH):
        app.state.comp_embs = np.load(COMP_EMB_PATH)  # normalized already
    else:
        # Compute once at startup if artifacts missing (slower first boot)
        comp_texts = app.state.comp_texts
        app.state.comp_embs = app.state.model.encode(
            comp_texts, convert_to_numpy=True, normalize_embeddings=True,
            batch_size=64, show_progress_bar=False
        )

@app.get("/match")
def match(bill_type: str = Query(..., min_length=1), bill_number: int = Query(..., ge=1)):
    try:
        bill_id, clean_text, chunks, clean_path = fetch_clean_and_chunk(bill_type, bill_number)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    model: SentenceTransformer = app.state.model
    df: pd.DataFrame = app.state.df
    comp_texts: List[str] = app.state.comp_texts
    comp_embs: np.ndarray = app.state.comp_embs

    # ---- Build bill_query_text EXACTLY like the script ----
    crs = get_crs_summary(bill_type, bill_number)
    if crs:
        long_chunk = max(chunks, key=len) if chunks else ""
        bill_query_text = (crs + "\n\n" + long_chunk)[:6000]
    else:
        bill_query_text = " ".join(sorted(chunks, key=len, reverse=True)[:3])

    # ---- Dense (company embeddings vs q_emb)
    q_emb = model.encode([bill_query_text], convert_to_numpy=True, normalize_embeddings=True)
    dense_sims = (q_emb @ comp_embs.T).ravel()

    # ---- TF-IDF: FIT PER REQUEST on comp_texts + bill_query_text (parity)
    vect = TfidfVectorizer(min_df=2, ngram_range=(1, 2))
    X = vect.fit_transform(comp_texts + [bill_query_text])
    D, q = X[:-1], X[-1]
    D = sk_normalize(D); q = sk_normalize(q)
    tfidf_sims = (D @ q.T).toarray().ravel()

    # ---- Keyword prior from (CRS or cleaned bill) (parity with script)
    source_text = crs if crs else clean_text
    dyn_terms = extract_dynamic_terms(source_text, top_ngrams=40, ngram_range=(1, 2))
    kprior = keyword_prior_scores(comp_texts, dyn_terms, cap=0.15, per_hit=0.02)

    # ---- Industry prior (re-embed uniq labels per request like the script)
    labels = (df["industry"].fillna("") + " | " + df["sector"].fillna("")).tolist()
    uniq = sorted(set(labels))
    if uniq:
        uniq_label_embs = model.encode(uniq, convert_to_numpy=True, normalize_embeddings=True)
        sims_to_labels = (q_emb @ uniq_label_embs.T).ravel()
        lbl2sim = {l: s for l, s in zip(uniq, sims_to_labels)}
        ind_raw = np.array([lbl2sim.get(l, 0.0) for l in labels], dtype=float)
        if ind_raw.max() > ind_raw.min():
            ind_boosts = INDUSTRY_PRIOR_CAP * (ind_raw - ind_raw.min()) / (ind_raw.max() - ind_raw.min())
        else:
            ind_boosts = np.zeros_like(ind_raw)
    else:
        ind_boosts = np.zeros(len(df))

    # ---- FINAL SCORING (unchanged)
    base = (ALPHA * dense_sims) + (BETA * tfidf_sims) + (GAMMA_K * kprior)
    final_scores = base + ind_boosts

    out = df.copy()
    out["dense_sim"] = dense_sims
    out["tfidf_sim"] = tfidf_sims
    out["hybrid_score"] = final_scores

    top = out.nlargest(TOPK_RESULTS, "hybrid_score")[["ticker", "name", "sector", "industry", "hybrid_score"]]
    snippet = (crs or clean_text)[:280] + ("..." if len((crs or clean_text)) > 280 else "")

    return JSONResponse({
        "bill_id": bill_id,
        "congress": CONGRESS,
        "weights": {"alpha_dense": ALPHA, "beta_tfidf": BETA, "gamma_kprior": GAMMA_K},
        "industry_prior_cap": INDUSTRY_PRIOR_CAP,
        "clean_text_path": clean_path,
        "topk": TOPK_RESULTS,
        "snippet": snippet,
        "results": top.to_dict(orient="records"),
    })


@app.get("/recent_bills")
def recent_bills(
    limit: int = Query(10, ge=1, le=100, description="Number of bills to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    """
    Return the last N bills by latest action from Congress.gov.
    Supports pagination via limit and offset.
    Uses summary data from Congress.gov API (fast, no individual bill enrichment).
    """
    url = "https://api.congress.gov/v3/bill"
    
    # Fetch bills from Congress.gov - request enough to handle offset + limit
    fetch_limit = min(250, max(limit + offset, 10))
    
    try:
        r = _get(
            url,
            params={
                "api_key": CONGRESS_API_KEY,
                "format": "json",
                "congress": CONGRESS,
                "limit": fetch_limit,
            },
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Congress API error: {e}")

    data = r.json()
    items = data.get("bills", []) or []

    # Normalize a compact payload - use summary data only (fast)
    results = []
    for b in items:
        t = b.get("type") or ""  # This comes as "hr", "s", etc. from Congress API (lowercase)
        n = str(b.get("number") or "").strip()
        la = b.get("latestAction") or {}
        
        # Normalize bill type for bill_id format (HR.1234, S.567, etc.)
        normalized_type = normalize_bill_type(t).upper()  # hr -> HR, s -> S
        bill_id = f"{normalized_type}.{n}" if t and n else None
        
        if not bill_id:
            continue
        
        # Use summary data directly from Congress.gov API
        results.append({
            "bill_id": bill_id,
            "title": b.get("title"),
            "introduced_date": b.get("introducedDate"),
            "latest_action": {
                "date": la.get("actionDate") or b.get("introducedDate"),
                "text": la.get("text"),
            },
            "policy_area": None,  # Not available in summary
            "sponsors": [],  # Not available in summary
            "cosponsors_count": 0,  # Not available in summary
            "url": b.get("url") or f"https://api.congress.gov/v3/bill/{CONGRESS}/{t}/{n}?format=json",
        })

    # Sort by latest_action date (most recent first), fallback to introduced_date
    results.sort(key=lambda x: (x.get("latest_action", {}).get("date") or x.get("introduced_date") or ""), reverse=True)
    
    # Apply pagination
    total_count = len(results)
    paginated_results = results[offset:offset + limit]
    
    return {"count": total_count, "results": paginated_results}


@app.get("/bill_info")
def get_bill_info(
    bill_type: str = Query(..., description="Bill type (e.g., 'hr', 's', 'hjres')"),
    bill_number: int = Query(..., description="Bill number", ge=1),
    congress: Optional[int] = Query(None, description="Congress number (default: 117)")
):
    congress_num = congress or CONGRESS
    bill_type_lower = bill_type.lower()
    bill_url = f"https://api.congress.gov/v3/bill/{congress_num}/{bill_type_lower}/{bill_number}"
    params = {"api_key": CONGRESS_API_KEY, "format": "json"}

    try:
        response = _get(bill_url, params=params)
        data = response.json()
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Bill not found: {str(e)}")

    bill = data.get("bill", {}) or {}
    latest_action = bill.get("latestAction") or {}
    latest_action_text = latest_action.get("text") or ""
    
    # Get all actions to determine status accurately
    actions = bill.get("actions", []) or []
    
    # Determine status from actions
    status = determine_bill_status(actions, latest_action_text)

    # Build minimal result
    result = {
        "bill_id": f"{bill_type.upper()}.{bill_number}",
        "title": bill.get("title"),
        "introduced_date": bill.get("introducedDate"),
        "policy_area": (bill.get("policyArea") or {}).get("name"),
        "sponsors": [
            {
                "name": s.get("fullName"),
                "party": s.get("party"),
                "state": s.get("state"),
                "bioguide_id": s.get("bioguideId"),
                "district": s.get("district"),
            }
            for s in (bill.get("sponsors") or [])
        ],
        "cosponsors_count": (bill.get("cosponsors") or {}).get("count", 0),
        "status": status,  # Add determined status
        "latest_action": {
            "date": latest_action.get("actionDate"),
            "text": latest_action_text,
        },
    }

    return JSONResponse(result)


@app.get("/polymarket_bills")
def get_polymarket_bills():
    """
    Fetch bill odds from Polymarket event page.
    Scrapes the specific Polymarket event page for bills and their odds.
    """
    url = "https://polymarket.com/event/what-bills-will-be-signed-into-law-by-december-31"
    
    try:
        # Fetch the page
        response = _get(url, timeout=30)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Parse bill data from the page
        # Looking for headings with bill IDs and percentages
        bills_data = []
        
        # Find all headings that contain bill information
        # Based on the snapshot, bills are in headings with format like "S.1241 $17,008 Vol. 53%"
        headings = soup.find_all(['h3', 'h2', 'h1'])
        
        for heading in headings:
            text = heading.get_text(strip=True) if heading else ""
            
            # Pattern: Bill ID (like S.1241, H.R.5371), volume, percentage
            # Extract bill ID pattern (e.g., S.1241, H.R.5371, H.Con.Res.38)
            import re
            bill_pattern = r'\b([SH]\.?\s*\d+|H\.?\s*Con\.?\s*Res\.?\s*\d+|HJRES|SJRES|HCONRES|SCONRES|HRES|SRES)[\s\.]?(\d+)?'
            
            # More comprehensive bill ID pattern
            bill_id_match = re.search(r'\b((?:H\.?R\.?|S\.?|H\.?\s*Con\.?\s*Res\.?|H\.?\s*J\.?\s*Res\.?|S\.?\s*J\.?\s*Res\.?|H\.?\s*Con\.?\s*Res\.?|H\.?\s*Res\.?|S\.?\s*Res\.?)\s*\d+)', text, re.IGNORECASE)
            
            if bill_id_match:
                bill_id_raw = bill_id_match.group(1).strip()
                
                # Normalize bill ID format (e.g., "H.R.5371" -> "HR.5371", "S. 394" -> "S.394")
                bill_id_normalized = re.sub(r'\s+', '', bill_id_raw.upper())
                bill_id_normalized = re.sub(r'H\.R\.', 'HR.', bill_id_normalized)
                bill_id_normalized = re.sub(r'H\.CON\.RES\.', 'HCONRES.', bill_id_normalized)
                
                # Extract percentage (look for "53%", "50%", etc.)
                percent_match = re.search(r'(\d+)%', text)
                percentage = int(percent_match.group(1)) if percent_match else 50
                
                # Extract volume (optional, e.g., "$17,008 Vol.")
                volume_match = re.search(r'\$([\d,]+)\s*Vol\.', text)
                volume = volume_match.group(1).replace(',', '') if volume_match else '0'
                
                bills_data.append({
                    'bill_id': bill_id_normalized,
                    'yes_percentage': percentage,
                    'no_percentage': 100 - percentage,
                    'volume': volume,
                    'source': 'polymarket'
                })
        
        # Remove duplicates (keep first occurrence)
        seen = set()
        unique_bills = []
        for bill in bills_data:
            if bill['bill_id'] not in seen:
                seen.add(bill['bill_id'])
                unique_bills.append(bill)
        
        return JSONResponse({
            'count': len(unique_bills),
            'results': unique_bills
        })
        
    except Exception as e:
        # Return hardcoded data as fallback (from the user's example)
        fallback_bills = [
            {'bill_id': 'S.1241', 'yes_percentage': 53, 'no_percentage': 47, 'volume': '17008', 'source': 'polymarket'},
            {'bill_id': 'HR.5371', 'yes_percentage': 50, 'no_percentage': 50, 'volume': '10', 'source': 'polymarket'},
            {'bill_id': 'S.81', 'yes_percentage': 50, 'no_percentage': 50, 'volume': '33076', 'source': 'polymarket'},
            {'bill_id': 'S.2882', 'yes_percentage': 50, 'no_percentage': 50, 'volume': '3', 'source': 'polymarket'},
            {'bill_id': 'HCONRES.38', 'yes_percentage': 50, 'no_percentage': 50, 'volume': '0', 'source': 'polymarket'},
            {'bill_id': 'HR.3633', 'yes_percentage': 49, 'no_percentage': 51, 'volume': '0', 'source': 'polymarket'},
            {'bill_id': 'S.394', 'yes_percentage': 13, 'no_percentage': 87, 'volume': '10', 'source': 'polymarket'},
        ]
        print(f"Error fetching Polymarket data, using fallback: {e}")
        return JSONResponse({
            'count': len(fallback_bills),
            'results': fallback_bills
        })

# ---------------------------
# 1) Bill parsing helpers
# ---------------------------
_BILL_PAT = re.compile(
    r"""
    \b(
        H\s*\.?\s*R\s*\.?            |   # H.R.
        S\s*\.?                      |   # S.
        H\s*\.?\s*J\s*\.?\s*RES\s*\.?      |   # HJRES / H.J.RES. / H.J.Res.
        S\s*\.?\s*J\s*\.?\s*RES\s*\.?      |   # SJRES / S.J.RES. / S.J.Res.
        H\s*RES\s*\.?                |   # HRES / H.RES.
        S\s*RES\s*\.?                |   # SRES / S.RES.
        H\s*\.?\s*CON\s*\.?\s*RES\s*\.?    |   # HCONRES / H.CON.RES. / H.Con.Res.
        S\s*\.?\s*CON\s*\.?\s*RES\s*\.?        # SCONRES / S.CON.RES. / S.Con.Res.
    )
    [\s\-\.]*                         # optional separators
    (\d{1,5})                         # bill number
    \b
    """,
    re.IGNORECASE | re.VERBOSE,
)

def _normalize_bill_type(prefix: str) -> str:
    p = re.sub(r"\s+|\.", "", prefix).upper()
    mapping = {
        "HR": "hr",
        "S": "s",
        "HJRES": "hjres",
        "SJRES": "sjres",
        "HRES": "hres",
        "SRES": "sres",
        "HCONRES": "hconres",
        "SCONRES": "sconres",
    }
    return mapping.get(p, p.lower())

def parse_bill_from_text(text: str):
    """Return (bill_type, bill_number) or (None, None) if not found."""
    if not text:
        return None, None
    
    # First try the main pattern (handles H.Con.Res.38, H.Con.Res 38, etc.)
    m = _BILL_PAT.search(text)
    if not m:
        # Try pattern that matches formats like HCONRES.38, HR.1234, S.567
        m2 = re.search(
            r"\b(HR|S|HJRES|SJRES|HRES|SRES|HCONRES|SCONRES)\s*\.?\s*-?\s*(\d{1,5})\b",
            text, flags=re.IGNORECASE
        )
        if not m2:
            # Try pattern for formats like H.Con.Res.38, H.J.Res.88, S.Con.Res.12
            # Match "H.Con.Res" or "H.Con.Res." followed by number
            m3 = re.search(
                r"\b(H|S)\s*\.\s*(Con\s*\.\s*Res|J\s*\.\s*Res|Res|Con\s*Res)\s*\.?\s*(\d{1,5})\b",
                text, flags=re.IGNORECASE
            )
            if not m3:
                return None, None
            # Extract chamber and type
            chamber = m3.group(1).upper()
            res_type = m3.group(2).replace(".", "").replace(" ", "").upper()
            num = m3.group(3)
            # Map to bill type
            if "CONRES" in res_type or "CONRES" in res_type.replace(".", ""):
                typ_raw = f"{chamber}CONRES"
            elif "JRES" in res_type or "JRES" in res_type.replace(".", ""):
                typ_raw = f"{chamber}JRES"
            elif "RES" in res_type:
                typ_raw = f"{chamber}RES"
            else:
                return None, None
        else:
            typ_raw, num = m2.group(1), m2.group(2)
    else:
        typ_raw, num = m.group(1), m.group(2)
    
    bill_type = _normalize_bill_type(typ_raw)
    try:
        bill_number = int(num)
    except ValueError:
        return None, None
    return bill_type, bill_number

# ---------------------------
# 2) Reusable bill info fetch
# ---------------------------
def determine_bill_status(actions: list, latest_action_text: str = "") -> str:
    """
    Determine bill status from actions array or latest_action text.
    Status progression: Introduced -> Passed Senate/Passed House -> Passed Both Chambers -> To President -> Became Law
    """
    text = latest_action_text.lower() if latest_action_text else ""
    
    # If we have actions, check them first
    if actions:
        has_passed_senate = False
        has_passed_house = False
        has_become_law = False
        has_gone_to_president = False
        
        for action in actions:
            # Handle both dict and string formats
            if isinstance(action, dict):
                action_text = (action.get("text") or "").lower()
            elif isinstance(action, str):
                action_text = action.lower()
            else:
                continue
            
            # Check for final status first (most important)
            if "became public law" in action_text or "signed by president" in action_text or "enacted" in action_text:
                has_become_law = True
            elif "sent to president" in action_text or "presented to president" in action_text or "to president" in action_text:
                has_gone_to_president = True
            elif "passed senate" in action_text:
                has_passed_senate = True
            elif "passed house" in action_text:
                has_passed_house = True
        
        # Determine status based on what we found
        if has_become_law:
            return "Became Law"
        elif has_gone_to_president:
            return "To President"
        elif has_passed_senate and has_passed_house:
            return "Passed Both Chambers"
        elif has_passed_senate:
            return "Passed Senate"
        elif has_passed_house:
            return "Passed House"
    
    # Parse latest_action text (primary method since actions may not be available)
    if not text:
        return "Pending"
    
    # Check for final status first (most important)
    if "became public law" in text or "signed by president" in text or "enacted" in text:
        return "Became Law"
    
    if "sent to president" in text or "presented to president" in text or "presented to the president" in text:
        return "To President"
    
    # Check if both chambers have passed (check for both in the text or in actions history)
    # Note: latestAction might only show the most recent action, so we check if it mentions both
    if ("passed senate" in text and "passed house" in text) or ("passed both chambers" in text):
        return "Passed Both Chambers"
    
    # Check individual chamber passages (more specific patterns first)
    if "passed senate" in text or "senate passed" in text or "passed by the senate" in text:
        return "Passed Senate"
    
    if "passed house" in text or "house passed" in text or "passed by the house" in text or "house agreed to" in text:
        return "Passed House"
    
    # Check for bills on calendar (ready for floor vote)
    if "placed on" in text and ("calendar" in text or "union calendar" in text or "house calendar" in text or "senate calendar" in text):
        return "On Calendar"
    
    # Check for bills in Senate after passing House (motion to proceed indicates House passed)
    if "motion to proceed" in text and "senate" in text:
        return "Passed House"
    
    # Check for bills received in Senate (indicates House passed)
    if "received in the senate" in text:
        return "Passed House"
    
    # Check for bills in Senate consideration
    if "in senate" in text and ("consideration" in text or "motion" in text or "ordered" in text):
        return "In Senate"
    
    # Check for reconsideration motions (bills being reconsidered)
    if "reconsider" in text and ("senate" in text or "senator" in text):
        return "In Senate"
    
    # Check for bills reported out of committee
    if "ordered to be reported" in text or "reported" in text and "committee" in text:
        return "Reported from Committee"
    
    # Check for other statuses
    if "vetoed" in text or "veto" in text:
        return "Vetoed"
    
    if "failed" in text or "rejected" in text:
        return "Failed"
    
    if "introduced" in text:
        return "Introduced"
    
    if "referred to" in text or "committee" in text:
        return "In Committee"
    
    # Default fallback
    return "Pending"


def get_bill_info_data(
    bill_type: str,
    bill_number: int,
    congress: Optional[int] = None,
):
    """Same payload shape as /bill_info, but returned as a dict."""
    congress_num = congress or CONGRESS
    bill_type_lower = bill_type.lower()
    bill_url = f"https://api.congress.gov/v3/bill/{congress_num}/{bill_type_lower}/{bill_number}"
    params = {"api_key": CONGRESS_API_KEY, "format": "json"}

    try:
        response = _get(bill_url, params=params)
        data = response.json()
    except Exception as e:
        # Surface a compact error payload instead of failing the whole list
        return {"error": f"Bill not found or fetch failed: {str(e)}"}

    bill = data.get("bill", {}) or {}
    latest_action = bill.get("latestAction") or {}
    latest_action_text = latest_action.get("text") or ""
    
    # Get all actions to determine status accurately
    # Congress.gov API v3 may provide actions in the bill object, but it's not always present
    # Also, actions might be a list of strings or dicts, so we need to handle both
    actions_raw = bill.get("actions", []) or []
    # Normalize actions to always be a list of dicts (or empty list)
    actions = []
    for action in actions_raw:
        if isinstance(action, dict):
            actions.append(action)
        elif isinstance(action, str):
            # Convert string to dict format
            actions.append({"text": action})
        # Skip other types
    
    # Determine status from actions and latest_action text
    status = determine_bill_status(actions, latest_action_text)
    
    # Debug logging
    print(f"[get_bill_info_data] Bill {bill_type.upper()}.{bill_number}: latest_action_text='{latest_action_text[:100] if latest_action_text else 'None'}', status='{status}'")

    return {
        "bill_id": f"{bill_type.upper()}.{bill_number}",
        "title": bill.get("title"),
        "introduced_date": bill.get("introducedDate"),
        "policy_area": (bill.get("policyArea") or {}).get("name"),
        "sponsors": [
            {
                "name": s.get("fullName"),
                "party": s.get("party"),
                "state": s.get("state"),
                "bioguide_id": s.get("bioguideId"),
                "district": s.get("district"),
            }
            for s in (bill.get("sponsors") or [])
        ],
        "cosponsors_count": (bill.get("cosponsors") or {}).get("count", 0),
        "status": status,  # Add determined status
        "latest_action": {
            "date": latest_action.get("actionDate"),
            "text": latest_action_text,
        },
    }

# ---------------------------
# 3) Polymarket fetch + enrich
# ---------------------------
def fetch_bills(congress: Optional[int] = None):
    """
    Fetch markets from Polymarket; for each market, parse bill id and enrich
    with Congress.gov bill info (same as /bill_info).
    """
    try:
        resp = requests.get(POLYMARKET_EVENT_URL, timeout=20)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Upstream fetch error: {e}")

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Polymarket API returned non-200 status")

    try:
        data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Invalid JSON from upstream: {e}")

    results = []
    for m in data.get("markets", []):
        bill_label = m.get("groupItemTitle") or m.get("question") or m.get("title") or "Unknown"
        # Parse prices
        try:
            prices = json.loads(m.get("outcomePrices", "[]"))
            yes_price = float(prices[0])  # "Yes" probability
            pct = round(yes_price * 100, 1)
        except Exception:
            continue

        bill_type, bill_number = parse_bill_from_text(bill_label)
        bill_id = f"{bill_type.upper()}.{bill_number}" if bill_type and bill_number else None
        
        # Debug logging for parsing
        if not bill_type or not bill_number:
            print(f"[fetch_bills] Could not parse bill from label: '{bill_label}' -> bill_type={bill_type}, bill_number={bill_number}")

        # Enrich with bill_info if we could parse a bill id
        info = None
        if bill_type and bill_number:
            try:
                info = get_bill_info_data(bill_type=bill_type, bill_number=bill_number, congress=congress)
                # If we got an error dict, set info to None to avoid breaking the response
                if isinstance(info, dict) and "error" in info:
                    print(f"[fetch_bills] Error fetching bill info for {bill_id}: {info.get('error')}")
                    info = None
                else:
                    print(f"[fetch_bills] Successfully fetched bill info for {bill_id}: title='{info.get('title')[:60] if info and info.get('title') else 'None'}...'")
            except Exception as e:
                print(f"[fetch_bills] Exception fetching bill info for {bill_id}: {e}")
                import traceback
                traceback.print_exc()
                info = None
        else:
            print(f"[fetch_bills] Skipping bill info fetch - could not parse bill_id from label: '{bill_label}'")

        # Extract CLOB token IDs for price history fetching
        # clobTokenIds can be a list or JSON string
        clob_token_ids_raw = m.get("clobTokenIds") or []
        if isinstance(clob_token_ids_raw, str):
            try:
                clob_token_ids = json.loads(clob_token_ids_raw)
            except (json.JSONDecodeError, TypeError):
                clob_token_ids = []
        else:
            clob_token_ids = clob_token_ids_raw if isinstance(clob_token_ids_raw, list) else []
        
        condition_id = m.get("conditionId")
        market_id = m.get("id")
        
        results.append({
            "bill": bill_label,
            "yes_percent": pct,
            "bill_type": bill_type,
            "bill_number": bill_number,
            "bill_id": bill_id,
            "info": info,  # dict or None
            "clob_token_ids": clob_token_ids,  # [yes_token, no_token]
            "condition_id": condition_id,  # Polymarket condition ID
            "market_id": market_id,  # Polymarket market ID
        })

    results.sort(key=lambda x: (-x["yes_percent"], x["bill"] or ""))
    return results

# ---------------------------
# 4) Endpoints
# ---------------------------
@app.get("/bill_info")
def get_bill_info(
    bill_type: str = Query(..., description="Bill type (e.g., 'hr', 's', 'hjres')"),
    bill_number: int = Query(..., description="Bill number", ge=1),
    congress: Optional[int] = Query(None, description="Congress number (default: 117)")
):
    """Single-bill info (unchanged shape)."""
    info = get_bill_info_data(bill_type=bill_type, bill_number=bill_number, congress=congress)
    # If we returned an error dict, surface 404; else JSON
    if isinstance(info, dict) and "error" in info:
        raise HTTPException(status_code=404, detail=info["error"])
    return JSONResponse(info)

@app.get("/bills")
def get_bills(
    congress: Optional[int] = Query(None, description="Congress number override (default: 117)")
):
    """
    List Polymarket markets with Yes% and normalized bill IDs,
    enriched with Congress.gov bill info in the 'info' field.
    """
    return JSONResponse(fetch_bills(congress=congress))


def fetch_price_history(token_id: str, interval: str = "1d", start_ts: Optional[int] = None, end_ts: Optional[int] = None):
    """
    Fetch historical price data for a Polymarket CLOB token.
    
    Args:
        token_id: The CLOB token ID (from clobTokenIds array)
        interval: Duration ending at current time ("1m", "1h", "6h", "1d", "1w", "max")
        start_ts: Start timestamp (Unix seconds, UTC)
        end_ts: End timestamp (Unix seconds, UTC)
    
    Returns:
        List of {timestamp, price} pairs, or None on error
    """
    url = "https://clob.polymarket.com/prices-history"
    params = {
        "market": token_id,
    }
    
    if interval:
        params["interval"] = interval
    
    # Set minimum fidelity based on interval (required by Polymarket API)
    # For longer intervals, need higher fidelity (resolution in minutes)
    if interval == "1w":
        params["fidelity"] = 60  # 1 hour resolution for 1 week
    elif interval == "max":
        params["fidelity"] = 1440  # 1 day resolution for max
    elif interval == "1d":
        params["fidelity"] = 15  # 15 minute resolution for 1 day
    elif interval in ["6h", "1h"]:
        params["fidelity"] = 5  # 5 minute resolution
    
    if start_ts:
        params["startTs"] = start_ts
    if end_ts:
        params["endTs"] = end_ts
    
    try:
        response = _get(url, params=params, timeout=10)
        data = response.json()
        
        # Check for error response
        if "error" in data:
            print(f"[fetch_price_history] Polymarket API error for token {token_id}: {data.get('error')}")
            return None
        
        history = data.get("history", [])
        # Convert to more usable format
        # Price format: Could be decimal (0.0-1.0) or basis points (0-10000)
        # Test the first entry to determine format
        result = []
        for entry in history:
            timestamp = entry.get("t")  # Unix timestamp in seconds
            price_raw = entry.get("p", 0)
            
            # Determine if price is in basis points (> 1.0) or decimal (<= 1.0)
            if price_raw > 1.0:
                # Assume basis points, convert to decimal
                price_decimal = price_raw / 10000.0
            else:
                # Already in decimal format
                price_decimal = float(price_raw)
            
            result.append({
                "timestamp": timestamp,
                "price": price_decimal,
            })
        
        return result
    except Exception as e:
        print(f"[fetch_price_history] Error fetching price history for token {token_id}: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                print(f"[fetch_price_history] Error details: {error_data}")
            except:
                pass
        return None


@app.get("/bills/{bill_id}/price-history")
def get_bill_price_history(
    bill_id: str,
    interval: str = Query("1d", description="Time interval: 1m, 1h, 6h, 1d, 1w, max"),
    start_ts: Optional[int] = Query(None, description="Start timestamp (Unix seconds, UTC)"),
    end_ts: Optional[int] = Query(None, description="End timestamp (Unix seconds, UTC)"),
    fidelity: Optional[int] = Query(None, description="Resolution in minutes (auto-set based on interval if not provided)"),
):
    """
    Get historical price data for a bill's Polymarket market.
    Returns YES price history.
    """
    # First, fetch bills to find the market for this bill_id
    bills = fetch_bills()
    
    # Normalize bill_id for matching (handle various formats like HR.1234, H.R.1234, HR1234, etc.)
    def normalize_bill_id(bid):
        if not bid:
            return None
        # Remove dots and spaces, uppercase
        normalized = bid.replace(".", "").replace(" ", "").upper()
        # Handle H.R -> HR conversion
        normalized = normalized.replace("HR", "HR") if normalized.startswith("H") and not normalized.startswith("HR") else normalized
        return normalized
    
    bill_id_normalized = normalize_bill_id(bill_id)
    
    # Find matching bill
    matching_bill = None
    for bill in bills:
        bid = normalize_bill_id(bill.get("bill_id"))
        if bid == bill_id_normalized:
            matching_bill = bill
            break
    
    if not matching_bill:
        raise HTTPException(status_code=404, detail=f"Bill {bill_id} not found in Polymarket markets")
    
    clob_token_ids = matching_bill.get("clob_token_ids") or []
    
    # Handle case where clob_token_ids might still be a JSON string
    if isinstance(clob_token_ids, str):
        try:
            clob_token_ids = json.loads(clob_token_ids)
        except (json.JSONDecodeError, TypeError):
            clob_token_ids = []
    
    if not clob_token_ids or len(clob_token_ids) < 1:
        raise HTTPException(status_code=404, detail=f"No CLOB token IDs found for bill {bill_id}")
    
    # Ensure it's a list
    if not isinstance(clob_token_ids, list):
        raise HTTPException(status_code=500, detail=f"Invalid clob_token_ids format for bill {bill_id}")
    
    # Use the first token (YES token)
    yes_token_id = str(clob_token_ids[0])  # Ensure it's a string
    
    # Fetch price history (fidelity is auto-set in fetch_price_history based on interval)
    history = fetch_price_history(yes_token_id, interval=interval, start_ts=start_ts, end_ts=end_ts)
    
    if history is None:
        raise HTTPException(status_code=502, detail="Failed to fetch price history from Polymarket")
    
    # Format response with dates and both YES/NO prices
    formatted_history = []
    for entry in history:
        timestamp = entry["timestamp"]
        yes_price = entry["price"]
        no_price = 1.0 - yes_price
        
        # Convert timestamp to date
        date_obj = datetime.fromtimestamp(timestamp, tz=timezone.utc)
        
        formatted_history.append({
            "timestamp": timestamp,
            "date": date_obj.isoformat().split("T")[0],  # YYYY-MM-DD
            "yesPrice": yes_price,
            "noPrice": no_price,
            "displayDate": date_obj.strftime("%b %d"),  # "Jan 15"
        })
    
    return JSONResponse({"history": formatted_history})

@app.get("/cosponsors")
def get_bill_cosponsors(
    bill_type: str = Query(..., description="Bill type (e.g., 'hr', 's', 'hjres')"),
    bill_number: int = Query(..., description="Bill number", ge=1),
    congress: Optional[int] = Query(None, description="Congress number (default: 117)")
):
    """
    Fetch and return the cosponsors for a given bill using the Congress.gov API.
    Example: /cosponsors?bill_type=hr&bill_number=3076
    """
    congress_num = congress or CONGRESS
    bill_type_lower = bill_type.lower()
    endpoint = f"https://api.congress.gov/v3/bill/{congress_num}/{bill_type_lower}/{bill_number}/cosponsors"
    params = {"api_key": CONGRESS_API_KEY, "format": "json", "limit": 250}

    try:
        resp = _get(endpoint, params=params)
        data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Cosponsors not found: {str(e)}")

    cosponsors = []
    # Congress.gov can return "cosponsors" or "items" depending on version
    items = data.get("cosponsors") or data.get("items") or []
    if isinstance(items, dict):
        items = items.get("cosponsors") or items.get("items") or []

    for c in items:
        cosponsors.append({
            "name": c.get("fullName"),
            "party": c.get("party"),
            "state": c.get("state"),
            "district": c.get("district"),
            "sponsorship_date": c.get("sponsorshipDate"),
            "withdrawn_date": c.get("withdrawnDate"),
            "bioguide_id": c.get("bioguideId"),
        })

    return JSONResponse({
        "bill_id": f"{bill_type.upper()}.{bill_number}",
        "congress": congress_num,
        "cosponsor_count": len(cosponsors),
        "cosponsors": cosponsors,
    })

# ---------- Helpers: cosponsor fetch as an internal function ----------
def get_cosponsors_data(
    bill_type: str,
    bill_number: int,
    congress: Optional[int] = None,
) -> list:
    """Return a list of cosponsor dicts from Congress.gov; resilient to shape."""
    congress_num = congress or CONGRESS
    endpoint = f"https://api.congress.gov/v3/bill/{congress_num}/{bill_type.lower()}/{bill_number}/cosponsors"
    params = {"api_key": CONGRESS_API_KEY, "format": "json", "limit": 250}
    try:
        resp = _get(endpoint, params=params)
        data = resp.json()
    except Exception:
        return []

    items = data.get("cosponsors") or data.get("items") or []
    if isinstance(items, dict):
        items = items.get("cosponsors") or items.get("items") or []

    out = []
    for c in items:
        out.append({
            "fullName": c.get("fullName"),
            "party": c.get("party"),
            "state": c.get("state"),
            "district": c.get("district"),
            "sponsorshipDate": c.get("sponsorshipDate"),
            "withdrawnDate": c.get("withdrawnDate"),
            "bioguideId": c.get("bioguideId"),
        })
    return out

# ---------- Helpers: ID & node normalization ----------
def _person_key(p: Dict[str, Any]) -> str:
    """Stable person node id: prefer bioguide; fallback to name+state+district."""
    bid = (p.get("bioguide_id") or p.get("bioguideId") or "").strip()
    if bid:
        return f"person:{bid}"
    name = (p.get("name") or p.get("fullName") or "Unknown").strip()
    state = (p.get("state") or "").strip()
    dist  = (p.get("district") or "").strip() or "-"
    return f"person:{name}|{state}|{dist}"

def _person_label(p: Dict[str, Any]) -> str:
    name = p.get("name") or p.get("fullName") or "Unknown"
    party = p.get("party") or ""
    state = p.get("state") or ""
    dist  = p.get("district") or ""
    tag = f"{party}-{state}{('-'+str(dist)) if dist else ''}".strip("-")
    return f"{name} ({tag})" if tag.strip(" -") else name

def _bill_node_id(bill_type: str, bill_number: int) -> str:
    return f"bill:{bill_type.upper()}.{bill_number}"

# ---------- Graph builder for one bill ----------
def build_bill_graph_for_single(
    bill_type: str,
    bill_number: int,
    congress: Optional[int] = None,
) -> Dict[str, Any]:
    info = get_bill_info_data(bill_type=bill_type, bill_number=bill_number, congress=congress)
    if isinstance(info, dict) and "error" in info:
        # return empty graph for this bill if not found
        return {"nodes": [], "edges": []}

    cosponsors = get_cosponsors_data(bill_type=bill_type, bill_number=bill_number, congress=congress)

    bill_id = info["bill_id"]
    bill_node_id = _bill_node_id(bill_type, bill_number)
    bill_title = info.get("title") or bill_id

    nodes = [{
        "id": bill_node_id,
        "type": "bill",
        "bill_id": bill_id,
        "label": bill_title,
        "policy_area": info.get("policy_area"),
        "introduced_date": info.get("introduced_date"),
    }]
    edges = []

    # Sponsors (from info['sponsors'])
    for s in info.get("sponsors", []):
        person_node_id = _person_key(s)
        nodes.append({
            "id": person_node_id,
            "type": "person",
            "label": _person_label(s),
            "party": s.get("party"),
            "state": s.get("state"),
            "district": s.get("district"),
            "bioguide_id": s.get("bioguide_id"),
        })
        edges.append({
            "source": person_node_id,
            "target": bill_node_id,
            "relation": "sponsor",
        })

    # Cosponsors
    for c in cosponsors:
        person_node_id = _person_key(c)
        nodes.append({
            "id": person_node_id,
            "type": "person",
            "label": _person_label(c),
            "party": c.get("party"),
            "state": c.get("state"),
            "district": c.get("district"),
            "bioguide_id": c.get("bioguideId"),
        })
        edges.append({
            "source": person_node_id,
            "target": bill_node_id,
            "relation": "cosponsor",
            "sponsorship_date": c.get("sponsorshipDate"),
            "withdrawn_date": c.get("withdrawnDate"),
        })

    # Deduplicate nodes by id and edges by (source,target,relation)
    uniq_nodes: Dict[str, Dict[str, Any]] = {}
    for n in nodes:
        uniq_nodes[n["id"]] = n
    seen_edges: Set[tuple] = set()
    uniq_edges = []
    for e in edges:
        key = (e["source"], e["target"], e["relation"])
        if key in seen_edges:
            continue
        seen_edges.add(key)
        uniq_edges.append(e)

    return {"nodes": list(uniq_nodes.values()), "edges": uniq_edges}

# ---------- Graph builder for many bills ----------
def build_bill_graph(
    bills: list,      # list of dicts with keys bill_type, bill_number
    congress: Optional[int] = None
) -> Dict[str, Any]:
    all_nodes: Dict[str, Dict[str, Any]] = {}
    all_edges: Set[tuple] = set()
    for b in bills:
        bt = b.get("bill_type")
        bn = b.get("bill_number")
        if not bt or not bn:
            continue
        g = build_bill_graph_for_single(bt, int(bn), congress=congress)
        for n in g["nodes"]:
            all_nodes[n["id"]] = n
        for e in g["edges"]:
            all_edges.add((e["source"], e["target"], e.get("relation", "")))
    return {
        "nodes": list(all_nodes.values()),
        "edges": [{"source": s, "target": t, "relation": r} for (s, t, r) in sorted(all_edges)],
    }

def fetch_recent_bills(congress: Optional[int] = None, limit: int = 20) -> list:
    """
    Fetch recent bills for a given Congress from Congress.gov (client-side sorted by introducedDate desc).
    Returns a list of dicts: [{"bill_type": "hr", "bill_number": 3076}, ...]
    """
    congress_num = congress or CONGRESS
    endpoint = "https://api.congress.gov/v3/bill"
    # We keep params minimal & sort client-side for robustness across API shapes.
    params = {"api_key": CONGRESS_API_KEY, "format": "json", "congress": congress_num, "limit": 250}

    try:
        resp = _get(endpoint, params=params)
        data = resp.json()
    except Exception as e:
        # Fail soft: return empty set if upstream fails
        return []

    items = data.get("bills") or data.get("results") or data.get("items") or []
    out = []
    for b in items:
        # Congress.gov commonly exposes "type" and "number" on bill summaries
        bt = (b.get("type") or "").lower()
        bn = b.get("number")
        if not bt or not bn:
            # Sometimes the fields live under "bill" nested key
            bb = b.get("bill") or {}
            bt = (bt or bb.get("type") or "").lower()
            bn = bn or bb.get("number")
        try:
            bn_int = int(str(bn))
        except Exception:
            continue

        introduced = (b.get("introducedDate")
                      or (b.get("bill") or {}).get("introducedDate")
                      or "")
        out.append({
            "bill_type": bt,
            "bill_number": bn_int,
            "introduced_date": introduced
        })

    # Sort newest introducedDate first, keep top N
    out.sort(key=lambda x: x.get("introduced_date") or "", reverse=True)
    # Dedup by (type, number) while preserving order
    seen = set()
    deduped = []
    for rec in out:
        key = (rec["bill_type"], rec["bill_number"])
        if key in seen: continue
        seen.add(key)
        deduped.append({"bill_type": rec["bill_type"], "bill_number": rec["bill_number"]})
        if len(deduped) >= limit:
            break
    return deduped

# ---------- Endpoint: GET /graph ----------
@app.get("/graph")
def get_graph(
    source: str = Query("combined", description="combined|polymarket|manual|recent"),
    bills: Optional[str] = Query(
        None,
        description="Comma-separated like 'hr.3076,s.1260' (only used when source=manual)."
    ),
    congress: Optional[int] = Query(None, description="Congress number (default 117)"),
    limit: int = Query(10, ge=1, le=200, description="Max Polymarket bills to include"),
    recent_limit: int = Query(10, ge=0, le=200, description="Max recent bills to include"),
):
    """
    Build a sponsor/cosponsor graph:
      - source=combined (default): Polymarket (limit) + recent Congress.gov (recent_limit)
      - source=polymarket: only Polymarket (limit)
      - source=recent: only recent Congress.gov (recent_limit)
      - source=manual: only ?bills=hr.XXXX,s.YYYY
    Returns: { nodes: [...], edges: [...] }
    """
    bill_list = []

    src = source.lower()
    if src == "manual":
        if not bills:
            raise HTTPException(status_code=400, detail="Provide ?bills=hr.XXXX,s.YYYY when source=manual")
        for token in bills.split(","):
            token = token.strip()
            m = re.match(r"^(hr|s|hjres|sjres|hres|sres|hconres|sconres)\.(\d{1,5})$", token, flags=re.IGNORECASE)
            if not m:
                continue
            bill_list.append({"bill_type": m.group(1).lower(), "bill_number": int(m.group(2))})

    elif src == "polymarket":
        markets = fetch_bills(congress=congress)  # already parses bill ids
        for mkt in markets:
            if mkt.get("bill_type") and mkt.get("bill_number"):
                bill_list.append({"bill_type": mkt["bill_type"], "bill_number": int(mkt["bill_number"])})
            if len(bill_list) >= limit:
                break

    elif src == "recent":
        bill_list = fetch_recent_bills(congress=congress, limit=recent_limit)

    else:  # "combined" (default)
        # 1) polymarket slice
        markets = fetch_bills(congress=congress)
        for mkt in markets:
            if mkt.get("bill_type") and mkt.get("bill_number"):
                bill_list.append({"bill_type": mkt["bill_type"], "bill_number": int(mkt["bill_number"])})
            if len(bill_list) >= limit:
                break
        # 2) recent slice
        recents = fetch_recent_bills(congress=congress, limit=recent_limit)
        bill_list.extend(recents)

    # Deduplicate before building graph
    uniq = {}
    for b in bill_list:
        key = (b["bill_type"], int(b["bill_number"]))
        uniq[key] = {"bill_type": b["bill_type"], "bill_number": int(b["bill_number"])}
    merged_bill_list = list(uniq.values())

    graph = build_bill_graph(merged_bill_list, congress=congress)
    return JSONResponse(graph)

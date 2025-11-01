#!/usr/bin/env python3
import os
import re
import time
import math
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

import json

# =========================
# Config
# =========================
CONGRESS = 117
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
    url = f"https://api.congress.gov/v3/bill/{CONGRESS}/{bill_type.lower()}/{bill_number}/summaries"
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
def fetch_clean_and_chunk(bill_type: str, bill_number: int) -> Tuple[str, str, List[str], str]:
    if not CONGRESS_API_KEY:
        raise RuntimeError("Congress API key missing.")
    endpoint = f"https://api.congress.gov/v3/bill/{CONGRESS}/{bill_type.lower()}/{bill_number}/text"
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

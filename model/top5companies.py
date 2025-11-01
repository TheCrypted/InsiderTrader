#!/usr/bin/env python3
import os
import re
import json
import time
import math
from typing import List, Tuple, Optional

import numpy as np
import pandas as pd
import requests
from bs4 import BeautifulSoup

from sentence_transformers import SentenceTransformer
# We'll ask encode() to return normalized embeddings directly.

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize as sk_normalize
from collections import Counter


# =========================
# Hardcoded configuration
# =========================
CONGRESS = 117  # fixed
MODEL_NAME = "all-mpnet-base-v2"
SP500_CSV = "sp500_dataset.csv"
OUTPUT_JSON = "bill_stock_matches.json"

# Output dirs
BILL_TEXT_DIR = "bill_texts"        # where to save cleaned bill text
BILL_CHUNKS_CSV_DIR = "bill_chunks" # optional: where to save chunked text CSV (not required)

# Chunking (few, large chunks by default)
TARGET_CHUNKS = 8
MIN_WORDS = 300
MAX_WORDS = 1500
OVERLAP_FRACTION = 0.05

TOPK_RESULTS = 5


# =========================
# HTTP helper
# =========================
def _get(url, params=None, max_retries=3, backoff=1.5, timeout=30):
    last_exc = None
    for i in range(max_retries):
        try:
            r = requests.get(
                url,
                params=params,
                timeout=timeout,
                headers={"User-Agent": "bill-matcher/1.0"},
            )
            if r.status_code == 429:
                time.sleep(backoff ** i)
                continue
            r.raise_for_status()
            return r
        except requests.RequestException as e:
            last_exc = e
            time.sleep(backoff ** i)
    raise last_exc


# =========================
# Version/format selection
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
    for idx, label in enumerate(VERSION_TYPE_PRIORITY):
        if label.lower() in vtype.lower():
            return idx
    return len(VERSION_TYPE_PRIORITY)


def _pick_best_text_version(text_versions: List[dict]) -> dict:
    # Decorate with priority + date (may be None)
    decorated = []
    for i, v in enumerate(text_versions):
        vtype = v.get("type", "") or ""
        vdate = v.get("date") or ""
        decorated.append((_version_priority(vtype), vdate, i, v))
    # Prefer best priority; within that, newest date (lexicographic ISO), then original order
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
# Statute cleaner (your exact rules)
# =========================
PAGE_ARTIFACT_RE = re.compile(r"\[\[\s*Page\s+[0-9A-Z.\- ]+\]\]")

INLINE_TAG_RE = re.compile(
    r"(?:<|&lt;){1,2}\s*"
    r"(?:NOTE:|Notes?:|Editorial\s*Note:|Editor\s*Note:|Deadline[^>:\n]*:|Effective\s+date[^>:\n]*:)"
    r"[\s\S]*?"
    r"(?:>|&gt;){1,2}",
    re.IGNORECASE
)
ALLCAPS_HEADER_RE = re.compile(r"^(?:[A-Z0-9 ,.'\-]{6,})$", re.MULTILINE)
LEG_HISTORY_START_RE = re.compile(
    r"^\s*(?:LEGISLATIVE HISTORY|HISTORY|CONGRESSIONAL RECORD)\b.*$",
    re.IGNORECASE | re.MULTILINE
)
CERT_STAMP_RE = re.compile(
    r"^\s*(?:Approved\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}\.?|Be it enacted.*)$",
    re.IGNORECASE | re.MULTILINE
)
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
    # Remove leading/ending straight or smart quotes used as decorative wrappers
    return re.sub(r'^[\'"“”]+|[\'"“”]+\s*$', "", line).strip()


def _normalize_heading_punct(line: str) -> str:
    # If a structural heading ends with an em dash, make it a period.
    if STRUCTURAL_START_RE.match(line) and re.search(r"—\s*$", line):
        return re.sub(r"—\s*$", ".", line)
    return line


def clean_statute_text(raw: str) -> str:
    # 1) Remove page artifacts & decorative dividers early from whole text
    text = PAGE_ARTIFACT_RE.sub("", raw)
    text = DECOR_DIVIDER_RE.sub("", text)

    # 2) Line-by-line: drop ALL-CAPS header lines (except SEC.), inline tags, boilerplate lines
    lines = []
    for ln in text.splitlines():
        if ALLCAPS_HEADER_RE.match(ln) and not ln.strip().startswith("SEC."):
            continue
        if CERT_STAMP_RE.match(ln):
            continue
        ln = INLINE_TAG_RE.sub("", ln)
        lines.append(ln)
    text = "\n".join(lines)
    text = re.sub(r"[ \t]*(?:&gt;|>){1,2}[ \t]*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[ \t]*(?:&lt;|<){1,2}[ \t]*", "", text, flags=re.MULTILINE)
    # Remove any empty bracket pairs that survived
    text = re.sub(r"(?:&lt;|<){1,2}\s*(?:&gt;|>){1,2}", "", text)

    # 3) Remove Table of Contents block (if present)
    parts = re.split(r"(?im)^\s*table of contents\s*$", text, maxsplit=1)
    if len(parts) == 2:
        head, rest = parts
        rest_parts = re.split(r"\n\s*\n", rest, maxsplit=1)
        text = head + ("\n\n" + (rest_parts[1] if len(rest_parts) > 1 else ""))

    # 4) Trim at legislative history section (if present)
    m = LEG_HISTORY_START_RE.search(text)
    if m:
        text = text[:m.start()]

    # 5) Normalize punctuation, remove page line numbers
    text = _standardize_quotes_dashes(text)
    text = LINE_NUMBER_RE.sub("", text)

    # 6) Clean each line: strip decorative wrapping quotes; normalize heading em-dash to period
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

    # 7) Merge hard wraps but keep structure (Sec./(a)/(3)/(A)/roman (i) start new lines)
    def _merge_preserving_structure(t: str) -> str:
        out = []
        buf = []
        def flush_buf():
            if buf:
                out.append(" ".join(buf).strip())
                buf.clear()
        for ln in t.splitlines():
            if not ln.strip():
                flush_buf()
                out.append("")  # keep paragraph break
                continue
            if SEC_LINE_RE.match(ln) or SUBSECTION_LINE_RE.match(ln):
                flush_buf()
                out.append(ln.strip())
            else:
                buf.append(ln.strip())
        flush_buf()
        return re.sub(r"(?:\n\s*){3,}", "\n\n", "\n".join(out)).strip()

    text = _merge_preserving_structure(text)

    # 8) Final whitespace normalization
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


# =========================
# Chunking (few, large, sentence-aware) — runs on CLEANED text now
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
# Company text builder
# =========================
def _build_company_text(row: pd.Series) -> str:
    fields = [
        str(row.get("name", "")),
        str(row.get("ticker", "")),
        str(row.get("sector", "")),
        str(row.get("industry", "")),
        str(row.get("description", "")),
    ]
    return " | ".join([f for f in fields if f and f != "nan"])


# =========================
# CRS summary (human-written)
# =========================
def get_crs_summary(bill_type: str, bill_number: int) -> Optional[str]:
    """
    Fetch the CRS human-written summary.
    Handles both API shapes:
      {"summaries": {"summaries":[...]}}  and  {"summaries":[...]}
    """
    api_key = os.getenv("CONGRESS_API_KEY")
    if not api_key:
        return None

    url = f"https://api.congress.gov/v3/bill/{CONGRESS}/{bill_type.lower()}/{bill_number}/summaries"
    r = _get(url, params={"api_key": api_key, "format": "json", "limit": 50})
    data = r.json()

    # ---- normalize items ----
    items = []
    if isinstance(data, dict):
        s = data.get("summaries")
        if isinstance(s, list):
            items = s
        elif isinstance(s, dict):
            # common nesting
            inner = s.get("summaries") or s.get("items") or []
            if isinstance(inner, list):
                items = inner
        # some older shapes:
        elif "items" in data and isinstance(data["items"], list):
            items = data["items"]

    if not items:
        return None

    # Sort newest first by whatever date field is present
    def k(it):
        return it.get("updateDate") or it.get("actionDate") or it.get("date") or ""
    items.sort(key=k, reverse=True)

    # Extract text (some payloads put plain text in 'text', others in 'summary' or 'title')
    cand = items[0].get("text") or items[0].get("summary") or ""
    cand = cand.strip()

    # If text is HTML-ish, strip tags
    if "<" in cand and ">" in cand:
        try:
            cand = BeautifulSoup(cand, "html.parser").get_text(" ", strip=True)
        except Exception:
            pass

    return cand or None


# =========================
# Universal priors
# =========================
def extract_dynamic_terms(bill_text: str,
                          top_ngrams: int = 40,
                          ngram_range=(1, 2),
                          stopwords: Optional[set] = None) -> dict:
    stop = stopwords or set()
    text = bill_text.lower()
    text = re.sub(r'\s+', ' ', text)

    tokens = re.findall(r"[a-z][a-z0-9\-]+", text)
    tokens = [t for t in tokens if t not in stop and len(t) > 2]

    bigrams = [f"{a} {b}" for a, b in zip(tokens, tokens[1:])]
    grams = tokens + bigrams

    def is_ok(g):
        n = len(g.split())
        return n >= ngram_range[0] and n <= ngram_range[1]

    freq = Counter(g for g in grams if is_ok(g))
    most = freq.most_common(top_ngrams)
    if not most:
        return {}
    maxf = most[0][1]
    return {g: 1.0 + (c / maxf) for g, c in most}  # weights ~[1..2]


def keyword_prior_score_dynamic(text: str, term_weights: dict,
                                cap: float = 0.15, per_hit: float = 0.02) -> float:
    t = text.lower()
    score = 0.0
    for k, w in term_weights.items():
        if k in t:
            score += per_hit * w * 10
    return min(cap, score)


def industry_prior_from_embeddings(df: pd.DataFrame,
                                   bill_query_text: str,
                                   model: SentenceTransformer,
                                   sector_col: str = "sector",
                                   industry_col: str = "industry",
                                   cap: float = 0.12) -> np.ndarray:
    labels = (df[industry_col].fillna("") + " | " + df[sector_col].fillna("")).tolist()
    uniq = sorted(set(labels))
    if not uniq:
        return np.zeros(len(df))
    lbl_embs = model.encode(uniq, convert_to_numpy=True, normalize_embeddings=True)
    q_emb = model.encode([bill_query_text], convert_to_numpy=True, normalize_embeddings=True)
    sims = (q_emb @ lbl_embs.T).ravel()
    lbl2sim = {l: s for l, s in zip(uniq, sims)}
    raw = np.array([lbl2sim.get(l, 0.0) for l in labels], dtype=float)
    if raw.max() > raw.min():
        norm = (raw - raw.min()) / (raw.max() - raw.min())
    else:
        norm = np.zeros_like(raw)
    return cap * norm


# =========================
# Function 1: fetch, clean & preprocess bill text
# =========================
def get_bill_text(bill_type: str, bill_number: int) -> Tuple[str, str, List[str]]:
    """
    Returns (bill_id, CLEANED_text, chunks from CLEANED text).
    Robust to date=null; supports Formatted XML; prefers Plain/Formatted Text.
    """
    api_key = 'XcQpTDLhsreEomtnyvWKTGoWjVzMR7vKMwcnvZOg'
    if not api_key:
        raise RuntimeError("Set CONGRESS_API_KEY environment variable with your Congress.gov API key.")

    endpoint = f"https://api.congress.gov/v3/bill/{CONGRESS}/{bill_type.lower()}/{bill_number}/text"
    resp = _get(endpoint, params={"api_key": api_key, "format": "json", "limit": 250})
    data = resp.json()
    versions = data.get("textVersions", []) or []
    if not versions:
        raise RuntimeError("No text versions available for this bill.")

    best_version = _pick_best_text_version(versions)
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

    # ---- CLEAN IT PER YOUR RULES ----
    cleaned = clean_statute_text(raw)

    # Save cleaned text for inspection
    os.makedirs(BILL_TEXT_DIR, exist_ok=True)
    bill_id = f"{bill_type.upper()}.{bill_number}"
    bill_text_path = os.path.join(BILL_TEXT_DIR, f"{bill_id.lower()}_clean.txt")
    with open(bill_text_path, "w", encoding="utf-8") as f:
        f.write(cleaned)

    # Chunk the CLEANED text
    chunks = chunk_text_few(cleaned, target_chunks=TARGET_CHUNKS,
                            min_words=MIN_WORDS, max_words=MAX_WORDS,
                            overlap_fraction=OVERLAP_FRACTION)
    return bill_id, cleaned, chunks


# =========================
# Function 2: match bill to S&P 500 (universal hybrid)
# =========================
def match_bill_to_sp500(bill_type: str, bill_number: int) -> dict:
    print("Fetching, cleaning, and preprocessing bill text ...")
    bill_id, clean_text, chunks = get_bill_text(bill_type, bill_number)
    print(f"✅ {bill_id} | cleaned chars: {len(clean_text)} | chunks: {len(chunks)}\n")

    # Focused query: CRS summary + a long bill chunk
    crs = get_crs_summary(bill_type, bill_number)
    if crs:
        print("Hello")
        long_chunk = max(chunks, key=len) if chunks else ""
        bill_query_text = (crs + "\n\n" + long_chunk)[:6000]
    else:
        # fallback: concat the longest 2–3 chunks
        bill_query_text = " ".join(sorted(chunks, key=len, reverse=True)[:3])

    print("Loading embedding model ...")
    model = SentenceTransformer(MODEL_NAME)
    print(f"✅ Model loaded: {MODEL_NAME}\n")

    print("Loading S&P 500 dataset ...")
    sp = pd.read_csv(SP500_CSV)
    print(f"✅ {len(sp)} companies\n")

    # Build company texts
    comp_texts = sp.apply(_build_company_text, axis=1).tolist()

    # Dynamic terms from bill (prefer CRS if present)
    source_text = crs if crs else clean_text
    dyn_terms = extract_dynamic_terms(source_text, top_ngrams=40, ngram_range=(1, 2))

    # Industry prior learned from label embeddings
    ind_boosts = industry_prior_from_embeddings(sp, bill_query_text, model,
                                                sector_col="sector", industry_col="industry", cap=0.12)

    # --- Hybrid scoring ---
    # Dense
    q_emb = model.encode([bill_query_text], convert_to_numpy=True, normalize_embeddings=True)
    d_embs = model.encode(comp_texts, convert_to_numpy=True, normalize_embeddings=True,
                          batch_size=64, show_progress_bar=False)
    dense_sims = (q_emb @ d_embs.T).ravel()

    # TF-IDF
    vect = TfidfVectorizer(min_df=2, ngram_range=(1, 2))
    X = vect.fit_transform(comp_texts + [bill_query_text])
    D, q = X[:-1], X[-1]
    D = sk_normalize(D); q = sk_normalize(q)
    tfidf_sims = (D @ q.T).toarray().ravel()

    # Dynamic keyword prior
    kprior = np.array([keyword_prior_score_dynamic(t, dyn_terms) for t in comp_texts], dtype=float)

    # Blend
    alpha, beta, gamma_k = 0.65, 0.30, 0.05
    base = alpha * dense_sims + beta * tfidf_sims + gamma_k * kprior
    final_scores = base + ind_boosts

    sp = sp.copy()
    sp["hybrid_score"] = final_scores

    top = sp.nlargest(TOPK_RESULTS, "hybrid_score").reset_index(drop=True)

    # Simple explanation snippet
    snippet_source = (crs or clean_text)
    snippet = snippet_source[:280] + ("..." if len(snippet_source) > 280 else "")
    top["bill_snippet"] = snippet

    print("=" * 96)
    print(f"TOP {TOPK_RESULTS} COMPANIES RELATED TO BILL {bill_id} (Hybrid on CLEANED text)")
    print("=" * 96)
    print(top[["ticker", "name", "sector", "industry", "hybrid_score"]].to_string(index=False))
    print("\n— Matching bill snippet (from CRS or cleaned bill) —")
    print(snippet)

    result = {
        "bill_id": bill_id,
        "congress": CONGRESS,
        "model": MODEL_NAME,
        "ranking": "hybrid_dense_tfidf_dynamic_keywords_industry_prior",
        "topk": TOPK_RESULTS,
        "results": top.to_dict("records"),
        # also tell caller where the cleaned text was saved
        "clean_text_path": os.path.join(BILL_TEXT_DIR, f"{bill_id.lower()}_clean.txt"),
    }
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print("\n" + "=" * 96)
    print(f"✅ Results saved to '{OUTPUT_JSON}'")
    print("=" * 96)
    return result


# =========================
# Example usage
# =========================
if __name__ == "__main__":
    BILL_TYPE = "hr"      # e.g., "hr", "s", "hjres", "sjres", ...
    BILL_NUMBER = 3076
    match_bill_to_sp500(BILL_TYPE, BILL_NUMBER)

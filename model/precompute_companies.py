#!/usr/bin/env python3
import os
import json
import pickle
from typing import List

import numpy as np
import pandas as pd
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize as sk_normalize
from sentence_transformers import SentenceTransformer

# =========================
# Config
# =========================
MODEL_NAME = "all-mpnet-base-v2"
SP500_CSV = "sp500_dataset.csv"
ARTIFACT_DIR = "artifacts"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

# =========================
# Helpers
# =========================
def build_company_text(row: pd.Series) -> str:
    """
    One-time definition of 'company text' used for Dense + TF-IDF + keyword prior.
    """
    fields = [
        str(row.get("name", "")),
        str(row.get("ticker", "")),
        str(row.get("sector", "")),
        str(row.get("industry", "")),
        str(row.get("description", "")),
    ]
    return " | ".join([f for f in fields if f and f != "nan"])

# =========================
# Main
# =========================
def main():
    print("Loading S&P 500 dataset...")
    df = pd.read_csv(SP500_CSV)
    for col in ["ticker", "name", "sector", "industry", "description"]:
        if col not in df.columns:
            raise RuntimeError(f"Missing column: {col}")

    comp_texts: List[str] = df.apply(build_company_text, axis=1).tolist()

    print("Loading embedding model once...")
    model = SentenceTransformer(MODEL_NAME)
    print(f"Model ready: {MODEL_NAME}")

    # Dense embeddings (normalized)
    print("Encoding company texts (dense)...")
    comp_embs = model.encode(
        comp_texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        batch_size=64,
        show_progress_bar=True,
    )

    # TF-IDF (fit on company texts; store normalized matrix)
    print("Fitting TF-IDF on company texts...")
    vect = TfidfVectorizer(min_df=2, ngram_range=(1, 2))
    D = vect.fit_transform(comp_texts)
    D = sk_normalize(D)

    # Industry|Sector label artifacts
    labels = (df["industry"].fillna("") + " | " + df["sector"].fillna("")).tolist()
    uniq_labels = sorted(set(labels))
    label_to_idx = {lbl: i for i, lbl in enumerate(uniq_labels)}
    company_label_idx = np.array([label_to_idx[lbl] for lbl in labels], dtype=np.int32)

    print("Encoding unique Industry|Sector labels...")
    uniq_label_embs = model.encode(
        uniq_labels, convert_to_numpy=True, normalize_embeddings=True
    )

    # Save artifacts
    np.save(os.path.join(ARTIFACT_DIR, "company_embeddings.npy"), comp_embs)

    with open(os.path.join(ARTIFACT_DIR, "tfidf_vectorizer.pkl"), "wb") as f:
        pickle.dump(vect, f)
    sparse.save_npz(os.path.join(ARTIFACT_DIR, "tfidf_matrix_norm.npz"), D)

    df.to_parquet(os.path.join(ARTIFACT_DIR, "companies.parquet"), index=False)

    with open(os.path.join(ARTIFACT_DIR, "company_texts.json"), "w", encoding="utf-8") as f:
        json.dump(comp_texts, f, ensure_ascii=False)

    with open(os.path.join(ARTIFACT_DIR, "uniq_labels.json"), "w", encoding="utf-8") as f:
        json.dump(uniq_labels, f, ensure_ascii=False)
    np.save(os.path.join(ARTIFACT_DIR, "uniq_label_embs.npy"), uniq_label_embs)
    np.save(os.path.join(ARTIFACT_DIR, "company_label_idx.npy"), company_label_idx)

    print("✅ Precompute complete → artifacts/")

if __name__ == "__main__":
    main()

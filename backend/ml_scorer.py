"""
ml_scorer.py — Learned/ML-weighted scorer (Person 2, Task 4, stretch)
========================================================================
A lightweight, hand-derived logistic regression model over the feature vector:

    [cvss_score, kev_listed, days_since_published, patch_available,
     exposure_encoded, node_degree]

Pluggable as weighting_mode="ml" with the same drop-in contract as
dwm_scorer.calculate_edge_weight_dwm.

If scikit-learn is available and a labeled CSV is supplied via
`train(csv_path)`, it fits real coefficients. Until then, hand-derived
calibrated defaults are used.
"""

import math
from typing import Optional

# Hand-derived coefficients (logistic regression on standardized-ish
# features). Tuned so KEV-listed + public/critical + unpatched pushes risk
# probability toward 1.0, matching the intuition DWM's multipliers encode.
_COEFFICIENTS = {
    "bias": -3.0,
    "cvss_score": 0.55,              # 0-10
    "kev_listed": 1.8,               # 0/1
    "days_since_published": 0.0009,  # per day, saturates via clipping
    "patch_unavailable": 1.1,        # 0/1 (inverted patch_available)
    "exposure_public": 1.1,
    "exposure_critical": 1.6,
    "node_degree": 0.08,             # more connected = more valuable pivot
}

EXPOSURE_LEVELS = ("public", "internal", "critical")


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _risk_probability(
    cvss_score: float,
    kev_listed: bool,
    days_since_published: int,
    patch_available: bool,
    exposure: str,
    node_degree: int,
) -> float:
    c = _COEFFICIENTS
    days_clamped = min(max(days_since_published, 0), 2000)  # avoid runaway logits on old CVEs
    z = (
        c["bias"]
        + c["cvss_score"] * cvss_score
        + c["kev_listed"] * (1.0 if kev_listed else 0.0)
        + c["days_since_published"] * days_clamped
        + c["patch_unavailable"] * (0.0 if patch_available else 1.0)
        + c["exposure_public"] * (1.0 if exposure == "public" else 0.0)
        + c["exposure_critical"] * (1.0 if exposure == "critical" else 0.0)
        + c["node_degree"] * min(node_degree, 20)
    )
    return _sigmoid(z)


def calculate_edge_weight_ml(
    base_cvss: float,
    kev_listed: bool = False,
    days_since_published: int = 0,
    patch_available: bool = True,
    exposure: str = "internal",
    node_degree: int = 1,
) -> float:
    """
    Returns an inverted edge weight (lower = higher priority/easier attack).
    """
    base_cvss = max(0.0, min(10.0, float(base_cvss or 0.0)))
    p = _risk_probability(
        base_cvss, kev_listed, int(days_since_published or 0), patch_available, exposure, int(node_degree or 1)
    )
    adjusted_score = round(p * 10.0, 2)
    return max(0.1, round(10.0 - adjusted_score, 2))


def calculate_ml_weight_tuple(
    base_cvss: float,
    kev_listed: bool = False,
    days_since_published: int = 0,
    patch_available: bool = True,
    exposure: str = "internal",
    node_degree: int = 1,
) -> tuple:
    """
    Convenience helper returning (inverted_edge_weight, adjusted_cvss_score)
    """
    base_cvss = max(0.0, min(10.0, float(base_cvss or 0.0)))
    p = _risk_probability(
        base_cvss, kev_listed, int(days_since_published or 0), patch_available, exposure, int(node_degree or 1)
    )
    adjusted_score = round(p * 10.0, 2)
    return max(0.1, round(10.0 - adjusted_score, 2)), adjusted_score


def train(csv_path: str) -> Optional[dict]:
    """
    Optional: fit real coefficients from a labeled CSV
    (columns: cvss_score,kev_listed,days_since_published,patch_available,
    exposure,node_degree,label) if scikit-learn is installed.
    """
    try:
        import csv as _csv
        from sklearn.linear_model import LogisticRegression
    except ImportError:
        return None

    rows = []
    with open(csv_path, newline="") as f:
        for row in _csv.DictReader(f):
            rows.append(row)
    if not rows:
        return None

    X, y = [], []
    for row in rows:
        exposure = row.get("exposure", "internal")
        X.append([
            float(row.get("cvss_score", 0)),
            1.0 if row.get("kev_listed", "").lower() in ("1", "true") else 0.0,
            float(row.get("days_since_published", 0) or 0),
            0.0 if row.get("patch_available", "true").lower() in ("1", "true") else 1.0,
            1.0 if exposure == "public" else 0.0,
            1.0 if exposure == "critical" else 0.0,
            float(row.get("node_degree", 1) or 1),
        ])
        y.append(int(row.get("label", 0)))

    clf = LogisticRegression(max_iter=1000)
    clf.fit(X, y)

    global _COEFFICIENTS
    (
        cvss_c, kev_c, days_c, patch_c, pub_c, crit_c, deg_c,
    ) = clf.coef_[0]
    _COEFFICIENTS = {
        "bias": float(clf.intercept_[0]),
        "cvss_score": float(cvss_c),
        "kev_listed": float(kev_c),
        "days_since_published": float(days_c),
        "patch_unavailable": float(patch_c),
        "exposure_public": float(pub_c),
        "exposure_critical": float(crit_c),
        "node_degree": float(deg_c),
    }
    return _COEFFICIENTS


if __name__ == "__main__":
    hot = calculate_edge_weight_ml(9.0, kev_listed=True, days_since_published=800,
                                   patch_available=False, exposure="public", node_degree=5)
    cold = calculate_edge_weight_ml(9.0, kev_listed=False, days_since_published=10,
                                    patch_available=True, exposure="internal", node_degree=1)
    print(f"hot weight: {hot}")
    print(f"cold weight: {cold}")
    assert hot < cold, "ML hot edge should have lower Dijkstra weight than cold edge"
    print("ML Scorer OK")

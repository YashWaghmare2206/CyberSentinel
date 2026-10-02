"""
dwm_scorer.py — Dynamic Weight Management (Person 2, Task 3)
==============================================================
Extends Person 1's static scorer.py (weight = 10.0 - cvss_score) with the
two CVSS layers NVD leaves to the consumer to calculate:

  * Temporal      — does exploit activity / patch status change urgency?
  * Environmental — does this specific network placement change urgency?

The official NVD `cvss_score` is NEVER modified. This module produces a
second, contextual number ("adjusted_weight" upstream) alongside it. The
adjusted CVSS-like score is run back through the same `10.0 - x` inversion
scorer.py already uses, so it drops into graph.py's Dijkstra/A* call with
no change to how edge weights are consumed.

Pluggable via `weighting_mode`:
    "static" -> scorer.calculate_edge_weight   (Person 1, unchanged)
    "dwm"    -> calculate_edge_weight_dwm       (this module)
    "ml"     -> ml_scorer.calculate_edge_weight_ml (Task 4, stretch)
"""

from typing import Optional, List, Dict, Any, Tuple, Union


def calculate_dynamic_weight(
    base_cvss: float,
    kev_listed: bool = False,
    days_since_published: int = 0,
    patch_available: bool = True,
    exposure: str = "internal",  # "public" | "internal" | "critical"
) -> float:
    """
    Returns an adjusted CVSS-like score (0-10) that folds in exploit
    activity (temporal) and network placement (environmental) on top of
    the NVD base score. Higher = more urgent, same scale as base_cvss.
    """
    if base_cvss is None:
        base_cvss = 0.0
    base_cvss = max(0.0, min(10.0, float(base_cvss)))
    days_since_published = max(0, int(days_since_published or 0))

    temporal_multiplier = 1.0
    if kev_listed:
        temporal_multiplier *= 1.3          # actively exploited in the wild -> more urgent
    if not patch_available:
        temporal_multiplier *= 1.15         # no fix yet -> stays exploitable longer
    if days_since_published > 365:
        temporal_multiplier *= 1.1          # old + still unpatched -> exploit tooling likely exists

    environmental_multiplier = {
        "public": 1.25,     # internet-facing, easiest to reach
        "internal": 1.0,
        "critical": 1.4,    # core banking / high blast-radius node
    }.get(exposure, 1.0)

    adjusted = min(base_cvss * temporal_multiplier * environmental_multiplier, 10.0)
    return round(adjusted, 2)


def calculate_edge_weight_dwm(
    base_cvss: float,
    kev_listed: bool = False,
    days_since_published: int = 0,
    patch_available: bool = True,
    exposure: str = "internal",
) -> float:
    """
    Same contract as scorer.calculate_edge_weight, but built on the DWM
    adjusted score instead of the raw CVSS. Drop-in for graph.py's
    edge-weight call when weighting_mode="dwm".
    """
    adjusted = calculate_dynamic_weight(
        base_cvss, kev_listed, days_since_published, patch_available, exposure
    )
    return max(0.1, 10.0 - adjusted)


def calculate_dynamic_weight_tuple(
    base_cvss: float,
    kev_listed: bool = False,
    days_since_published: int = 0,
    patch_available: bool = True,
    exposure: str = "internal",
) -> Tuple[float, float]:
    """
    Convenience helper returning (inverted_edge_weight, adjusted_cvss_score)
    for seamless integration into graph.py edge creation.
    """
    adj = calculate_dynamic_weight(
        base_cvss, kev_listed, days_since_published, patch_available, exposure
    )
    return max(0.1, round(10.0 - adj, 2)), adj


def node_dwm_fields(node_cves: list, exposure: str) -> dict:
    """
    Given a node's CVE list and its exposure tier, returns the worst-case
    adjusted score for that node plus the raw CVSS:
        { "cvss_score": 9.8, "adjusted_weight": 9.95, "weighting_mode": "dwm" }
    """
    if not node_cves:
        return {"cvss_score": 0.0, "adjusted_weight": 0.0}

    worst = max(node_cves, key=lambda c: float(c.get("cvss_score", 0.0)))
    adjusted = calculate_dynamic_weight(
        base_cvss=worst.get("cvss_score", 0.0),
        kev_listed=bool(worst.get("kev_listed", False)),
        days_since_published=int(worst.get("days_since_published", 0) or 0),
        patch_available=bool(worst.get("patch_available", True)),
        exposure=exposure,
    )
    return {
        "cvss_score": float(worst.get("cvss_score", 0.0)),
        "adjusted_weight": adjusted,
    }


def formula_breakdown(
    base_cvss: float,
    kev_listed: bool = False,
    days_since_published: int = 0,
    patch_available: bool = True,
    exposure: str = "internal",
) -> dict:
    """
    Returns a step-by-step breakdown of how the DWM score was calculated.
    This is the 'scoring receipt' shown in the UI per hop.
    """
    base_cvss = max(0.0, min(10.0, float(base_cvss or 0.0)))
    days = max(0, int(days_since_published or 0))

    kev_mult   = 1.30 if kev_listed else 1.0
    patch_mult = 1.15 if not patch_available else 1.0
    age_mult   = 1.10 if days > 365 else 1.0
    env_mult   = {"public": 1.25, "internal": 1.0, "critical": 1.40}.get(exposure, 1.0)
    
    after_kev   = round(base_cvss * kev_mult, 2)
    after_patch = round(after_kev * patch_mult, 2)
    after_age   = round(after_patch * age_mult, 2)
    final       = round(min(after_age * env_mult, 10.0), 2)
    edge_weight = round(max(0.1, 10.0 - final), 2)
    
    return {
        "base_cvss": base_cvss,
        "steps": [
            {
                "label": "CISA KEV Zero-Day Multiplier",
                "multiplier": kev_mult,
                "value_after": after_kev,
                "applied": kev_listed,
                "reason": "Actively exploited in the wild — confirmed attack code exists" if kev_listed else "Not in CISA KEV catalog"
            },
            {
                "label": "No Patch Available Multiplier",
                "multiplier": patch_mult,
                "value_after": after_patch,
                "applied": not patch_available,
                "reason": "Vendor has not released a fix — vulnerability stays exploitable" if not patch_available else "Patch available from vendor"
            },
            {
                "label": "Old Unpatched CVE Multiplier",
                "multiplier": age_mult,
                "value_after": after_age,
                "applied": days > 365,
                "reason": f"Published {days} days ago — exploit toolkits likely exist" if days > 365 else f"Published {days} days ago — relatively recent"
            },
            {
                "label": f"Exposure Multiplier ({exposure})",
                "multiplier": env_mult,
                "value_after": final,
                "applied": True,
                "reason": {
                    "public": "Internet-facing — no firewall barrier, directly reachable",
                    "internal": "Internal network — requires prior foothold",
                    "critical": "Critical infrastructure — maximum blast radius"
                }.get(exposure, "Standard internal node")
            },
        ],
        "adjusted_cvss": final,
        "edge_weight": edge_weight,
        "interpretation": (
            "🔴 CRITICAL — Near-zero traversal resistance" if edge_weight < 1.0 else
            "🟠 HIGH — Low resistance, easily traversed" if edge_weight < 3.0 else
            "🟡 MEDIUM — Moderate resistance" if edge_weight < 6.0 else
            "🟢 LOW — High resistance, difficult to traverse"
        )
    }

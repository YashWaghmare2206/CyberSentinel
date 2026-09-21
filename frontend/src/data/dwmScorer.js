// ─────────────────────────────────────────────────────────────────────────
// JS twin of backend/dwm_scorer.py — Dynamic Weight Management (Task 3).
// Mirrors the Python multipliers exactly so weighting_mode="dwm" produces
// the same adjusted scores whether running against the live backend or
// the local fallback engine (graphEngine.js).
// ─────────────────────────────────────────────────────────────────────────

const EXPOSURE_MULTIPLIER = {
  public: 1.25,  // internet-facing, easiest to reach
  internal: 1.0,
  critical: 1.4, // core banking / high blast-radius node
};

/** Mirrors dwm_scorer.py: calculate_dynamic_weight */
export function calculateDynamicWeight({
  baseCvss,
  kevListed = false,
  daysSincePublished = 0,
  patchAvailable = true,
  exposure = "internal",
}) {
  const cvss = Math.max(0, Math.min(10, Number(baseCvss) || 0));
  const days = Math.max(0, Number(daysSincePublished) || 0);

  let temporalMultiplier = 1.0;
  if (kevListed) temporalMultiplier *= 1.3;        // actively exploited in the wild -> more urgent
  if (!patchAvailable) temporalMultiplier *= 1.15; // no fix yet -> stays exploitable longer
  if (days > 365) temporalMultiplier *= 1.1;       // old + still unpatched -> exploit tooling exists

  const environmentalMultiplier = EXPOSURE_MULTIPLIER[exposure] ?? 1.0;

  const adjusted = Math.min(cvss * temporalMultiplier * environmentalMultiplier, 10);
  return Math.round(adjusted * 100) / 100;
}

/** Mirrors dwm_scorer.py: calculate_edge_weight_dwm — drop-in for graphEngine's edge weight */
export function calculateEdgeWeightDwm(params) {
  const adjusted = calculateDynamicWeight(params);
  return Math.max(0.1, 10 - adjusted);
}

/**
 * Given a node's CVE list and its exposure tier, returns
 * { cvss_score, adjusted_weight } for the response payload.
 */
export function nodeDwmFields(nodeCves, exposure) {
  if (!nodeCves?.length) return { cvss_score: 0, adjusted_weight: 0 };
  const worst = [...nodeCves].sort((a, b) => (b.cvss_score ?? 0) - (a.cvss_score ?? 0))[0];
  const adjusted = calculateDynamicWeight({
    baseCvss: worst.cvss_score,
    kevListed: Boolean(worst.kev_listed),
    daysSincePublished: worst.days_since_published ?? 0,
    patchAvailable: worst.patch_available ?? true,
    exposure,
  });
  return { cvss_score: Number(worst.cvss_score) || 0, adjusted_weight: adjusted };
}

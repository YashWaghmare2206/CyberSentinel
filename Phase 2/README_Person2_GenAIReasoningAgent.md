# CyberSentinel — Phase 2 — Person 2: Gen AI Reasoning Agent

> Give this file to your coding agent along with repo access.
> Implement each task in order. Task 3 (DWM) is your biggest lift — start there if timeline is tight, since it's the most technically distinct contribution of your role.

## Your ownership (unchanged from Phase 1)
`src/data/localEngine.js` (the LLM stand-in — still what runs until/unless `backend/llm.py` is live), and eventually `backend/llm.py` itself once Person 4 wires the real endpoint.

## Ground rules
- `localEngine.js` already reads the **real** computed path from `graphEngine.js` and narrates it dynamically — don't replace that pattern with a fixed script. Keep it data-driven.
- Everything you add must work standalone in the frontend fallback (`localEngine.js`) first — the real LLM version (`llm.py`) should be a drop-in with the same output contract, added later once Person 4's backend is live.

---

## Task 1 — Per-node safety cards (issue / impact / fix)

**Files:** `src/data/localEngine.js`, `data/networks/*/cves.json` (coordinate with Person 1 — you write the content, they own the schema location)

Currently `FixPanel.jsx` gets one flat `fixText` string for the whole attack path. You need to produce **structured, per-node** remediation content instead.

1. For each CVE, add a `remediation` object (you write the content; Person 1 already added the base CVE fields):
   ```json
   {
     "cve_id": "CVE-2023-XXXXX",
     "remediation": {
       "issue": "Short plain-English description of the flaw (1 sentence).",
       "impact": "What an attacker gains at this specific hop if they exploit it (1 sentence).",
       "fix": "Concrete, actionable remediation step (1-2 sentences: patch version, config change, or mitigation)."
     }
   }
   ```
2. In `localEngine.js`, when building the streamed response for a path, attach each node's `remediation` (pulled from its worst/highest-CVSS CVE, same pattern `topCve()` already uses) to that node's entry in the output — don't concatenate everything into one string.
3. Change the streaming shape from one continuous `fix_token` string to per-node chunks, e.g. emit a `node_fix` event per node in path order:
   ```js
   yield { type: "node_fix", node_id: node.id, data: node.remediation };
   ```
   This lets Person 3's `SafetyCard.jsx` render and reveal cards one at a time, following the attack path order — reuse the existing typewriter/streaming pattern, just scoped per card instead of per whole blob.

**Acceptance check:** running a simulation streams one `node_fix` event per node in the path, each with `issue`/`impact`/`fix` text — no single giant blob.

---

## Task 2 — Per-node narrative already exists, extend for multi-path (Section 2 support)

**File:** `src/data/localEngine.js`

Since Person 1's `graphEngine.js` now returns multiple ranked paths (top-K), your narrative generator needs to work for **whichever path is selected**, not just the top one.

1. Confirm `buildNarrative(pathResult, entryLabel, targetLabel)` already takes a single path object — it does. No structural change needed here.
2. Make sure `localSimulateStream()` (or whatever wraps it for streaming) accepts a `pathIndex` or full `pathResult` param from the frontend, so switching between ranked paths in `PathList.jsx` re-triggers narrative + fix generation for that specific path, not always path #1.

**Acceptance check:** selecting path #2 or #3 in the UI produces a distinct narrative and distinct per-node fix cards, matching that path's actual nodes.

---

## Task 3 — Dynamic Weight Management (DWM) scorer

**New file:** `backend/dwm_scorer.py` (mirror in `src/data/` as `dwmScorer.js` if the frontend also needs to compute it locally — check with Person 1/3 on whether this runs backend-only or needs a JS twin like the other scorer)

This is the most substantive new piece of your role. It extends Person 1's static `scorer.py` (`weight = 10.0 - cvss_score`) with the two CVSS layers NVD leaves to the consumer to calculate: **Temporal** (does exploit activity/patch status change urgency?) and **Environmental** (does this specific network context change urgency?). The official NVD `cvss_score` is never modified — you're adding a second, contextual number alongside it.

1. Implement:
   ```python
   def calculate_dynamic_weight(
       base_cvss: float,
       kev_listed: bool,
       days_since_published: int,
       patch_available: bool,
       exposure: str,  # "public" | "internal" | "critical"
   ) -> float:
       """
       Returns an adjusted CVSS-like score (0-10), then run through the same
       10.0 - x inversion as scorer.py's calculate_edge_weight, so it drops
       into Dijkstra/A* with no changes to graph.py's edge-building call.
       """
       temporal_multiplier = 1.0
       if kev_listed:
           temporal_multiplier *= 1.3          # actively exploited in the wild -> more urgent
       if not patch_available:
           temporal_multiplier *= 1.15         # no fix yet -> stays exploitable longer
       if days_since_published > 365:
           temporal_multiplier *= 1.1          # old + still unpatched -> higher likelihood of exploit tooling existing

       environmental_multiplier = {
           "public": 1.25,     # internet-facing, easiest to reach
           "internal": 1.0,
           "critical": 1.4,    # core banking / high blast-radius node
       }.get(exposure, 1.0)

       adjusted = min(base_cvss * temporal_multiplier * environmental_multiplier, 10.0)
       return round(adjusted, 2)
   ```
   (Exact multiplier values are a starting point — tune them so demo paths visibly shift when DWM is enabled vs static scoring.)
2. Add a `weighting_mode` param to Person 1's `build_graph()` call site (coordinate with Person 1 — they add the param, you supply the function it calls): `"static"` → `scorer.calculate_edge_weight`, `"dwm"` → your `calculate_dynamic_weight`.
3. Return **both** numbers in the node/edge payload so the frontend can show them side by side:
   ```json
   { "cvss_score": 9.8, "adjusted_weight": 9.95, "weighting_mode": "dwm" }
   ```

**Acceptance check:** running the same entry/target with `weighting_mode="static"` vs `"dwm"` can produce a different optimal path when a KEV-listed or internet-facing CVE is involved; both `cvss_score` and `adjusted_weight` are present in the response.

---

## Task 4 (stretch goal) — Learned/ML-weighted scorer

**New file (optional):** `backend/ml_scorer.py`

Only attempt this after Tasks 1-3 are solid. Do **not** build a deep learning model — a lightweight classical model is both more appropriate for the timeline and the actual ask.

1. Define feature vector per edge/CVE: `[cvss_score, kev_listed, days_since_published, patch_available, exposure_encoded, node_degree]`.
2. Train a small logistic regression or gradient-boosted tree (scikit-learn is fine) on synthetic/labeled examples of "high-risk vs low-risk" edges, or hand-derive coefficients if there's no time to train — the point is the *architecture* (pluggable learned weights) more than model sophistication.
3. Expose it as a third `weighting_mode="ml"` option, same call signature as Task 3's function, same drop-in behavior into `build_graph()`.
4. This becomes the `"ml-weighted"` option in the `algorithm`/weighting selector Person 4 exposes via the API and Person 3 exposes via `ControlBar.jsx`.

**Acceptance check:** `weighting_mode="ml"` runs without error and returns a valid weight for every edge (doesn't need to outperform DWM — just needs to demonstrate the pluggable pattern).

---

## Order of work
1. Task 1 (per-node safety content) — highest visible impact, unblocks Person 3 immediately.
2. Task 3 (DWM scorer) — your core technical contribution, needs Person 1's Task 4 data fields first.
3. Task 2 (multi-path narrative support) — small, do alongside Task 1.
4. Task 4 (ML stretch) — only if time remains.

## Definition of done
- [ ] Every CVE has a `remediation: {issue, impact, fix}` object
- [ ] `localEngine.js` streams per-node `node_fix` events instead of one blob
- [ ] Narrative/fix generation works for any selected path, not just rank 1
- [ ] `dwm_scorer.py` implemented and pluggable via `weighting_mode`
- [ ] Response payload includes both `cvss_score` and `adjusted_weight`
- [ ] (Stretch) `ml_scorer.py` pluggable as a third weighting mode

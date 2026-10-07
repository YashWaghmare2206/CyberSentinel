# CyberSentinel — Phase 2 — Person 3: React Frontend Dashboard

> Give this file to your coding agent along with repo access.
> You have the most tasks this phase since almost every backend change needs a UI surface. Work top to bottom — later tasks assume earlier components exist.

## Your ownership (unchanged from Phase 1)
Everything in `src/components/`, `src/App.jsx`, `src/hooks/useSimulation.js` (state only — don't touch the SSE plumbing in `src/api/simulate.js`, that's Person 4's contract).

## Ground rules
- `NetworkGraph.jsx`'s camera-follow, dimming, and risk-coloring logic already works — you're changing its **inputs** (which path, which network), not its rendering engine.
- `useSimulation.js`'s `STATUS` state machine and SSE-consuming pattern already work — extend the state shape, don't replace the pattern.
- Every new component should degrade gracefully with the local fallback data, same as Phase 1 (don't assume the live backend is up).

---

## Task 1 — `SafetyCard.jsx` (per-node issue/impact/fix)

**New file:** `src/components/SafetyCard.jsx`

Depends on Person 2's Task 1 (`node_fix` events with `issue`/`impact`/`fix`).

1. Build a single reusable card component:
   ```jsx
   function SafetyCard({ nodeName, cveId, cvssScore, issue, impact, fix }) { ... }
   ```
2. Layout: node name + severity badge (reuse `SeverityBadge.jsx`) at top → "Issue" (with CVE ID/CVSS) → "Impact" → "Fix", each as a labeled sub-section.
3. Use this **same component** in both:
   - `RiskCards.jsx` (already shows per-node CVEs — extend it to also show `issue`/`fix` via `SafetyCard`)
   - `FixPanel.jsx` (replace the current single `<pre>{fixText}</pre>` block entirely with a stacked list of `SafetyCard`s, one per node in path order)
4. Update `useSimulation.js`: replace the single `fixText` string state with an array, e.g. `nodeFixes: [{ nodeId, issue, impact, fix }]`, appended as `node_fix` events stream in.
5. Stream reveal: cards should appear one at a time (reuse the existing typewriter-style reveal timing) in path order, not all at once.

**Acceptance check:** running a simulation shows individual cards per node with issue/impact/fix, appearing sequentially — no giant text blob anywhere.

---

## Task 2 — `PathList.jsx` (ranked alternate paths)

**New file:** `src/components/PathList.jsx`

Depends on Person 1's Task 1 (top-K ranked paths from `graphEngine.js`/backend).

1. Render a compact list/table above `NetworkGraph.jsx`:
   | Path # | Hops | Total Risk (weight) | |
   |---|---|---|---|
   | 1 | 4 | 12.4 | 🏴 Most Likely Attack Path |
   | 2 | 5 | 15.1 | |
   | 3 | 3 | 18.9 | |
2. Rank 1 (`is_optimal: true` from the backend) gets a visible badge/highlight — don't compute "optimal" yourself in the frontend, trust the backend's `is_optimal` flag.
3. Clicking a row sets `selectedPathIndex` in `useSimulation.js`.
4. On selection change:
   - `NetworkGraph.jsx` re-highlights/camera-follows the newly selected path (pass `attackPath.nodes` for the selected index instead of always index 0).
   - `StreamPanel.jsx` and the new `SafetyCard` list (Task 1) re-run narrative/fix generation for that path (calls into Person 2's per-path narrative support).

**Acceptance check:** simulating shows 2+ ranked paths; clicking any row updates the graph highlight and regenerates narrative/fixes for that specific path.

---

## Task 3 — `NetworkSelector.jsx` (multi-network choice)

**New file:** `src/components/NetworkSelector.jsx`

Depends on Person 1's Task 2 (network folders) and Person 4's `GET /networks` endpoint.

1. On mount, fetch `GET /networks` (via `src/api/simulate.js` — ask Person 4 to add a `fetchNetworks()` export there, or add it yourself following the existing `postWithTimeout` fallback pattern with a local fallback list read directly from Person 1's local network folders).
2. Render a dropdown/card selector: network name + short description + node count.
3. Selecting a network:
   - Stores `selectedNetworkId` in `useSimulation.js`.
   - Re-fetches that network's `COMMON_ENTRY_POINTS`/`COMMON_END_GOALS` for `ScenarioSelector.jsx` (these differ per network since node IDs differ).
   - Reloads `NetworkGraph.jsx`'s topology (new nodes/edges) — clear any existing highlighted path when the network changes.
   - Disables "Simulate Attack" in `ControlBar.jsx` until both a network AND entry/goal are chosen.
4. Place this component **first** in the layout, above `ScenarioSelector.jsx` — see Task 5 for full ordering.

**Acceptance check:** switching networks changes the graph topology and available entry/goal options; simulating uses the selected network's data end to end.

---

## Task 4 — Algorithm/weighting toggle

**File:** `src/components/ControlBar.jsx`

Depends on Person 1's Task 3 (A* + dispatcher) and Person 2's Task 3 (DWM scorer).

1. Add a small selector next to "Simulate Attack": `Algorithm: [Dijkstra ▾]` with options `Dijkstra`, `A*`.
2. Add a second toggle (or combine into one control): `Weighting: [Static ▾]` with options `Static (CVSS)`, `Dynamic (DWM)`, and `ML-weighted` if Person 2 ships the stretch goal.
3. Pass both selections through `useSimulation.js` → `src/api/simulate.js` → included in the `/simulate` POST body (`algorithm`, `weighting_mode`).
4. When `weighting_mode` includes DWM/ML, show both `cvss_score` and `adjusted_weight` side by side wherever CVSS is currently displayed (in `SafetyCard.jsx` and `RiskCards.jsx`) — e.g. "CVSS 9.8 (NVD Base) · Contextual Risk 9.95".

**Acceptance check:** toggling algorithm/weighting and re-simulating produces a visibly different path or risk numbers when applicable; both CVSS numbers are shown together when DWM is active.

---

## Task 5 — Navigation restructure (`StepBar.jsx` + layout)

**New file:** `src/components/StepBar.jsx`; **modified:** `src/App.jsx`, `src/components/Header.jsx`

This is entirely your own task, no other-person dependency except needing Tasks 1-4's components to exist first so the final layout order makes sense.

1. Build `StepBar.jsx`: a thin horizontal bar under `Header.jsx` showing 5 steps:
   `1 Select Network → 2 Choose Entry/Goal → 3 Simulate → 4 Review Paths → 5 Fixes`
   Current step is derived from existing state: `selectedNetworkId` set → step 2 active; `entryNode`/`targetNode` set → step 3 active; `status === SIMULATING` → step 3 active/spinner; `status === NARRATIVE_DONE` → step 4 active; `status === COMPLETE` → step 5 active. No new state machine needed — derive from what's already in `useSimulation.js` plus your new `selectedNetworkId`/`selectedPathIndex`.
2. Reorder `App.jsx`'s grid to match: `NetworkSelector` → `ScenarioSelector` → `ControlBar` → `NetworkGraph` (with `PathList` directly above it) → `StreamPanel` → tabbed `RiskCards`/`FixPanel`.
3. Convert the `RiskCards`/`FixPanel` pair into a tab switcher ("Risks" / "Fixes") shown once a path is selected, instead of both stacked permanently. This matters more now that `FixPanel` is a full per-node card list (Task 1) and would otherwise make the page very long.
4. Leave `NetworkGraph.jsx`'s internal rendering untouched — only the props it receives change (selected path, selected network topology).

**Acceptance check:** a first-time viewer can follow the step bar through select network → pick entry/goal → simulate → review ranked paths → view fixes, without needing anything explained; page no longer permanently stacks both risk and fix panels.

---

## Order of work
1. Task 1 (`SafetyCard.jsx`) — as soon as Person 2's per-node fix events are ready.
2. Task 2 (`PathList.jsx`) — as soon as Person 1's top-K paths are ready.
3. Task 3 (`NetworkSelector.jsx`) — as soon as Person 1's network folders + Person 4's `/networks` endpoint are ready.
4. Task 4 (algorithm/weighting toggle) — after Task 3, needs Person 1/2's algorithm and DWM work.
5. Task 5 (navigation restructure) — last, since it reorders everything built above.

## Definition of done
- [ ] `SafetyCard.jsx` used in both `RiskCards.jsx` and `FixPanel.jsx`, streaming per-node
- [ ] `PathList.jsx` shows ranked paths with distances, optimal path badged, clickable
- [ ] `NetworkSelector.jsx` switches topology and dependent dropdowns correctly
- [ ] Algorithm/weighting toggle wired through to `/simulate` and reflected in results
- [ ] `StepBar.jsx` guides the full flow; Risks/Fixes shown as tabs, not permanent stack

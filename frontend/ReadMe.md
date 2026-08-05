# CyberSentinel — Frontend Dashboard (Person 3)

React + Vite dashboard for **PS10 — Generative AI for Cyber Attack Prediction**.

## What's real vs. what's standing in

- **Network data, CVEs, and the attack-path algorithm are 100% real** —
  `src/data/network.json` and `cves.json` are Person 1's actual shipped
  files (43 nodes, real NVD CVEs). `src/data/graphEngine.js` is a
  line-for-line JS port of `backend/graph.py` + `backend/scorer.py`
  (same risk-weighted Dijkstra, same edge-weight formula). It was verified
  to produce byte-identical paths to the Python version across all 16
  entry/target combinations Person 1's dropdown options support.
- **The red-team narrative and auto-fix text are generated locally**
  (`src/data/localEngine.js`) from whatever real path the graph engine
  computes, since Person 2's LLM endpoint doesn't exist yet. It's not a
  fixed script — pick a different entry point or end goal and it narrates
  *that* path's actual CVEs.
- **The moment Person 4 ships `main.py`**, the frontend switches over
  automatically — see "Switching to the real backend" below.

## Run it

```bash
npm install
npm run dev
# open http://localhost:5173
```

## Features

- **Entry point / end goal selector** — mirrors Person 1's
  `COMMON_ENTRY_POINTS` / `COMMON_END_GOALS` dropdown options from
  `graph.py` exactly (4 entry scenarios × 4 end goals).
- **NetworkGraph** — auto-layouts all 43 real nodes by BFS distance from
  the entry points (no hand-placed coordinates — this scales to whatever
  topology Person 1 ships). Colored by risk (red/orange/green). During a
  run, the camera pans and zooms to follow the node currently under
  attack, and everything off the active path dims.
- **StreamPanel** — typewriter SSE effect, severity badge, live/local
  source indicator.
- **RiskCards** — every node can carry many CVEs in the real dataset;
  shows the worst one with a "+N more" count, links to NVD.
- **FixPanel** — auto-generated remediation plan for every CVE on the path.

## Switching to the real backend

`src/api/simulate.js` calls `POST {VITE_API_BASE_URL}/simulate` and
`POST {VITE_API_BASE_URL}/fix` first, with a 1.5s timeout, then falls back
to the local engine. Once `main.py` is up:

1. Copy `.env.example` to `.env` (defaults to `http://localhost:8000`).
2. Run the backend (`uvicorn main:app --reload --port 8000`).
3. Reload the dashboard — the pill in the stream panel footer flips from
   `COMPUTED LOCALLY` to `LIVE BACKEND` automatically. No frontend code
   changes needed.

Expected SSE event shape from the backend (already implemented to match):

```
data: {"type": "path", "data": {"path": [...], "nodes": [...], "total_hops": N}}
data: {"type": "token", "data": "Step"}
...
data: [DONE]
```

## File map

```
src/
├── App.jsx                    Dashboard shell / grid layout
├── components/
│   ├── Header.jsx               Branding + scenario selector + control bar
│   ├── ScenarioSelector.jsx      Entry point / end goal dropdowns
│   ├── ControlBar.jsx            Simulate Attack / Reset buttons
│   ├── NetworkGraph.jsx          React Flow topology, auto-layout, camera-follow
│   ├── RiskNode.jsx              Custom React Flow node
│   ├── StreamPanel.jsx           SSE narrative, typewriter effect, severity badge
│   ├── SeverityBadge.jsx         CRITICAL/HIGH/MEDIUM pill
│   ├── RiskCards.jsx             CVE / CVSS cards per vulnerable node
│   └── FixPanel.jsx              Auto-fix remediation panel
├── hooks/useSimulation.js      Orchestrates simulate → fix streaming state
├── api/simulate.js             Live-backend fetch+SSE reader with local fallback
└── data/
    ├── network.json              Person 1's real topology (43 nodes)
    ├── cves.json                  Person 1's real CVEs (grouped, real NVD IDs)
    ├── graphEngine.js             JS port of graph.py + scorer.py (verified identical)
    ├── layoutEngine.js            Auto-layout for the real topology
    ├── localEngine.js             Dynamic narrative/fix generator (stands in for llm.py)
    └── layout.js                  Risk color thresholds
```

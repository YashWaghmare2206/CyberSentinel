# CyberSentinel — Phase 2 — Person 4: Integration, DevOps & Presentation Lead

> Give this file to your coding agent along with repo access.
> Your job is the seam between everyone else's work: the API contract, testing parity, and the demo narrative. Most of your tasks are blocked on the other three people's schema changes landing first — coordinate timing accordingly.

## Your ownership (unchanged from Phase 1)
`main.py` (FastAPI integration layer — this may not have shipped yet in Phase 1; if so, this phase is also when you finish standing it up), plus overall testing/deployment/demo scripting.

## Ground rules
- The frontend (`src/api/simulate.js`) already has a live-backend-first, local-fallback-second pattern with a 1.5s timeout. Your job is to make the **live** side match what the local fallback already does — don't change the frontend's fallback logic.
- Every endpoint you add or change must keep the SSE (`text/event-stream`) format the frontend already parses (`data: {...}\n\n`, terminated by `data: [DONE]\n\n`).

---

## Task 1 — Stand up / extend `main.py` core endpoints

**File:** `main.py`

If `main.py` doesn't exist yet or is incomplete from Phase 1, this is priority zero — everything else in this README depends on it existing.

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from backend.graph import build_graph, find_attack_paths, list_networks

app = FastAPI()

@app.get("/networks")
async def get_networks():
    """Returns Person 1's list_networks() output."""
    return list_networks()

@app.post("/simulate")
async def simulate(payload: dict):
    """
    payload: { entry_node, target_node, network_id?, algorithm?, weighting_mode? }
    Streams SSE events matching what src/data/localEngine.js already produces:
    { type: "path", data: [...] }  then narrative token events, then { type: "done" }
    """
    network_id = payload.get("network_id", "enterprise-bank")
    algorithm = payload.get("algorithm", "dijkstra")
    weighting_mode = payload.get("weighting_mode", "static")
    G = build_graph(network_id, weighting_mode=weighting_mode)
    paths = find_attack_paths(G, payload["entry_node"], payload["target_node"], algorithm=algorithm)
    return StreamingResponse(stream_simulation_events(paths), media_type="text/event-stream")

@app.post("/fix")
async def fix(payload: dict):
    """payload: { attack_path } -> streams per-node node_fix events from Person 2's llm.py"""
    ...
```

**Acceptance check:** `GET /networks`, `POST /simulate`, `POST /fix` all respond; frontend's 1.5s-timeout live-check in `src/api/simulate.js` successfully detects the live backend instead of always falling back to local.

---

## Task 2 — Extend `/simulate` payload for multi-path + multi-network

Depends on Person 1's Task 1 (top-K paths) and Task 2 (network folders).

1. Accept `network_id` in the request body; pass through to `build_graph(network_id)`.
2. Accept `algorithm` (`"dijkstra"` | `"astar"`); pass through to `find_attack_paths(..., algorithm=algorithm)`.
3. Accept `weighting_mode` (`"static"` | `"dwm"` | `"ml"`, if Person 2 ships it); pass through to `build_graph(..., weighting_mode=weighting_mode)`.
4. Response's `path` event must now carry the **full ranked array** from Person 1's function (not a single path), matching the shape the frontend's `PathList.jsx` expects:
   ```json
   { "type": "path", "data": [ {"rank":1,"is_optimal":true,"nodes":[...],"total_weight":12.4,"total_hops":4}, ... ] }
   ```

**Acceptance check:** POSTing with different `network_id`/`algorithm`/`weighting_mode` combinations produces correctly different responses; malformed/missing fields default sensibly (`enterprise-bank`, `dijkstra`, `static`).

---

## Task 3 — `/fix` endpoint: per-node streaming

Depends on Person 2's Task 1 (`node_fix` events in `localEngine.js` / eventual `llm.py`).

1. Update `/fix` to stream `node_fix` events (one per node in the path, in order) instead of a single `fix_token` stream — mirror exactly what `localEngine.js`'s `localFixStream()` already does, since the frontend's fallback and live paths must produce parity-matching event shapes.
2. If Person 2's real `llm.py` isn't ready yet, this endpoint can proxy/reuse the logic from `localEngine.js` ported to Python as a placeholder — just keep the event shape identical so the frontend doesn't need a live/local branch difference.

**Acceptance check:** `/fix` streams one `node_fix` event per node, each with `{issue, impact, fix}` — same shape whether served live or via local fallback.

---

## Task 4 — Parity testing (live vs local fallback)

This is the same standard Phase 1 already established for `graph.py` vs `graphEngine.js` — extend it to cover every new field.

1. Write a small test script (`scripts/test_parity.py` or similar) that:
   - Calls the real `find_attack_paths()` (Python) and the JS `graphEngine.js` equivalent (via Node) with the same inputs across all 3 networks.
   - Asserts identical `total_weight`, `total_hops`, and node ordering for every rank.
   - Repeats for both `algorithm` values and both `weighting_mode` values.
2. Run this before every demo/deploy — if `graphEngine.js` (Person 1's JS port) drifts from `graph.py`, the frontend's local fallback will silently show wrong data during a live demo if the backend happens to be down.

**Acceptance check:** parity script passes with zero diffs across all network × algorithm × weighting_mode combinations.

---

## Task 5 — Deployment

1. Confirm environment variables needed for Person 2's real LLM calls (API key for whichever provider — Groq/Gemini/Claude — from the Phase 1 blueprint's LLM API Options section) are documented in `.env.example` and set in the deploy target.
2. Deploy `main.py` (same target/process as Phase 1 planned — e.g. Render/Railway/Fly, or whatever was chosen) with the new `/networks` and updated `/simulate`/`/fix` routes.
3. Update `VITE_API_BASE_URL` in the frontend's env config to point at the deployed URL so `src/api/simulate.js` finds the live backend instead of always timing out to local.

**Acceptance check:** deployed frontend, when loaded fresh, successfully calls the live backend for `/networks` and `/simulate` (verify via network tab — should not silently be using the local fallback).

---

## Task 6 — Demo script for the new features

Update/extend the presentation for judges to explicitly showcase Phase 2:

1. **Multi-path comparison:** run one simulation, show 3+ ranked paths in `PathList.jsx`, click between them to show the graph and fixes updating live.
2. **Network switching:** switch from `enterprise-bank` to `small-branch-bank` mid-demo to show the system isn't hardcoded to one topology.
3. **DWM before/after:** run the same entry/target with `weighting_mode=static` vs `dwm`, point out where the optimal path changes because of a KEV-listed or internet-facing CVE — this is the strongest "we understand CVSS isn't the whole picture" talking point from the Phase 2 plan.
4. **Per-node safety cards:** scroll through `SafetyCard`s during the fix phase, emphasizing issue → impact → fix per hop instead of a wall of text.

**Acceptance check:** a full run-through of all 4 demo beats works end-to-end on the deployed live backend (not the local fallback), timed to fit the pitch slot.

---

## Order of work
1. Task 1 (`main.py` core endpoints) — do this immediately, everything else depends on it.
2. Task 2 (`/simulate` extensions) — as soon as Person 1's Task 1/2 land.
3. Task 3 (`/fix` extensions) — as soon as Person 2's Task 1 lands.
4. Task 4 (parity testing) — ongoing, re-run after every merged change from the other three.
5. Task 5 (deployment) — once Tasks 1-3 are stable.
6. Task 6 (demo script) — last, once everything is deployed and parity-tested.

## Definition of done
- [ ] `main.py` serves `/networks`, `/simulate`, `/fix` with correct SSE shapes
- [ ] `/simulate` accepts and correctly applies `network_id`, `algorithm`, `weighting_mode`
- [ ] `/fix` streams per-node `node_fix` events matching the local fallback's shape
- [ ] Parity test passes across all network × algorithm × weighting_mode combinations
- [ ] Live backend is deployed and reachable by the frontend (not silently falling back to local)
- [ ] Demo script covers multi-path, network switching, DWM before/after, and per-node fixes

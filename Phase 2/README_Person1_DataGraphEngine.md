# CyberSentinel — Phase 2 — Person 1: Data & Graph Engine

> Give this file to your coding agent (Claude Code, Cursor, etc.) along with repo access.
> It should read this top to bottom and implement each task in order — later tasks depend on earlier ones.

## Your ownership (unchanged from Phase 1)
`backend/graph.py`, `backend/scorer.py`, `data/network.json`, `data/cves.json`, `src/data/graphEngine.js` (the verified JS port of the two backend files).

## Ground rules
- Do **not** rewrite `build_graph()` or `calculate_edge_weight()` from scratch — extend them. They work today and Person 3's frontend depends on their current output shape unless explicitly changed below.
- Every backend (`.py`) change you make must be mirrored in `src/data/graphEngine.js` so the local-fallback path stays byte-identical to the live backend, exactly like Phase 1.
- Keep the existing single-path behavior working as a fallback (`algorithm="dijkstra"`, `top_k=1`) so nothing already built breaks mid-migration.

---

## Task 1 — Top-K ranked attack paths (feeds Person 3's `PathList.jsx`)

**File:** `backend/graph.py`, mirrored in `src/data/graphEngine.js`

1. Replace the single `nx.dijkstra_path(...)` call in `find_attack_paths()` with:
   ```python
   from itertools import islice
   paths_gen = nx.shortest_simple_paths(G, source, target, weight="weight")
   top_paths = list(islice(paths_gen, TOP_K))  # TOP_K = 5
   ```
2. For each path, compute:
   - `total_weight` = sum of edge weights along the path
   - `total_hops` = `len(path) - 1`
3. Sort ascending by `total_weight` (lowest weight = most efficient/dangerous route for the attacker, since weight is inverted CVSS).
4. Return a list of objects, not a single object:
   ```json
   [
     {
       "rank": 1,
       "is_optimal": true,
       "nodes": [ ...existing per-node shape... ],
       "total_weight": 12.4,
       "total_hops": 4
     },
     { "rank": 2, "is_optimal": false, ... }
   ]
   ```
5. Add `find_attack_paths_astar()` — see Task 3 — as an alternate to this function, both callable from the same dispatcher.
6. **Port to JS:** update `graphEngine.js`'s equivalent function identically. Add a quick parity test/script comparing Python and JS output for the same `entry_node`/`target_node` pair (Phase 1 already had a verification step for this — reuse that pattern).

**Acceptance check:** calling the function with any valid entry/target returns an array of up to 5 paths, ascending by `total_weight`, rank 1 marked `is_optimal: true`.

---

## Task 2 — Multiple network topologies

**Files:** new `data/networks/<id>/network.json` + `cves.json` per topology, `backend/graph.py`

1. Create folder structure:
   ```
   data/networks/
     enterprise-bank/network.json   <- move the EXISTING 43-node files here unchanged
     enterprise-bank/cves.json
     small-branch-bank/network.json <- NEW, smaller topology, same JSON schema
     small-branch-bank/cves.json
     legacy-iot-bank/network.json   <- NEW, IoT/legacy-device-heavy topology, same schema
     legacy-iot-bank/cves.json
   ```
2. `small-branch-bank`: ~10-15 nodes, single clear entry→target chain, good for quick demos.
3. `legacy-iot-bank`: emphasize older/unpatched device nodes as entry points, deeper chains to the core DB, to contrast against `enterprise-bank`.
4. Add to `graph.py`:
   ```python
   def list_networks() -> list[dict]:
       """Scans data/networks/*, returns [{id, name, description, node_count}]"""

   def build_graph(network_id: str = "enterprise-bank") -> nx.DiGraph:
       """Resolves network.json/cves.json from data/networks/<network_id>/ instead of
       the old fixed DEFAULT_NETWORK_PATH."""
   ```
5. Every network's `network.json` needs a top-level `name` and `description` field (used by `list_networks()`).

**Acceptance check:** `list_networks()` returns 3 entries; `build_graph("small-branch-bank")` builds a valid graph from that folder's files.

---

## Task 3 — A* algorithm + algorithm dispatch

**File:** `backend/graph.py` (new function, or new `backend/astar.py` if you prefer a separate file)

1. Add:
   ```python
   def find_attack_paths_astar(G, source, target, top_k=5) -> list[dict]:
       """Same return shape as Task 1's Dijkstra function.
       Heuristic: estimate remaining hops to target × average CVSS along
       edges seen so far. Use nx.astar_path(G, source, target, heuristic=h, weight="weight")."""
   ```
2. Add a single dispatcher other code (and Person 4's API layer) calls:
   ```python
   def find_attack_paths(G, source, target, algorithm="dijkstra", top_k=5) -> list[dict]:
       if algorithm == "astar":
           return find_attack_paths_astar(G, source, target, top_k)
       return find_attack_paths_dijkstra(G, source, target, top_k)  # Task 1's function, renamed
   ```
3. Rename your Task 1 function to `find_attack_paths_dijkstra` so both are cleanly selectable; keep `find_attack_paths` as the single public entry point Person 4's API and Person 3's local fallback both call.

**Acceptance check:** `find_attack_paths(G, source, target, algorithm="astar")` returns a valid, differently-ordered (or same, depending on graph) path list vs `algorithm="dijkstra"`.

---

## Task 4 — Data fields for Dynamic Weight Management (DWM)

**Files:** `data/networks/*/cves.json`, `data/networks/*/network.json`

DWM logic itself is **Person 2's** job (`dwm_scorer.py`) — your job is only to supply the data fields it needs, for every network folder from Task 2.

1. Add to every CVE object in every `cves.json`:
   ```json
   {
     "cve_id": "CVE-2023-XXXXX",
     "cvss_score": 9.8,
     "kev_listed": true,
     "days_since_published": 412,
     "patch_available": true
   }
   ```
   `kev_listed` = true if the CVE appears on CISA's Known Exploited Vulnerabilities list (check https://www.cisa.gov/known-exploited-vulnerabilities-catalog for real CVE IDs you're already using, or set plausible demo values if using synthetic CVEs).
2. Add to every node object in every `network.json`:
   ```json
   { "id": "...", "exposure": "public" }  // or "internal" | "critical"
   ```
   This likely already maps to your existing `type` field — formalize it as its own explicit `exposure` attribute rather than overloading `type`.

**Acceptance check:** every CVE has all 3 new fields; every node has `exposure`; Person 2 can import `dwm_scorer.py` and get non-null inputs for every edge.

---

## Order of work
1. Task 1 (top-K paths) — unblocks Person 3's `PathList.jsx` immediately.
2. Task 2 (multi-network) — unblocks Person 3's `NetworkSelector.jsx` and Person 4's `/networks` endpoint.
3. Task 4 (DWM data fields) — unblocks Person 2's `dwm_scorer.py`.
4. Task 3 (A*) — lowest priority, purely additive, can be done last.

## Definition of done
- [ ] `find_attack_paths()` returns ranked top-K paths with `total_weight`/`total_hops`/`is_optimal`
- [ ] `graphEngine.js` mirrors the above exactly (parity-checked)
- [ ] 3 network folders exist under `data/networks/`, each with valid `network.json` + `cves.json`
- [ ] `list_networks()` and `build_graph(network_id)` work
- [ ] `find_attack_paths_astar()` and the `algorithm` dispatcher work
- [ ] Every CVE has `kev_listed`, `days_since_published`, `patch_available`; every node has `exposure`

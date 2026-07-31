# CyberSentinel: Enterprise Attack Path Simulation Engine

## 1. Project Overview

CyberSentinel is an automated cybersecurity modeling platform designed to simulate, visualize, and predict multi-hop enterprise attack paths (kill chains) across a simulated banking infrastructure. By combining real-world NIST National Vulnerability Database (NVD) intelligence with a NetworkX-driven graph pathfinding engine, the system evaluates server risks and computes optimal paths of least resistance using Dijkstra's algorithm.

---

## 2. Exact Project Directory & File Structure

To prevent file overlap and merge conflicts during team collaboration, all developers must adhere to this exact directory layout:

```text
CyberSentinel/
│
├── backend/
│   ├── data/
│   │   ├── network.json        # Generated 50-node topology map (Person 1 output)
│   │   └── cves.json           # Cached NIST NVD vulnerability database (Person 1 output)
│   │
│   ├── data_pipeline.py        # Generates nodes, edges, and caches NVD CVE records
│   ├── graph.py                # Graph construction, risk scoring, and Dijkstra pathfinding
│   ├── scorer.py               # Inverts CVSS scores into positive pathfinding weights
│   ├── visualize.py            # CLI test menu and Matplotlib visualizer
│   │
│   ├── api.py                  # [Person 4 Target] FastAPI server routes & endpoints
│   └── agent.py                # [Person 2 Target] LLM integration prompt-builder
│
├── frontend/                   # [Person 3 Target] React / UI Application
│   ├── src/
│   │   ├── components/         # Dropdowns, Dashboard elements, and UI containers
│   │   └── App.jsx
│   └── package.json
│
├── .gitignore                  # Excludes virtual environments and local caches
└── README.md                   # Project documentation

```

---

## 3. Team Collaboration & Git Branching Rules

To ensure seamless integration and avoid overlapping code conflicts:

* **Feature Branching:** Never commit directly to `main`. Every team member must create a dedicated branch (e.g., `git checkout -b feature/person-2-llm-agent`).
* **Isolated Folders:** Person 1 owns `backend/data_pipeline.py`, `graph.py`, and `scorer.py`. Person 2 owns `backend/agent.py`. Person 4 owns `backend/api.py`. Person 3 owns the `frontend/` directory. Do not modify files outside your assigned domain.
* **Pull Request Reviews:** Merge code into `main` only via Pull Requests after local validation.

---

## 4. Comprehensive Developer Guide & Scaling Instructions

### Instructions for Person 1: Backend Infrastructure & Data Core (Completed)

* **Core File:** `backend/data_pipeline.py`

* **Current Implementation:** Generates a 50-node enterprise banking network spanning 5 security zones and queries the NIST NVD API with software profile caching.


* **Scaling Guidelines:** If expanding beyond 50 nodes (e.g., 100+ nodes), update the `sw_pool` dictionary and loop multipliers in `generate_network_topology()`. Ensure that newly added nodes include valid `"id"`, `"name"`, `"type"`, and `"software"` keys so downstream graph builders can consume them without structural breaks.

### Instructions for Person 2: LLM Prompt & Attack Story Agent

* **Target File:** `backend/agent.py`
* **Role & Work Integration:** Consume the dictionary payload returned by `find_attack_paths()` in `backend/graph.py`.


* **Implementation Requirement:** Write a function that takes the list of nodes and CVE descriptions along the computed path and formats them into a system prompt for Gemini or Groq.
* **Scaling Adaptation:** If system scaling introduces larger multi-hop paths (exceeding 10+ hops), ensure your prompt builder implements token-truncation or summarizes intermediate healthy nodes, focusing the LLM's narrative window primarily on critical CVSS nodes and high-risk security boundaries.

### Instructions for Person 3: Frontend UI & Network Visualizer

* **Target Directory:** `frontend/`
* **Role & Work Integration:** Build an interactive React dashboard that fetches dropdown options via Person 4’s API.


* **Implementation Requirement:** Use libraries like Cytoscape.js, React Flow, or D3.js to render the network nodes dynamically. Bind the dropdown selections (`COMMON_ENTRY_POINTS` and `COMMON_END_GOALS`) from `graph.py` to UI select components.


* **Scaling Adaptation:** When rendering large networks (50+ nodes), implement canvas zooming, panning, and cluster filtering. Avoid rendering heavy text labels for all nodes simultaneously to prevent the "hairball" visualization overlap issue.

### Instructions for Person 4: FastAPI Server & Integration

* **Target File:** `backend/api.py`
* **Role & Work Integration:** Expose the Python backend logic as a REST API for the React frontend.


* **Implementation Requirement:** Create FastAPI endpoints:
* `GET /api/options`: Calls `get_dropdown_options()` from `backend/graph.py` to serve source and destination maps.


* `POST /api/simulate`: Accepts JSON payload containing `entry_node` and `target_node`, runs `build_graph()` and `find_attack_paths()`, and returns the kill chain JSON payload to the frontend.




* **Scaling Adaptation:** Implement background caching for `build_graph()` so that heavy graph structures are loaded once into memory on startup rather than re-parsed on every incoming API request, maintaining low latency as network node counts scale up.
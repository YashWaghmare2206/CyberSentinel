# CyberSentinel — Complete Repository Extraction & Integration Report

**Repository Source:** [https://github.com/YashWaghmare2206/CyberSentinel/tree/master](https://github.com/YashWaghmare2206/CyberSentinel/tree/master)  
**Date:** October 4, 2026  
**Status:** ✅ Fully Integrated, Built, and Running Live  

---

## 1. Executive Summary

The entire repository from `https://github.com/YashWaghmare2206/CyberSentinel/tree/master` (255 files including all neural network training samples, model weights, benchmarks, DWM scorers, citations, and documentation) has been extracted into this workspace. The frontend has been configured to restore the split-screen SOC layout, typewriter narrative speed, node-by-node 1-by-1 path progression, and multi-network topology modeling, while incorporating the upstream CISO Executive Report Modal and Project Explainer / Viva Sandbox.

---

## 2. Groq / Grok API Key Verification

1. **Upstream Remote Repo Audit (`master` branch):**
   * `backend/.env.example` contains `GROQ_API_KEY=` (empty).
   * `README.md` contains placeholder `GROQ_API_KEY=gsk_your_api_key_here`.
   * Real `.env` files are excluded by `.gitignore` and not present on GitHub.
   * **Conclusion:** Upstream repo contains no active Groq/Grok API keys.
2. **Local Configuration & Dynamic Loader:**
   * Your active Groq API key is configured in `backend/.env` (protected by `.gitignore`).
   * `backend/llm.py` dynamically auto-detects and hot-reloads keys without requiring server restarts.
   * Model cascading is configured so retired model names automatically fall back to fast inference models (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`, `qwen/qwen3.8-27b`) with offline simulation fallback.

---

## 3. Extracted Components from Master Repo

* **All 255 Upstream Files Extracted:**
  * `README.md`: Upstream documentation and project blueprint.
  * `Readmes/`: Upstream citations (`CREDIBILITY_AND_APPLICABILITY.md`, `EVALUATION_METRICS.md`, `NETWORK_ARCHITECTURE_CITATIONS.md`).
  * `backend/`:
    * `ml_scorer.py`: Learned logistic regression risk scorer.
    * `dwm_scorer.py`: Dynamic Weight Management with temporal and environmental CVSS multipliers and formula receipt breakdown.
    * `benchmark.py` & `benchmark_results.json`: Algorithm evaluation benchmarks.
    * `pignn/`: Neural architecture (`model.py`, `train.py`, `evaluate.py`, `dataset.py`, `decoder.py`, `inference.py`).
    * `weights/cybersentinel_pignn.pth`: Pretrained PIGNN neural model weights.
    * `data/pignn/generated/`: Complete set of 160 synthetic banking graph training tensors (`sample_0001.pt` to `sample_0159.pt`).
    * `requirements.txt`: Standardized dependency definitions.
  * `frontend/`:
    * `ExecutiveReportModal.jsx` & `.css`: CISO audit briefing modal with one-click print-to-PDF export.
    * `components/explainer/`: Layman Project Explainer, Viva cheat-sheet, and Star Schema ERD diagram.
    * `data/dwmScorer.js` & `api/warehouse.js`: Upstream data modules.

---

## 4. Frontend Enhancements & Restored Capabilities

The frontend has been configured to deliver the complete, polished experience:
1. **Interactive Control Header (`Header.jsx`)**:
   * **Network Selector**: Dropdown supporting all 6 topologies (`enterprise-bank`, `cloud-fintech-core`, `defense-aerospace-corp`, `healthcare-hospital-system`, `small-branch-bank`, `legacy-iot-bank`).
   * **Threat Scenario Dropdown**: Real-world entry points and threat targets customized per topology.
   * **Algorithm Selector**: Switch between Physics-Informed GNN (PIGNN), Top-K Dijkstra, and A* Search.
   * **Risk Model Selector**: Switch between Static CVSS, Dynamic Weight (DWM), and Machine Learning (ML).
   * **Workspace Toggle**: Switch between **Live Simulation** (default) and **💡 Project Guide & Viva Sandbox**.
   * **Executive Report Button**: Quick trigger for the CISO Threat Briefing modal.
2. **Split-Screen SOC Dashboard (`.dashboard`)**:
   * **Left Canvas (`NetworkGraph.jsx`)**:
     * Interactive force-directed network topology.
     * **Hop-by-Hop Animated Progression (`activeHopIndex`)**: Dynamically highlights nodes and edges 1-by-1 as each step is typed in the narrative, rather than jumping straight to the end.
   * **Right Console (`.dashboard__console`)**:
     * **Tab 02 (Kill Chain Narrative)**: Real-time LLM token stream with **human-readable typewriter pacing** (~26ms delay) so operators can read the kill chain steps as they unfold.
     * **Tab 03 (Auto-Fix Remediation)**: Auto-generated remediation actions, copyable firewall ACL rules, and vendor patch advisories.
     * **Tab 04 (Risk Cards)**: Detailed CVE cards with MITRE ATT&CK technique tags, CVSS ratings, DWM contextual scores, and expandable DWM scoring formula receipts.
3. **Detail Dock**:
   * Bottom floating dock providing instant access to fullscreen Risk Cards, Auto-Fix Instructions, and CISO Executive PDF Reports.

---

## 5. Live Server Status

| Component | Port / URL | Status |
| :--- | :--- | :--- |
| **FastAPI Backend** | `http://localhost:8000` | ✅ Running (`HTTP 200 OK`) |
| **Vite Frontend** | `http://localhost:5173` | ✅ Running (`HTTP 200 OK`) |

---

## 6. Bug Fixes & Diagnostics

### Issue 1: "Simulation failed. Invalid entry point: api_gw_1 not in network map"
* **Root Cause**: `frontend/src/data/graphEngine.js` and `backend/graph.py` only had predefined scenario dropdown entries for 3 networks. When the user switched to `cloud-fintech-core`, `defense-aerospace-corp`, or `healthcare-hospital-system`, `getNetworkScenarios()` fell back to `enterprise-bank`, causing `api_gw_1` and `swift_terminal` to be submitted to a network where those node IDs did not exist.
* **Fix**:
  * Added all 6 networks and their realistic threat scenarios into `NETWORK_OPTIONS` and `NETWORKS` in both `frontend/src/data/graphEngine.js` and `backend/graph.py`.
  * Added active state synchronization effect in `frontend/src/hooks/useSimulation.js` so `entryNode` and `targetNode` automatically switch to the first valid entry/exit pair for the selected topology.

### Issue 2: Blank 3D Force Graph Canvas
* **Root Cause**: Under React 18 `StrictMode`, the initial mount/unmount cycle wiped `containerRef.current.innerHTML = ""` but left `fgRef.current` pointing to the destroyed instance. The second mount hit `if (fgRef.current) return;` and aborted re-initialization, leaving the DOM canvas element completely empty. Additionally, initial CSS grid dimensions before paint had 0 width/height.
* **Fix**:
  * Set `fgRef.current = null; hasFitRef.current = false;` in the cleanup function.
  * Installed a `ResizeObserver` on `containerRef.current` to automatically detect parent container dimensions and resize the Three.js canvas dynamically.
  * Added a dedicated `useEffect` on `graphData` so switching networks immediately loads new nodes/links into the 3D scene and centers them with `zoomToFit()`.
  * Made panel title and node count reactive to the active network (e.g. `NETWORK_TITLES[networkId]` and `graphData.nodes.length`).

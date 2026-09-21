# CyberSentinel — Phase 2 Presentation & Demo Script
**Track: PS10 — Generative AI for Cyber Attack Prediction**

This script outlines the exact 4-step demonstration flow for presenting CyberSentinel Phase 2 to judges and stakeholders.

---

## ⏱ Demo Outline (3 to 5 Minutes)

| Beat | Feature Highlight | Action in UI | Key Pitch Talking Point |
|---|---|---|---|
| **Beat 1** | **Multi-Path Comparison** | Run simulation from `Public API Gateway` to `SWIFT Terminal`. Show ranked routes in `PathList.jsx`, click `ROUTE #2` and `ROUTE #3`. | *"Attackers don't just follow one fixed route. Our engine identifies and ranks the Top-K alternative kill chains using Yen's Dijkstra & A\* pathfinding, allowing instant inspection and comparison."* |
| **Beat 2** | **Multi-Network Topologies** | Switch network dropdown from `Enterprise Bank` to `Small Branch Bank` or `Legacy IoT Bank`. | *"CyberSentinel is not a single hardcoded toy. Our graph engine dynamically ingests diverse enterprise topologies with distinct security perimeters and real NVD/CISA datasets."* |
| **Beat 3** | **DWM & ML Risk vs Static CVSS** | Toggle Risk Model from `Static CVSS` to `Dynamic Weight (DWM)` or `Machine Learning (ML)`. Re-simulate. | *"Standard CVSS is static and blind to context. Our Dynamic Weight Management (DWM) and ML scorers evaluate CISA KEV exploitation status, vulnerability age, and asset exposure in real time."* |
| **Beat 4** | **Structured Remediation & Auto-Fix** | Open `05 Remediation / Auto-Fix` tab in the lower dock. Review individual `SafetyCard`s and click `Deploy All Fixes`. | *"Rather than a massive unparseable text dump, our GenAI agent outputs structured per-node SafetyCards with concrete CVE patches, priorities, and instant deployable remediation."* |

---

## 🎬 Step-by-Step Presentation Script

### 1. Introduction (30 seconds)
> *"Welcome to CyberSentinel. Traditional threat modeling relies on manual guesswork or static CVSS scores that miss real-world exploitability. We built an autonomous generative AI engine that ingests live enterprise network topologies, calculates multi-hop attack vectors, and predicts how an adversary will compromise your crown jewels—before the breach happens."*

### 2. Multi-Path Kill Chain Simulation (60 seconds)
1. In the header bar, select:
   - **Network:** `Enterprise Bank`
   - **Algorithm:** `Top-K Dijkstra`
   - **Risk Model:** `Static CVSS`
   - **Entry point:** `Public API Gateway` → **End goal:** `SWIFT Terminal`
2. Click **Simulate Attack**.
3. **Point to the 3D Graph & Pacing:**
   > *"Watch the 3D graph: our camera tracks each breach in real time as the attacker pivots through unpatched hosts. Notice the directional red breach particles traversing the perimeter."*
4. **Point to PathList:**
   > *"Directly above the graph, notice `★ OPTIMAL`, `ROUTE #2`, and `ROUTE #3`. By clicking Route #2, the system instantly switches active paths in-memory without expensive re-computation."*

### 3. Dynamic Weight Management (DWM) vs Static CVSS (60 seconds)
1. In the header, change **Risk Model** from `Static CVSS` to `Dynamic Weight (DWM)`.
2. Explain the math:
   > *"Under pure CVSS, an unexploited vulnerability with a high theoretical score looks dangerous. But our DWM algorithm factors in whether the CVE is actively listed on the CISA KEV catalog (1.3x multiplier), whether a patch is available, and whether the host is publicly exposed. This dynamically reroutes the predicted kill chain to reflect true adversary behavior."*
3. Show the dual badge on the hosts:
   - `CVSS 9.8 (NVD Base)` alongside `DWM Risk 9.95` or `ML Risk`.

### 4. Topology Invariance (30 seconds)
1. In the header, switch **Network** to `Small Branch Bank`.
2. Notice the instant topology shift:
   - Graph re-renders the branch topology.
   - Entry points update to branch VPN gateways and teller workstations.
3. Show that both backend and frontend adapt automatically.

### 5. Structured Auto-Fix Remediation (45 seconds)
1. Click **05 // Remediation** in the `StepBar` or **04 // Auto-Fix Instructions** in the bottom dock.
2. Highlight the `SafetyCard` layout:
   > *"No giant wall of text. Each card isolates one breached host, its NIST NVD CVE link, exact business impact, and specific vendor patch."*
3. Click **Deploy All Fixes**:
   > *"With one click, remediation tasks are pushed to operations, transitioning the state to '✓ All Fixes Applied'."*

---

## 💻 Technical Verifications to Demonstrate

- **Parity Test:** Show `python scripts/test_parity_and_integration.py` passing all 6 tests with 0 errors.
- **JS Parity Test:** Show `node scripts/test_parity.js` passing with 0 errors.
- **Production Build:** Show `npm run build` compiling in under 1 second.

# CyberSentinel: Enhanced Physics-Informed Graph Neural Network (PIGNN) Architecture & Integration Plan

## 1. Executive Summary & Enhancement Rationale

### Does Changing from the Original Plan to This Enhanced Plan Enhance Your Project?
**Yes, substantially.** While the original draft in `CyberSentinel_PIGNN_Implementation_Plan.docx` provided a strong conceptual foundation based on the François et al. (2025) paper, adapting it directly without addressing fundamental real-world engineering constraints would have resulted in build failures, inability to generalize across banking scenarios, and numerical instability.

Here is exactly how the enhanced architecture elevates CyberSentinel:

| Area | Original Plan Limitation | Enhanced Architecture Solution | Project Enhancement Value |
| :--- | :--- | :--- | :--- |
| **Dependency Portability** | Depended on `torch_geometric` (PyG). PyG is not installed in the workspace and frequently suffers Windows C++ compiler and CUDA ABI incompatibilities with `torch_scatter`/`torch_sparse`. | **Pure PyTorch Implementation**: Built using vectorized native PyTorch matrix operations ($A_{r} \cdot X \cdot W_r$). | **Zero Installation Friction**: Works out of the box with standard `torch` (v2.6.0) already installed. No binary DLL conflicts. |
| **Topology Scale Invariance** | Inherited the paper's fixed $361 \times 361$ dense MLP head. CyberSentinel graphs range from 5 to 47+ nodes (`legacy-iot-bank`, `small-branch-bank`, `enterprise-bank`). Fixed dense matrices crash on variable $N$. | **Dynamic Node Masking + Inductive Edge Predictor Head**: Uses padded tensors ($N_{\max} = 64$) with boolean node masks $M \in \{0, 1\}^{N_{\max}}$ and pairwise representation $[h_u \,\|\, h_v \,\|\, h_u \odot h_v \,\|\, e_{uv}]$. | **Universal Model**: A single trained model works seamlessly across all banking networks without retraining or crashing on different node counts. |
| **Physics Loss Numerical Stability** | Paper's cycle loss $\text{Tr}(Y^k)$ and raw degree penalties risk exploding gradients and vanishing path signals on sparse directed graphs. | **Stabilized Flow Conservation & Normalized Cycle Penalties**: Formulates $L_{\text{degree}}$ as directed flow conservation $\sum_v (d_{in}(v) - d_{out}(v) - \delta_v)^2$, 2-cycle suppression via $Y \odot Y^T$, and normalized cycle traces. | **Fast, Stable Convergence**: Prevents trivial all-zero degenerate minima and trains reliably in fewer epochs. |
| **Training Ground Truth (No Label Leakage)** | Original plan warned against using DWM shortest-paths as ground truth, but lacked a concrete generator for non-circular labels. | **Multi-Stage Adversarial Kill-Chain Simulator**: Generates realistic attack paths modeling initial access, credential theft, lateral movement, privilege escalation, and crown-jewel targeting using CVSS exploitability metrics, attack vectors, and CISA KEV status. | **Scientific Integrity**: The neural model learns genuine attacker progression patterns rather than memorizing a hardcoded shortest-path formula. |
| **Guaranteed Reachability** | Raw neural output $\hat{Y}_{u,v} \in [0, 1]$ can predict disjoint edges or invalid hops. | **Constrained Topology Decoder**: Strictly masks non-existent edges with the actual network adjacency matrix, eliminates self-loops, and extracts valid simple paths using predicted edge costs $-\log(\hat{Y}_{uv} + \epsilon)$ with geometric-mean path confidence. | **Zero Hallucinations**: Every predicted path is physically valid and executable on the target network. |
| **Preservation of Existing Work** | Risk of breaking existing classical pathfinding, DWM, or frontend components. | **Non-Breaking Pluggable Architecture**: Implements PIGNN as a selectable algorithm (`algorithm="pignn"`) alongside Dijkstra and A*, preserving all downstream LLM streaming, MITRE ATT&CK mapping, RiskCards, and FixPanel. | **Backward Compatibility**: Fully preserves all work completed in Phase 1 and Phase 2. |

---

## 2. Theoretical Architecture

### 2.1 Graph Formulation
For a network with $N$ hosts ($N \le N_{\max} = 64$):
- **Typed Adjacency Tensor $A \in \mathbb{R}^{N \times N \times R}$**: Encodes directed edges categorized into $R=8$ relation types:
  1. `api_call` (HTTP/HTTPS/REST)
  2. `database_access` (SQL, Oracle, Postgres, MongoDB)
  3. `admin_access` (SSH, RDP, Telnet)
  4. `authentication` (LDAP, Kerberos, Active Directory)
  5. `remote_service` (RPC, SMB, NFS)
  6. `firewall_control` (Management interface, packet filters)
  7. `network_route` (Routing, gateway, VPN forwarding)
  8. `legacy_protocol` (Modbus, SCADA, unencrypted legacy protocols)
- **Node Feature Matrix $F \in \mathbb{R}^{N \times 20}$**: 20 normalized security features:
  - Features 1–7: One-hot node role (`public_gateway`, `web_app`, `database`, `auth_admin`, `firewall`, `endpoint`, `critical_vault`)
  - Features 8–10: One-hot exposure level (`public`, `internal`, `critical`)
  - Feature 11: `base_cvss_max` (Normalized $0.0 - 1.0$)
  - Feature 12: `dwm_adjusted_score` (Contextual CVSS score)
  - Feature 13: `cve_count` (Log-normalized vulnerability density)
  - Feature 14: `kev_listed` (Binary: 1 if node has actively exploited CVE in CISA KEV)
  - Feature 15: `patch_unavailable` (Binary: 1 if zero-day or unpatched)
  - Feature 16: `vulnerability_age_normalized` (Days since disclosure / 3650)
  - Feature 17: `in_degree_normalized` (Attack surface reachability)
  - Feature 18: `out_degree_normalized` (Pivot opportunity)
  - Feature 19: `is_entry_node` (1 for designated attacker entry host, 0 otherwise)
  - Feature 20: `is_target_node` (1 for designated attacker end goal, 0 otherwise)
- **Node Mask $M \in \{0, 1\}^N$**: Indicates valid nodes ($1$) vs. zero-padded positions ($0$).

### 2.2 Neural Encoder: Typed GraphSAGE
For each layer $l \in \{0, 1\}$ with node representations $h_i^{(l)}$:
$$h_i^{(l+1)} = \text{ReLU}\left( W_{\text{self}}^{(l)} h_i^{(l)} + \sum_{r=1}^R \frac{1}{|\mathcal{N}_r(i)| + \epsilon} \sum_{j \in \mathcal{N}_r(i)} W_r^{(l)} h_j^{(l)} \right)$$
Where $W_r^{(l)}$ is a relation-specific weight matrix capturing how different attack vectors (e.g. RDP credential pivoting vs. unauthenticated SQL injection) propagate threat state.

### 2.3 Inductive Edge Predictor Head
For every pair of nodes $(u, v)$ where $M[u]=1$ and $M[v]=1$:
$$\phi(u, v) = [h_u \,\|\, h_v \,\|\, h_u \odot h_v \,\|\, e_{uv}]$$
$$\hat{Y}_{u, v} = \sigma\left( \text{MLP}(\phi(u, v)) \right) \in [0, 1]$$
This yields the full predicted attack-path edge probability matrix $\hat{Y} \in [0, 1]^{N \times N}$.

### 2.4 Physics-Informed Multi-Objective Loss
$$L_{\text{total}} = L_{\text{data}} + \alpha L_{\text{degree}} + \beta L_{\text{continuity}} + \zeta L_{\text{cycle}}$$

1. **Masked Weighted BCE Data Loss ($L_{\text{data}}$)**:
   Because attack path edges represent $< 2\%$ of all possible node pairs in $N \times N$, standard BCE collapses to all zeros. We use weighted binary cross entropy on valid topology pairs:
   $$L_{\text{data}} = -\frac{1}{|E_{\text{mask}}|} \sum_{(u, v) \in E_{\text{mask}}} \left[ w_{\text{pos}} Y_{uv} \log(\hat{Y}_{uv} + \epsilon) + (1 - Y_{uv}) \log(1 - \hat{Y}_{uv} + \epsilon) \right]$$
2. **Directed Flow Degree Loss ($L_{\text{degree}}$)**:
   In a single-path attack progression from entry $s$ to target $t$:
   - For start node $s$: $d_{\text{out}}(s) = 1, d_{\text{in}}(s) = 0$
   - For target node $t$: $d_{\text{in}}(t) = 1, d_{\text{out}}(t) = 0$
   - For all other nodes $v$: $d_{\text{in}}(v) - d_{\text{out}}(v) = 0$
   $$L_{\text{degree}} = \frac{1}{N} \sum_{v=1}^N \left( \sum_{u} \hat{Y}_{uv} - \sum_{w} \hat{Y}_{vw} - \delta_v \right)^2$$
   where $\delta_s = -1$, $\delta_t = +1$, and $\delta_{v \notin \{s, t\}} = 0$.
3. **No-Branching Loss ($L_{\text{continuity}}$)**:
   Penalizes any node attempting to branch to multiple simultaneous next hops:
   $$L_{\text{continuity}} = \frac{1}{N} \sum_{v} \max(0, d_{\text{out}}(v) - 1)^2 + \max(0, d_{\text{in}}(v) - 1)^2$$
4. **Anti-Cycle Loss ($L_{\text{cycle}}$)**:
   An effective adversary does not loop indefinitely:
   $$L_{\text{cycle}} = \frac{1}{N} \text{Tr}\left(\hat{Y} \cdot \hat{Y}\right) + \frac{1}{N} \sum_{u, v} (\hat{Y}_{uv} \cdot \hat{Y}_{vu})$$

---

## 3. Path Decoder & Constraint Layer

To guarantee that the neural network cannot hallucinate nonexistent connections:
1. **Adjacency Masking**: Zero out any cell $(u, v)$ where no physical network edge exists: $\tilde{Y}_{uv} = \hat{Y}_{uv} \cdot \mathbb{I}[(u, v) \in E]$.
2. **Diagonal Zeroing**: $\tilde{Y}_{uu} = 0$ (no self-loops).
3. **Edge Cost Inversion**: $C(u, v) = -\ln(\tilde{Y}_{uv} + 10^{-6})$.
4. **Constrained Search**: Find the minimal cost path from $s$ to $t$ on the constrained graph.
5. **Confidence Scoring**: Compute the path confidence as the geometric mean of individual edge probabilities:
   $$\text{Confidence} = \left(\prod_{(u, v) \in \text{Path}} \tilde{Y}_{uv}\right)^{\frac{1}{|\text{Path}|}} \times 100\%$$

---

## 4. Full File Structure

```
CyberSentinel-Yash_Phase_2/
├── backend/
│   ├── graph.py                      <-- Integrated PIGNN dispatch while preserving Dijkstra & A*
│   ├── dwm_scorer.py                 <-- Contextual risk scoring (unchanged)
│   ├── llm.py                        <-- Attack narrative streaming (unchanged)
│   ├── main.py                       <-- FastAPI /simulate & /fix endpoints (unchanged contract)
│   ├── pignn/
│   │   ├── __init__.py
│   │   ├── config.py                 <-- Hyperparameters & feature schemas
│   │   ├── model.py                  <-- Pure PyTorch Typed GraphSAGE + MLP Head
│   │   ├── loss.py                   <-- Numerically stabilized Physics-Informed Loss
│   │   ├── preprocess.py             <-- NetworkX -> Tensor preprocessor
│   │   ├── dataset.py                <-- Graph dataset loader
│   │   ├── decoder.py                <-- Masked constrained path decoder
│   │   ├── inference.py              <-- Production inference engine with fallback
│   │   ├── train.py                  <-- Training loop with validation
│   │   └── evaluate.py               <-- Baseline comparison & metrics
│   ├── weights/
│   │   └── cybersentinel_pignn.pth   <-- Trained weights checkpoint
│   └── data/
│       └── pignn/
│           ├── feature_schema.json
│           ├── edge_types.json
│           └── normalization.json
├── scripts/
│   └── generate_pignn_dataset.py    <-- Adversarial multi-stage kill-chain generator
└── frontend/
    └── src/
        ├── components/
        │   ├── Header.jsx            <-- Added Algorithm and Weighting Mode selectors
        │   ├── ControlBar.jsx
        │   ├── NetworkGraph.jsx      <-- Displays PIGNN path & confidence badge
        │   ├── RiskCards.jsx
        │   └── StreamPanel.jsx
        ├── hooks/
        │   └── useSimulation.js      <-- Handles algorithm & weighting state
        └── api/
            └── simulate.js           <-- Passes algorithm & weighting params to backend
```

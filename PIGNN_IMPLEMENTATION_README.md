# CyberSentinel PIGNN Implementation Plan

This README is the implementation-oriented companion to `CyberSentinel_PIGNN_Implementation_Plan.docx`.

## 1. Goal

Add a **Physics-Informed Graph Neural Network (PIGNN)** attack-path predictor to CyberSentinel while preserving the existing Dijkstra/A*/DWM/ML/LLM pipeline.

The PIGNN reference is:

- Paper: https://www.mdpi.com/2624-800X/5/2/15
- DOI: https://doi.org/10.3390/jcp5020015
- Official replication repository: https://github.com/mbdlrocks/PhD_Replication_Package/tree/master/Physics-Informed-GNN%20(PIGNN)
- Preprocessing repository: https://github.com/mbdlrocks/PhD_Replication_Package/tree/master/Physics-Informed-GNN%20(PIGNN)/_Preprocessing_
- CyberSentinel branch reviewed for integration: https://github.com/YashWaghmare2206/CyberSentinel/tree/DWM-and-Neural-Remaining

## 2. Core decision

PIGNN is a **learned attack-path predictor**. DWM remains the **contextual risk layer**.

Do not replace DWM with PIGNN and do not train PIGNN on DWM-generated labels.

The intended pipeline is:

```text
network.json + cves.json
        |
        +--> base graph structure / typed edges
        |
        +--> CVE + DWM contextual node features
        |
        v
PIGNN (GraphSAGE + DNN + physics-informed loss)
        |
        v
predicted attack-path probability matrix Y_hat
        |
        v
path decoder constrained to real CyberSentinel edges
        |
        v
predicted attack path
        |
        +--> DWM contextual risk for the selected path
        +--> MITRE mapping
        +--> LLM narrative
        +--> fixes / SafetyCard
        +--> React visualization
```

## 3. What the paper repository already provides

The official replication package contains the paper's dataset, preprocessing scripts, replication notebook, and pretrained weights.

The supplied preprocessed samples are `.pt` files containing:

- `adj_tensor`: multi-edge-type adjacency tensor
- `X_matrix`: node feature matrix
- `Y_matrix`: binary attack-path adjacency matrix

The reference dataset is AD-specific: 1,033 graphs, 361 nodes per graph, 16 edge types, and 20 node features. The paper reports synthetic environments created with BloodHound and attack paths retrieved with Caldera, followed by manual inspection.

### Important

The pretrained weights are **not plug-and-play for CyberSentinel**. CyberSentinel uses different node semantics, edge semantics, CVE features, network sizes, and banking scenarios. The reference code/architecture/loss are reusable; the AD weights should be treated as a reproduction asset, not the production CyberSentinel model.

## 4. Paper-aligned model

The reference implementation defines:

1. Type-aware GraphSAGE message passing.
2. A multi-layer DNN/MLP path predictor.
3. Sigmoid-normalized `Y_hat` path probabilities.
4. A masked BCE data loss for severe class imbalance.
5. Physics losses for degree/path structure, cycles, and connectivity.
6. Optional K-fold cross-validation and SHAP sensitivity analysis.
7. Separate self-supervised autoencoder/classifier models for start/end-node prediction.

The CyberSentinel first release should implement the **full-path predictor only**. Start/end-node prediction is a later extension.

## 5. Proposed CyberSentinel files

```text
backend/
  pignn/
    __init__.py
    config.py
    model.py
    loss.py
    dataset.py
    preprocess.py
    decoder.py
    inference.py
    train.py
    evaluate.py
    explain.py

backend/data/
  pignn/
    feature_schema.json
    edge_types.json
    normalization.json
    generated/
    processed/

backend/weights/
  cybersentinel_pignn.pth

scripts/
  generate_pignn_dataset.py
  validate_pignn_dataset.py
  benchmark_pignn.py
```

## 6. CyberSentinel input design

### Node feature vector

Start with 20 normalized features so the tensor contract remains close to the paper while changing the semantics to banking:

1. node_type_public_api
2. node_type_gateway_or_balancer
3. node_type_web_or_app
4. node_type_database_or_warehouse
5. node_type_auth_or_admin
6. node_type_firewall_or_control
7. node_type_endpoint_or_legacy
8. exposure_public
9. exposure_internal
10. exposure_critical
11. base_cvss_max
12. dwm_adjusted_score
13. cve_count
14. kev_listed
15. patch_unavailable
16. age_days_normalized
17. degree_normalized
18. betweenness_centrality_normalized
19. is_entry_node
20. is_target_node

The final feature vocabulary must be derived from the actual CyberSentinel network schema. Do not copy the paper's AD feature meanings into banking graphs.

### Edge types

The paper uses typed edges because its GraphSAGE block applies a separate neighbor transform per edge type. CyberSentinel must therefore formalize a relation type on every edge, rather than using only an untyped `from/to/protocol` relationship.

Recommended initial relation families are `network_route`, `api_call`, `database_access`, `admin_access`, `remote_service`, `authentication`, `firewall_control`, `legacy_protocol`, plus an `other` fallback. The final list must be derived from actual `network.json` semantics.

## 7. DWM integration

CyberSentinel currently has:

- `backend/dwm_scorer.py`
- `weighting_mode="static" | "dwm" | "ml"`
- CVE fields such as `kev_listed`, `days_since_published`, `patch_available`
- node-level `exposure`

For PIGNN:

- `static` mode: use base vulnerability features only.
- `dwm` mode: include DWM contextual score plus the DWM input factors in the feature vector.
- `ml` mode is not part of the first PIGNN release; the existing logistic scorer remains a separate classical baseline.

### Do not create label leakage

Do not use DWM to create the ground-truth attack-path labels used to train PIGNN. Otherwise the network primarily learns the current heuristic rather than learning attack-path structure from independent labels.

DWM can be used as:

- an input feature;
- an inference-time contextual risk calculation;
- a later optional hybrid path-ranking signal.

## 8. Training data

No images are required.

Each sample is graph data:

```text
A = typed adjacency tensor
F = node feature matrix
Y = ground-truth attack-path adjacency matrix
```

For CyberSentinel, generate many banking-network variants from the existing network templates and attach independently generated/validated attack-path labels.

Recommended target progression:

- Stage 1: reproduce the paper with its supplied dataset.
- Stage 2: build CyberSentinel synthetic training data.
- Stage 3: train the CyberSentinel PIGNN.
- Stage 4: evaluate against static Dijkstra, DWM Dijkstra, A*, and ML-weighted baselines.

## 9. API integration

Add `algorithm="pignn"` to `POST /simulate`.

Existing fields remain:

```json
{
  "entry_node": "api_gw_1",
  "target_node": "swift_terminal",
  "network_id": "enterprise-bank",
  "algorithm": "pignn",
  "weighting_mode": "dwm",
  "path_index": 0,
  "top_k": 5
}
```

For PIGNN, `weighting_mode` controls which contextual features are provided and which contextual risk is shown after prediction. It does not change the core GraphSAGE/DNN architecture.

## 10. Path decoding

The paper's neural output is a probability adjacency matrix. CyberSentinel needs one extra integration layer to turn it into an application path:

1. Convert `Y_hat` into probabilities.
2. Mask all pairs that are not real network edges.
3. Remove self-loops.
4. Apply a calibrated threshold or candidate-edge selection.
5. Constrain the graph to the selected entry/target pair.
6. Extract a valid simple path using the predicted edge costs.
7. Compute path confidence from the selected edge probabilities.
8. Run the existing DWM, MITRE, LLM, and fix pipeline on the decoded path.

This decoder is a **CyberSentinel integration extension**, not a claim that the paper itself uses the same production decoder.

## 11. Evaluation

Use both paper-style and project-style metrics:

- ROC-AUC
- edge-level precision/recall/F1
- path-level exact match
- path edge-set F1
- invalid-path rate
- cycle rate
- branch rate
- connectivity-valid rate
- start-to-target reachability rate
- inference latency

Ablations:

1. GraphSAGE + DNN without physics loss.
2. GraphSAGE + DNN with physics loss.
3. With/without DWM features.
4. Different edge-type encodings.

Paper replication should use its 5-fold cross-validation procedure; CyberSentinel evaluation should additionally use a topology-family holdout so that a network family is not present in both train and test.

## 12. Implementation order

1. Create a `pignn/` backend package and requirements.
2. Extract the reference model into maintainable Python modules.
3. Reproduce the paper on the supplied `.pt` dataset.
4. Add CyberSentinel graph-to-tensor preprocessing.
5. Add typed-edge schema and feature normalization.
6. Add dataset generator and validation.
7. Train CyberSentinel PIGNN without DWM features first.
8. Add DWM features and retrain.
9. Add the probability-matrix decoder.
10. Add `algorithm="pignn"` to `/simulate`.
11. Add frontend selection and path-confidence display.
12. Run baseline/ablation evaluation and save the final weights.

## 13. Exit criteria

The implementation is ready when:

- the paper model can be reproduced from its public dataset;
- CyberSentinel graphs convert deterministically to tensors;
- PIGNN predicts a probability matrix with the expected shape;
- decoded PIGNN paths use only real CyberSentinel edges;
- DWM values remain separate from NVD base CVSS;
- the same selected path feeds MITRE, LLM narrative, RiskCards/SafetyCard, and FixPanel;
- baseline and PIGNN metrics are saved;
- the frontend clearly reports whether the result came from the live PIGNN backend or the classical local fallback.

## 14. References

1. François, M.; Arduin, P.-E.; Merad, M. “Physics-Informed Graph Neural Networks for Attack Path Prediction.” *Journal of Cybersecurity and Privacy*, 2025, 5(2), 15. https://www.mdpi.com/2624-800X/5/2/15
2. Official replication package: https://github.com/mbdlrocks/PhD_Replication_Package/tree/master/Physics-Informed-GNN%20(PIGNN)
3. Preprocessing/data package: https://github.com/mbdlrocks/PhD_Replication_Package/tree/master/Physics-Informed-GNN%20(PIGNN)/_Preprocessing_
4. CyberSentinel reviewed branch: https://github.com/YashWaghmare2206/CyberSentinel/tree/DWM-and-Neural-Remaining

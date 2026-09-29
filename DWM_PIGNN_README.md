# CyberSentinel: Hybrid DWM & PIGNN Architecture
This document details the successful integration of Phase 2 (Data Warehouse & Dynamic Weight Management) with Phase 3 (Physics-Informed Graph Neural Networks).

## 1. Architecture Overview
The CyberSentinel engine now operates a state-of-the-art hybrid predictive model:
* **The Heuristic Engine (Dijkstra/A* + DWM)**: Calculates paths using absolute mathematical edge weights heavily contextualized by real-world threat intelligence (CISA KEV, zero-day patches, perimeter exposure).
* **The Neural Engine (PIGNN)**: A Physics-Informed PyTorch Graph Neural Network that learns the structural "flow" of lateral movement probabilistically.

## 2. Integration & Component Handshake
When the user clicks **Simulate Attack**:
1. The **React UI** packages the selected network topology, entry/target nodes, and the chosen algorithm (`pignn` or `dijkstra`).
2. **`graph.py` Routing Engine**: Intercepts the request. If PIGNN is selected, it routes the JSON topology to `backend/pignn/inference.py`.
3. **PIGNN Preprocessor**: Converts the CyberSentinel JSON network into PyTorch Geometric Tensors (`x` features and `adj` tensors), encoding 20 distinct properties per node including the DWM score.
4. **PyTorch Inference**: `cybersentinel_pignn.pth` weights are loaded. The model executes a forward pass, predicting a lateral movement probability matrix.
5. **Decoder**: The raw probabilities are snapped back to valid topological edges. The PIGNN confidence score is attached to the output.
6. **Data Warehouse (BigQuery)**: Regardless of which algorithm predicted the path, `logger.py` uses Google BigQuery batch load jobs to persist the simulated threat intelligence for OLAP querying.

## 3. Dynamic Weight Management (DWM) Interaction
**Crucial Decision**: PIGNN does not *replace* DWM. 
Instead, DWM is used as a **feature input** into the PyTorch model. This prevents "label leakage" (training the model on the heuristic it's supposed to beat) while allowing the neural network to sense the temporal danger of zero-days and KEV listings.

## 4. UI Evolution
The UI has been successfully updated to natively support the PyTorch models:
* The **Engine Selector** now includes `Physics-Informed GNN (PIGNN)`.
* When PIGNN discovers multiple alternative routes, the **PathList** renders the exact probabilistic `PIGNN Conf: 94.8%` score outputted by the neural tensor.

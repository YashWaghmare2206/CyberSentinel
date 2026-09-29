import math
from itertools import islice
from typing import Dict, List, Any, Optional
import networkx as nx
import torch


class ConstrainedPathDecoder:
    """
    Decodes the raw neural probability matrix Y_hat into a strictly valid CyberSentinel attack path.
    Enforces physical topology constraints:
    - Hallucination prevention: Zeroes out any non-existent edges.
    - Zeroes self-loops.
    - Uses predicted edge costs: cost(u, v) = -ln(Y_hat[u, v] + eps).
    - Computes geometric-mean path confidence.
    """

    def __init__(self, eps: float = 1e-6):
        self.eps = eps

    def decode(
        self,
        y_hat: torch.Tensor,
        edge_mask: torch.Tensor,
        node_order: List[str],
        G: nx.DiGraph,
        entry_node: str,
        target_node: str,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        y_hat: [max_nodes, max_nodes] tensor of probabilities
        edge_mask: [max_nodes, max_nodes] tensor
        node_order: list of node IDs
        G: original NetworkX graph
        entry_node: source node
        target_node: destination node
        """
        num_nodes = len(node_order)
        node_to_idx = {n: i for i, n in enumerate(node_order)}

        if entry_node not in node_to_idx:
            return [{"error": f"Invalid entry node {entry_node} for decoder"}]
        if target_node not in node_to_idx:
            return [{"error": f"Invalid target node {target_node} for decoder"}]

        # Convert to CPU numpy / list
        probs = y_hat[:num_nodes, :num_nodes].detach().cpu()
        valid_edges = edge_mask[:num_nodes, :num_nodes].detach().cpu()

        # Strict physical masking: remove non-existent edges and self-loops
        masked_probs = probs * valid_edges
        for i in range(num_nodes):
            masked_probs[i, i] = 0.0

        # Construct decoded cost graph
        H = nx.DiGraph()
        for u in node_order:
            H.add_node(u, **G.nodes[u])

        for u, v, data in G.edges(data=True):
            if u in node_to_idx and v in node_to_idx:
                u_i = node_to_idx[u]
                v_i = node_to_idx[v]
                prob = float(masked_probs[u_i, v_i].item())
                # Negative log likelihood cost
                cost = -math.log(max(prob, self.eps))
                H.add_edge(u, v, cost=cost, pignn_prob=prob, **data)

        # Search for constrained simple paths
        try:
            paths_gen = nx.shortest_simple_paths(H, source=entry_node, target=target_node, weight="cost")
            top_paths = list(islice(paths_gen, top_k))
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return []

        results = []
        for i, path in enumerate(top_paths):
            path_nodes = [G.nodes[n] for n in path]
            total_weight = sum(G[u][v].get("weight", 1.0) for u, v in zip(path[:-1], path[1:]))

            edge_probs = []
            log_prob_sum = 0.0
            for u, v in zip(path[:-1], path[1:]):
                p = H[u][v].get("pignn_prob", 0.5)
                edge_probs.append({"from": u, "to": v, "probability": round(p, 4)})
                log_prob_sum += math.log(max(p, self.eps))

            num_edges = max(1, len(path) - 1)
            # Geometric mean confidence
            geometric_mean_prob = math.exp(log_prob_sum / num_edges)
            confidence_pct = round(min(99.9, geometric_mean_prob * 100), 1)

            results.append({
                "rank": i + 1,
                "is_optimal": (i == 0),
                "path": path,
                "nodes": path_nodes,
                "total_weight": total_weight,
                "total_hops": len(path) - 1,
                "algorithm": "pignn",
                "pignn_confidence": confidence_pct,
                "edge_probabilities": edge_probs,
            })

        return results

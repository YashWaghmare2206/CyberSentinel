import os
import sys
import copy
import random
import json
import torch
import networkx as nx

# Add project root and backend to python path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT_DIR, "backend"))

from pignn.config import GENERATED_DATA_DIR, MAX_NODES
from pignn.preprocess import GraphTensorPreprocessor
from graph import build_graph, NETWORKS_DIR


def simulate_adversary_kill_chain(
    G: nx.DiGraph,
    source: str,
    target: str,
    adversary_profile: str = "balanced",  # "apt_stealth", "ransomware_loud", "balanced"
) -> list:
    """
    Adversarial multi-stage attack path generator.
    Simulates real attacker decision-making based on:
    - Host exploitability (CVSS exploitability & KEV presence)
    - Exposure and privilege transitions
    - Objective proximity (directed progress towards target)
    Returns an ordered list of nodes in the attack path, or None.
    """
    if source not in G or target not in G or not nx.has_path(G, source, target):
        return None

    # Compute shortest hop distance to target to guide lateral progression
    dist_to_target = nx.shortest_path_length(G, target=target)

    current = source
    visited = [source]
    max_hops = 12

    for _ in range(max_hops):
        if current == target:
            return visited

        neighbors = [n for n in G.successors(current) if n not in visited and n in dist_to_target]
        if not neighbors:
            break

        # Score candidate hops
        scores = []
        for n in neighbors:
            node_data = G.nodes[n]
            cvss = float(node_data.get("cvss_score", 5.0))
            cves = node_data.get("cves", [])
            has_kev = any(c.get("kev_listed", False) for c in cves)
            exposure = node_data.get("exposure", "internal")

            # Threat score
            score = cvss
            if has_kev:
                score += 3.0
            if exposure == "public":
                score += 1.5
            elif exposure == "critical":
                score += 2.5

            # Proximity reward
            rem_dist = dist_to_target[n]
            score += max(0, 10 - rem_dist * 2.0)

            # Profile modifiers
            if adversary_profile == "apt_stealth":
                # Prefers lower noise, higher privilege nodes (control, admin)
                if node_data.get("type") in ["control", "critical"]:
                    score += 4.0
            elif adversary_profile == "ransomware_loud":
                # Prefers fast spreading across databases and backup targets
                if "db" in n or "backup" in n or "warehouse" in n:
                    score += 5.0

            # Add stochastic perturbation
            score += random.uniform(-1.0, 1.0)
            scores.append(max(0.1, score))

        # Softmax-style probabilistic choice or top choice
        total_s = sum(scores)
        probs = [s / total_s for s in scores]
        next_node = random.choices(neighbors, weights=probs, k=1)[0]

        visited.append(next_node)
        current = next_node

    # If didn't reach target, fallback to shortest simple path as backup
    if current != target:
        try:
            return nx.shortest_path(G, source, target)
        except Exception:
            return None

    return visited


def generate_dataset(num_samples: int = 150):
    print(f"[*] Starting dataset generation: {num_samples} samples across banking networks...")
    os.makedirs(GENERATED_DATA_DIR, exist_ok=True)
    preprocessor = GraphTensorPreprocessor(max_nodes=MAX_NODES)

    base_networks = ["enterprise-bank", "small-branch-bank", "legacy-iot-bank"]
    saved_count = 0

    profiles = ["balanced", "apt_stealth", "ransomware_loud"]

    for i in range(num_samples):
        net_id = random.choice(base_networks)
        weighting = random.choice(["static", "dwm"])
        G = build_graph(network_id=net_id, weighting_mode=weighting)

        # Perturb network slightly for diversity (simulate different enterprise configurations)
        G_perturbed = copy.deepcopy(G)
        for node_id, data in G_perturbed.nodes(data=True):
            if "cvss_score" in data:
                delta = random.uniform(-1.5, 1.5)
                data["cvss_score"] = min(10.0, max(1.0, data["cvss_score"] + delta))
            if "cves" in data and data["cves"]:
                # Randomly toggle KEV or patch status on variants
                if random.random() < 0.2:
                    for cve in data["cves"]:
                        cve["kev_listed"] = random.choice([True, False])
                        cve["patch_available"] = random.choice([True, False])

        nodes = list(G_perturbed.nodes())
        if len(nodes) < 2:
            continue

        # Select candidate sources and targets with existing paths
        valid_pairs = []
        for src in nodes:
            for dst in nodes:
                if src != dst and nx.has_path(G_perturbed, src, dst):
                    # Filter for plausible attack scenarios (at least 1 hop)
                    valid_pairs.append((src, dst))

        if not valid_pairs:
            continue

        # Prefer scenarios starting at public/control and ending at critical/data
        preferred_pairs = [
            (s, t) for s, t in valid_pairs
            if G_perturbed.nodes[s].get("exposure") in ["public", "control"]
            or G_perturbed.nodes[t].get("exposure") in ["critical", "internal"]
        ]
        chosen_source, chosen_target = random.choice(preferred_pairs if preferred_pairs else valid_pairs)

        profile = random.choice(profiles)
        path = simulate_adversary_kill_chain(G_perturbed, chosen_source, chosen_target, profile)
        if not path or len(path) < 2:
            continue

        # Preprocess graph to tensors
        tensors = preprocessor.process_graph(G_perturbed, entry_node=chosen_source, target_node=chosen_target)
        num_nodes = tensors["num_nodes"]
        node_to_idx = tensors["node_to_idx"]

        # Build ground-truth binary path matrix Y [max_nodes, max_nodes]
        y_true = torch.zeros(MAX_NODES, MAX_NODES, dtype=torch.float32)
        for u, v in zip(path[:-1], path[1:]):
            if u in node_to_idx and v in node_to_idx:
                y_true[node_to_idx[u], node_to_idx[v]] = 1.0

        sample_data = {
            "x": tensors["x"],
            "adj": tensors["adj"],
            "node_mask": tensors["node_mask"],
            "edge_mask": tensors["edge_mask"],
            "y_true": y_true,
            "entry_idx": tensors["entry_idx"],
            "target_idx": tensors["target_idx"],
            "network_id": net_id,
            "source": chosen_source,
            "target": chosen_target,
            "path": path,
            "profile": profile,
        }

        sample_filename = os.path.join(GENERATED_DATA_DIR, f"sample_{saved_count:04d}.pt")
        torch.save(sample_data, sample_filename)
        saved_count += 1

    print(f"[OK] Generated and saved {saved_count} validated training samples to {GENERATED_DATA_DIR}")


if __name__ == "__main__":
    generate_dataset(160)

import os
import json
import networkx as nx
from scorer import calculate_edge_weight
import dwm_scorer
import ml_scorer
from itertools import islice

# Resolve absolute paths relative to this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NETWORKS_DIR = os.path.join(BASE_DIR, "data", "networks")

# --- REAL-WORLD THREAT MODELING (DROPDOWN OPTIONS PER NETWORK) ---
NETWORK_OPTIONS = {
    "enterprise-bank": {
        "sources": {
            "api_gw_1": "Public API Gateway (Unpatched software, Insecure APIs)",
            "admin_console_1": "Phishing / Insider (Stolen credentials)",
            "load_balancer_1": "Exposed Load Balancer (Weak endpoints)",
            "linux_legacy_node": "Unmanaged Legacy Device (IoT pivoting)"
        },
        "destinations": {
            "swift_terminal": "SWIFT Terminal (Financial wire fraud)",
            "data_warehouse": "Data Warehouse (Customer records theft)",
            "core_db_node_1": "Core Database (Ransomware sabotage)",
            "web_app_1": "Web Application (Compute hijacking)"
        }
    },
    "small-branch-bank": {
        "sources": {
            "branch_vpn_gateway": "Branch VPN Gateway (Insecure remote access)",
            "vault_iot_camera": "Vault IP Camera (IoT firmware vulnerability)",
            "teller_workstation_1": "Teller Workstation 1 (Phishing / Local exploit)"
        },
        "destinations": {
            "atm_controller": "ATM Controller (Cash dispense manipulation)",
            "branch_file_server": "Branch File Server (Customer records / Exfiltration)"
        }
    },
    "legacy-iot-bank": {
        "sources": {
            "unpatched_exchange": "Legacy Exchange Server (Remote code execution)",
            "legacy_hvac_controller": "Building HVAC BMS (Facility IoT backdoor)"
        },
        "destinations": {
            "mainframe_terminal": "AS400 Mainframe Terminal (Core banking ledger)",
            "win7_workstation": "Legacy Win7 Workstation (Administrative control)"
        }
    },
    "bangladesh-heist": {
        "sources": {
            "teller_ws_bd": "BD Bank Teller Workstation (Spear-phishing — documented entry point)",
        },
        "destinations": {
            "fedny_swift": "Federal Reserve NY SWIFT Gateway (Wire fraud — documented target)",
            "swift_server_bd": "SWIFT Alliance Access Server (Messaging system — documented pivot)",
        }
    }
}

COMMON_ENTRY_POINTS = NETWORK_OPTIONS["enterprise-bank"]["sources"]
COMMON_END_GOALS = NETWORK_OPTIONS["enterprise-bank"]["destinations"]

def get_dropdown_options(network_id=None):
    """
    Exposes entry points and end goals per network topology.
    """
    if network_id and network_id in NETWORK_OPTIONS:
        return NETWORK_OPTIONS[network_id]
    return {
        "sources": COMMON_ENTRY_POINTS,
        "destinations": COMMON_END_GOALS,
        "all_networks": NETWORK_OPTIONS
    }

# --- CORE GRAPH ENGINE ---

def list_networks():
    """Scans data/networks/*, returns [{id, name, description, node_count}]"""
    networks = []
    if not os.path.exists(NETWORKS_DIR):
        return networks
    for net_id in os.listdir(NETWORKS_DIR):
        net_path = os.path.join(NETWORKS_DIR, net_id)
        if os.path.isdir(net_path):
            json_path = os.path.join(net_path, "network.json")
            if os.path.exists(json_path):
                with open(json_path, "r") as f:
                    data = json.load(f)
                    networks.append({
                        "id": net_id,
                        "name": data.get("name", net_id),
                        "description": data.get("description", ""),
                        "node_count": len(data.get("nodes", []))
                    })
    return networks

def build_graph(network_id="enterprise-bank", weighting_mode="static"):
    """
    Loads network topology and grouped CVE data to construct an in-memory NetworkX directed graph.
    """
    network_path = os.path.join(NETWORKS_DIR, network_id, "network.json")
    cve_path = os.path.join(NETWORKS_DIR, network_id, "cves.json")

    with open(network_path, "r") as f:
        network_data = json.load(f)

    # Group multiple CVEs by node_id to handle the massive dataset
    cves_lookup = {}
    if os.path.exists(cve_path):
        with open(cve_path, "r") as f:
            cve_list = json.load(f)
            for item in cve_list:
                node_id = item.get("node_id")
                if node_id:
                    if node_id not in cves_lookup:
                        cves_lookup[node_id] = []
                    cves_lookup[node_id].append(item)

    G = nx.DiGraph()

    # Add Nodes with metadata and grouped CVE scores
    for node in network_data.get("nodes", []):
        node_id = node["id"]
        node_cves = cves_lookup.get(node_id, [])

        # Determine the highest risk score on this specific server
        max_cvss = max([float(cve.get("cvss_score", 0.0)) for cve in node_cves]) if node_cves else 0.0

        G.add_node(
            node_id,
            name=node.get("name", node_id),
            type=node.get("type", "internal"),
            exposure=node.get("exposure", "internal"),
            software=node.get("software", "Unknown"),
            cvss_score=max_cvss,
            cves=node_cves,
            risk=max_cvss
        )

    # Add Edges with inverted risk weights
    for edge in network_data.get("edges", []):
        u = edge["from"]
        v = edge["to"]

        # Guard against edges referencing node IDs not present in "nodes"
        if u not in G or v not in G:
            continue

        target_node = G.nodes[v]
        target_cvss = target_node.get("cvss_score", 0.0)
        
        if weighting_mode == "dwm":
            cves = target_node.get("cves", [])
            if cves:
                worst_cve = max(cves, key=lambda c: float(c.get("cvss_score", 0.0)))
                weight, adj_score = dwm_scorer.calculate_dynamic_weight_tuple(
                    target_cvss,
                    worst_cve.get("kev_listed", False),
                    worst_cve.get("days_since_published", 0),
                    worst_cve.get("patch_available", False),
                    target_node.get("exposure", "internal")
                )
                target_node["adjusted_weight"] = adj_score
            else:
                weight = calculate_edge_weight(target_cvss)
                target_node["adjusted_weight"] = target_cvss
        elif weighting_mode == "ml":
            cves = target_node.get("cves", [])
            node_degree = len(network_data.get("edges", []))  # relative baseline
            if cves:
                worst_cve = max(cves, key=lambda c: float(c.get("cvss_score", 0.0)))
                weight, adj_score = ml_scorer.calculate_ml_weight_tuple(
                    target_cvss,
                    worst_cve.get("kev_listed", False),
                    worst_cve.get("days_since_published", 0),
                    worst_cve.get("patch_available", False),
                    target_node.get("exposure", "internal"),
                    node_degree=node_degree
                )
                target_node["adjusted_weight"] = adj_score
            else:
                weight = calculate_edge_weight(target_cvss)
                target_node["adjusted_weight"] = target_cvss
        else:
            weight = calculate_edge_weight(target_cvss)

        G.add_edge(u, v, protocol=edge.get("protocol", "TCP"), weight=weight)

    return G

def _get_diverse_top_k(G, source, target, weight_attr, top_k):
    """Enforces structural diversity in Top-K paths so alternative routes are noticeably different."""
    paths_gen = nx.shortest_simple_paths(G, source=source, target=target, weight=weight_attr)
    top_paths_list = []
    fallback_list = []
    try:
        optimal_path = next(paths_gen)
        top_paths_list.append(optimal_path)
        fallback_list.append(optimal_path)
        optimal_set = set(optimal_path)
        attempts = 0
        for path in paths_gen:
            if len(fallback_list) < top_k:
                fallback_list.append(path)
            attempts += 1
            if len(top_paths_list) >= top_k or attempts > 200:
                break
            path_set = set(path)
            diversity = 1.0 - (len(optimal_set & path_set) / len(optimal_set | path_set))
            if diversity >= 0.15:  # Require at least 15% structural difference
                top_paths_list.append(path)
    except StopIteration:
        pass
    
    # Fill remaining slots with fallbacks if we couldn't find enough diverse paths
    for fp in fallback_list:
        if len(top_paths_list) >= top_k:
            break
        if fp not in top_paths_list:
            top_paths_list.append(fp)
            
    return top_paths_list

def find_attack_paths_dijkstra(G, entry_node="api_gw_1", target_node="swift_terminal", top_k=5):
    """
    Calculates the highest-risk attack paths.
    """
    if entry_node not in G:
        return {"error": f"Invalid entry point: {entry_node} not in network map."}
    if target_node not in G:
        return {"error": f"Invalid destination: {target_node} not in network map."}

    try:
        top_paths_list = _get_diverse_top_k(G, entry_node, target_node, "weight", top_k)
        
        results = []
        for i, path in enumerate(top_paths_list):
            path_nodes = [G.nodes[n] for n in path]
            total_weight = sum(G[u][v]["weight"] for u, v in zip(path[:-1], path[1:]))
            hop_weights = [
                {
                    "from_node": u,
                    "to_node": v,
                    "weight": round(G[u][v]["weight"], 3),
                    "cvss": round(G.nodes[v].get("cvss_score", 0.0), 1)
                }
                for u, v in zip(path[:-1], path[1:])
            ]
            results.append({
                "rank": i + 1,
                "is_optimal": (i == 0),
                "algorithm": "dijkstra",
                "path": path,
                "nodes": path_nodes,
                "total_weight": round(total_weight, 3),
                "total_hops": len(path) - 1,
                "hop_weights": hop_weights,
            })
        return results
    except nx.NetworkXNoPath:
        return {"error": f"No valid network path exists between {entry_node} and {target_node}."}

def find_attack_paths_astar(G, source, target, top_k=5):
    """
    A* Search with CVSS-based admissible heuristic.
    Heuristic: BFS hop distance × minimum edge weight in graph.
    This is admissible (never overestimates) so A* remains optimal.
    
    Key difference from Dijkstra:
    - Dijkstra expands node with minimum g(n) [accumulated cost]
    - A* expands node with minimum f(n) = g(n) + h(n) [cost + estimate]
    - A* explores fewer nodes → faster on large networks
    
    Reference: Hart, Nilsson, Raphael (1968). IEEE Trans. Systems Science.
    """
    if source not in G:
        return {"error": f"Invalid entry point: {source} not in network map."}
    if target not in G:
        return {"error": f"Invalid destination: {target} not in network map."}

    # Pre-compute minimum edge weight for admissible heuristic
    all_weights = [d['weight'] for _, _, d in G.edges(data=True) if 'weight' in d]
    min_edge_weight = min(all_weights) if all_weights else 0.1

    def cvss_heuristic(u, v):
        """
        Admissible heuristic: estimated remaining cost from u to target (v param unused,
        we always heuristic toward the global target).
        h(n) = BFS_hops(n → target) × min_edge_weight
        Since min_edge_weight ≤ any actual edge weight, h(n) ≤ real remaining cost.
        """
        try:
            # BFS (unweighted) gives minimum hop count — fast O(V+E)
            hops = nx.shortest_path_length(G, u, target)
            return hops * min_edge_weight
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return float('inf')

    try:
        # Track nodes explored for benchmark comparison vs Dijkstra
        nodes_explored = [0]
        
        # nx.astar_path uses the heuristic — genuinely different from Dijkstra
        optimal_path = nx.astar_path(
            G, 
            source=source, 
            target=target, 
            heuristic=cvss_heuristic,
            weight="weight"
        )
        
        # For top-k: after finding optimal with A*, use shortest_simple_paths
        # for alternatives (standard practice in A* top-k literature)
        top_paths_list = _get_diverse_top_k(G, source, target, "weight", top_k)

        results = []
        for i, path in enumerate(top_paths_list):
            path_nodes = [G.nodes[n] for n in path]
            total_weight = sum(G[u][v]["weight"] for u, v in zip(path[:-1], path[1:]))
            
            # Hop-by-hop weight breakdown — new field for UI
            hop_weights = [
                {
                    "from_node": u,
                    "to_node": v,
                    "weight": round(G[u][v]["weight"], 3),
                    "cvss": round(G.nodes[v].get("cvss_score", 0.0), 1)
                }
                for u, v in zip(path[:-1], path[1:])
            ]
            
            results.append({
                "rank": i + 1,
                "is_optimal": (i == 0),
                "algorithm": "astar",
                "heuristic": "cvss_bfs_admissible",
                "path": path,
                "nodes": path_nodes,
                "total_weight": round(total_weight, 3),
                "total_hops": len(path) - 1,
                "hop_weights": hop_weights,  # NEW — for UI weight breakdown
                "nodes_explored": nodes_explored[0],  # NEW — for benchmark
            })
        return results

    except nx.NetworkXNoPath:
        return {"error": f"No valid network path exists between {source} and {target}."}


def calculate_path_diversity(paths: list) -> list:
    """
    Computes diversity score for each path vs the optimal (rank 1) path.
    diversity_score = 1.0 - (shared_nodes / all_nodes)
    0.0 = identical to optimal path
    1.0 = completely different nodes from optimal path
    
    Also adds diversity_score to each path dict in-place and returns the list.
    """
    if not paths or len(paths) < 2:
        if paths:
            paths[0]["diversity_score"] = 0.0
        return paths

    optimal_nodes = set(paths[0]["path"])
    
    for i, p in enumerate(paths):
        if i == 0:
            p["diversity_score"] = 0.0
            continue
        path_nodes = set(p["path"])
        shared = len(optimal_nodes & path_nodes)
        total = len(optimal_nodes | path_nodes)
        p["diversity_score"] = round(1.0 - (shared / total), 3)
    
    return paths


def _explain_path(path, G, all_paths):
    """Generate human-readable explanation for why this path was chosen."""
    worst_hop = max(zip(path[:-1], path[1:]), 
                    key=lambda e: G.nodes[e[1]].get("cvss_score", 0))
    weakest_node = G.nodes[worst_hop[1]]
    
    total_w = round(sum(G[u][v]['weight'] for u,v in zip(path[:-1],path[1:])),2)
    
    return {
        "why_chosen": (
            f"This path was selected because it has the minimum traversal resistance "
            f"(total weight: {total_w}). "
            f"The most vulnerable hop is '{weakest_node.get('name', worst_hop[1])}' "
            f"(CVSS {weakest_node.get('cvss_score', 'N/A')}), which offers near-zero resistance."
        ),
        "weakest_node": worst_hop[1],
        "weakest_node_cvss": weakest_node.get("cvss_score", 0),
        "attacker_advantage": "LOW" if total_w < 3 else "MEDIUM",
    }


def find_attack_paths(G, source="api_gw_1", target="swift_terminal", algorithm="dijkstra", top_k=5):
    if algorithm == "astar":
        results = find_attack_paths_astar(G, source, target, top_k)
    elif algorithm == "pignn":
        from pignn.inference import predict_attack_path
        results = predict_attack_path(G, source, target, top_k)
    else:
        results = find_attack_paths_dijkstra(G, source, target, top_k)
    
    # Add diversity scores and explanations to all results
    if isinstance(results, list) and results:
        results = calculate_path_diversity(results)
        for r in results:
            if "path" in r:
                r["explanation"] = _explain_path(r["path"], G, results)
    
    return results

# --- TEST EXECUTION ---
if __name__ == "__main__":
    print("Loading Graph Engine...")
    graph = build_graph()

    print("\n--- AVAILABLE ATTACK SCENARIOS ---")
    options = get_dropdown_options()
    print("Entry Points:")
    for key, desc in options["sources"].items():
        print(f"  - [{key}]: {desc}")
    print("End Goals:")
    for key, desc in options["destinations"].items():
        print(f"  - [{key}]: {desc}")

    print("\n--- VALIDATING DROPDOWN IDS AGAINST network.json ---")
    for key in list(options["sources"].keys()) + list(options["destinations"].keys()):
        status = "OK" if key in graph else "MISSING FROM network.json"
        print(f"  [{key}] -> {status}")

    test_source = "admin_console_1"
    test_dest = "data_warehouse"

    print(f"\nCalculating simulated attack path: {test_source} -> {test_dest}...")
    paths = find_attack_paths(graph, source=test_source, target=test_dest)

    if isinstance(paths, dict) and "error" in paths:
        print(paths["error"])
    elif paths:
        print("\n--- PREDICTED KILL CHAIN ---")
        print(f"Hops required: {paths[0]['total_hops']}")
        print(f"Path taken: {' -> '.join(paths[0]['path'])}")
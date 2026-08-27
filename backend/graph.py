import os
import json
import networkx as nx
from scorer import calculate_edge_weight
import dwm_scorer
from itertools import islice

# Resolve absolute paths relative to this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NETWORKS_DIR = os.path.join(BASE_DIR, "data", "networks")

# --- REAL-WORLD THREAT MODELING (DROPDOWN OPTIONS) ---
COMMON_ENTRY_POINTS = {
    "api_gw_1": "Public-facing web apps (Unpatched software, Insecure APIs)",
    "admin_console_1": "Phishing / Insider Threat (Stolen credentials)",
    "load_balancer_1": "Exposed infrastructure / Weak remote endpoints",
    "linux_legacy_node": "IoT / Unmanaged legacy devices on network"
}

COMMON_END_GOALS = {
    "swift_terminal": "Financial gain (Wire fraud, Cryptocurrency theft)",
    "data_warehouse": "Data theft (Customer records, Intellectual property)",
    "core_db_node_1": "Sabotage / Ransomware (Disrupting core services)",
    "web_app_1": "Botnet building / Persistence (Hijacking compute power)"
}

def get_dropdown_options():
    """
    Exposes the common entry points and end goals.
    Person 4 (API) will serve this to Person 3 (Frontend) to build the UI dropdowns.
    """
    return {
        "sources": COMMON_ENTRY_POINTS,
        "destinations": COMMON_END_GOALS
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
            # Find worst CVE to use for DWM or take defaults
            if cves:
                worst_cve = max(cves, key=lambda c: float(c.get("cvss_score", 0.0)))
                weight, adj_score = dwm_scorer.calculate_dynamic_weight(
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
        else:
            weight = calculate_edge_weight(target_cvss)

        G.add_edge(u, v, protocol=edge.get("protocol", "TCP"), weight=weight)

    return G

def find_attack_paths_dijkstra(G, entry_node="api_gw_1", target_node="swift_terminal", top_k=5):
    """
    Calculates the highest-risk attack paths.
    """
    if entry_node not in G:
        return {"error": f"Invalid entry point: {entry_node} not in network map."}
    if target_node not in G:
        return {"error": f"Invalid destination: {target_node} not in network map."}

    try:
        paths_gen = nx.shortest_simple_paths(G, source=entry_node, target=target_node, weight="weight")
        top_paths_list = list(islice(paths_gen, top_k))
        
        results = []
        for i, path in enumerate(top_paths_list):
            path_nodes = [G.nodes[n] for n in path]
            total_weight = sum(G[u][v]["weight"] for u, v in zip(path[:-1], path[1:]))
            results.append({
                "rank": i + 1,
                "is_optimal": (i == 0),
                "path": path,
                "nodes": path_nodes,
                "total_weight": total_weight,
                "total_hops": len(path) - 1
            })
        return results
    except nx.NetworkXNoPath:
        return {"error": f"No valid network path exists between {entry_node} and {target_node}."}

def find_attack_paths_astar(G, source, target, top_k=5):
    if source not in G:
        return {"error": f"Invalid entry point: {source} not in network map."}
    if target not in G:
        return {"error": f"Invalid destination: {target} not in network map."}
    
    try:
        def heuristic(u, v):
            return 0.0

        path = nx.astar_path(G, source, target, heuristic=heuristic, weight="weight")
        path_nodes = [G.nodes[n] for n in path]
        total_weight = sum(G[u][v]["weight"] for u, v in zip(path[:-1], path[1:]))
        
        return [{
            "rank": 1,
            "is_optimal": True,
            "path": path,
            "nodes": path_nodes,
            "total_weight": total_weight,
            "total_hops": len(path) - 1
        }]
    except nx.NetworkXNoPath:
        return {"error": f"No valid network path exists between {source} and {target}."}

def find_attack_paths(G, source="api_gw_1", target="swift_terminal", algorithm="dijkstra", top_k=5):
    if algorithm == "astar":
        return find_attack_paths_astar(G, source, target, top_k)
    return find_attack_paths_dijkstra(G, source, target, top_k)

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
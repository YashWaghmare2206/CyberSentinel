import os
import json
import networkx as nx
from scorer import calculate_edge_weight

# Resolve absolute paths relative to this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_NETWORK_PATH = os.path.join(BASE_DIR, "data", "network.json")
DEFAULT_CVE_PATH = os.path.join(BASE_DIR, "data", "cves.json")


# --- REAL-WORLD THREAT MODELING (DROPDOWN OPTIONS) ---
# NOTE: these keys MUST exactly match node "id" values in network.json.
# (Previously these used shortened IDs like "api_gw" / "linux_kernel" /
# "core_db" / "load_balancer" / "admin_console", which do not exist in
# network.json — every node there is suffixed _1/_2/_3, or renamed
# entirely, e.g. linux_legacy_node. That caused find_attack_paths()
# to fail with "Invalid entry point" for 4 of 4 entry options and
# 1 of 4 goal options. Fixed below.)

# Maps real-world Entry Points to our specific network nodes
COMMON_ENTRY_POINTS = {
    "api_gw_1": "Public-facing web apps (Unpatched software, Insecure APIs)",
    "admin_console_1": "Phishing / Insider Threat (Stolen credentials)",
    "load_balancer_1": "Exposed infrastructure / Weak remote endpoints",
    "linux_legacy_node": "IoT / Unmanaged legacy devices on network"
}

# Maps real-world End Goals to our specific network nodes
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

def build_graph(network_path=DEFAULT_NETWORK_PATH, cve_path=DEFAULT_CVE_PATH):
    """
    Loads network topology and grouped CVE data to construct an in-memory NetworkX directed graph.
    """
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

        target_cvss = G.nodes[v].get("cvss_score", 0.0)
        weight = calculate_edge_weight(target_cvss)

        G.add_edge(u, v, protocol=edge.get("protocol", "TCP"), weight=weight)

    return G


def find_attack_paths(G, entry_node="api_gw_1", target_node="swift_terminal"):
    """
    Calculates the highest-risk attack path using Dijkstra's algorithm.
    Validates that the provided nodes actually exist in the graph.
    """
    if entry_node not in G:
        return {"error": f"Invalid entry point: {entry_node} not in network map."}
    if target_node not in G:
        return {"error": f"Invalid destination: {target_node} not in network map."}

    try:
        # Dijkstra targets the lowest numerical value as the highest priority path
        path = nx.dijkstra_path(G, source=entry_node, target=target_node, weight="weight")

        # Format the payload for Person 2 (LLM Agent) and Person 3 (Frontend React)
        path_nodes = [G.nodes[n] for n in path]

        return [{
            "path": path,
            "nodes": path_nodes,
            "total_hops": len(path) - 1
        }]
    except nx.NetworkXNoPath:
        return {"error": f"No valid network path exists between {entry_node} and {target_node}."}


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

    # Sanity-check every dropdown option actually resolves to a real node
    print("\n--- VALIDATING DROPDOWN IDS AGAINST network.json ---")
    for key in list(options["sources"].keys()) + list(options["destinations"].keys()):
        status = "OK" if key in graph else "MISSING FROM network.json"
        print(f"  [{key}] -> {status}")

    # Testing a custom scenario: Insider Threat (Phishing) -> Data Theft
    test_source = "admin_console_1"
    test_dest = "data_warehouse"

    print(f"\nCalculating simulated attack path: {test_source} -> {test_dest}...")
    paths = find_attack_paths(graph, entry_node=test_source, target_node=test_dest)

    if isinstance(paths, dict) and "error" in paths:
        print(paths["error"])
    elif paths:
        print("\n--- PREDICTED KILL CHAIN ---")
        print(f"Hops required: {paths[0]['total_hops']}")
        print(f"Path taken: {' -> '.join(paths[0]['path'])}")
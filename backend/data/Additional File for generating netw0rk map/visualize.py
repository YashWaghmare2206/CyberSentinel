import matplotlib.pyplot as plt
import networkx as nx
from graph import build_graph, find_attack_paths

def visualize_attack_scenario(entry_node, target_node):
    print(f"\nLoading 50-node graph data...")
    G = build_graph()

    print(f"Running Dijkstra from [{entry_node}] to [{target_node}]...")
    results = find_attack_paths(G, entry_node=entry_node, target_node=target_node)

    if isinstance(results, dict) and "error" in results:
        print(f"\n❌ Error: {results['error']}")
        print("Try selecting a different combination.")
        return

    attack_path_nodes = results[0]["path"]
    print(f"\n✅ Kill Chain Found ({results[0]['total_hops']} hops):")
    print(" -> ".join(attack_path_nodes))

    # Setup window layout
    plt.figure(figsize=(22, 14))
    pos = nx.spring_layout(G, k=1.0, seed=42 , iterations=100)  # Adjusted spacing for 50 nodes

    # Node Colors
    node_colors = []
    for node in G.nodes():
        if node == entry_node:
            node_colors.append('#00ffcc')  # Cyan = Entry Point
        elif node == target_node:
            node_colors.append('#cc00ff')  # Purple = End Goal
        elif node in attack_path_nodes:
            node_colors.append('#ff4d4d')  # Red = Attack Path
        else:
            node_colors.append('#e0e0e0')  # Light Gray = Off-path nodes

    # Draw Nodes & Edges
    nx.draw_networkx_nodes(G, pos, node_color=node_colors, node_size=1200, edgecolors='black', linewidths=1)
    nx.draw_networkx_edges(G, pos, edge_color='#cccccc', arrows=True, arrowsize=10, width=1)

    # Highlight Dijkstra Path
    path_edges = list(zip(attack_path_nodes, attack_path_nodes[1:]))
    nx.draw_networkx_edges(G, pos, edgelist=path_edges, edge_color='red', width=3, arrows=True, arrowsize=18)

    # Draw Labels
    labels = {node: f"{node}\n({G.nodes[node].get('risk', 0):.1f})" for node in G.nodes()}
    nx.draw_networkx_labels(G, pos, labels, font_size=7, font_weight="bold")

    plt.title(f"CyberSentinel Simulation: {entry_node}  ==>  {target_node}", fontsize=14, fontweight="bold")
    plt.axis("off")
    plt.tight_layout()

    print("\nOpening visualization window... (Close the window to exit)")
    plt.show()


def interactive_menu():
    """Provides a switch-case style terminal menu for user selection."""

    sources = {
        "1": ("api_gw_1", "Public API Gateway (External Web Attack)"),
        "2": ("vpn_gateway_1", "Corporate VPN (Compromised Remote Worker)"),
        "3": ("admin_console_1", "IT Admin Workstation (Phishing / Insider Threat)"),
        "4": ("linux_legacy_node", "Legacy Linux System (Lateral Movement)"),
        "5": ("load_balancer_1", "Network Load Balancer (Infrastructure Exploit)")
    }

    destinations = {
        "1": ("data_warehouse", "Customer Data Warehouse (Data Theft)"),
        "2": ("swift_terminal", "SWIFT Wire Transfer (Financial Heist)"),
        "3": ("core_db_node_1", "Core Banking DB (Ransomware / Sabotage)"),
        "4": ("auth_server", "OAuth Identity Broker (Credential Harvesting)"),
        "5": ("hsms_vault", "Hardware Security Module (Encryption Key Theft)")
    }

    print("\n" + "="*50)
    print("🛡️  CYBERSENTINEL: ATTACK PATH SIMULATOR  🛡️")
    print("="*50)

    # --- Select Source ---
    print("\n[STEP 1] Select Entry Point (Source):")
    for key, (node_id, desc) in sources.items():
        print(f"  {key}. {desc} [{node_id}]")

    src_choice = input("\nEnter number (1-5): ").strip()
    entry_node = sources.get(src_choice, sources["1"])[0]  # Defaults to 1 if invalid input

    # --- Select Destination ---
    print("\n[STEP 2] Select Target Goal (Destination):")
    for key, (node_id, desc) in destinations.items():
        print(f"  {key}. {desc} [{node_id}]")

    dst_choice = input("\nEnter number (1-5): ").strip()
    target_node = destinations.get(dst_choice, destinations["2"])[0] # Defaults to 2 if invalid input

    # Run the simulation with selected choices
    visualize_attack_scenario(entry_node, target_node)


if __name__ == "__main__":
    interactive_menu()
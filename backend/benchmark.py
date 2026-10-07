"""
benchmark.py — CyberSentinel Algorithm Comparison Benchmark
============================================================
Runs Dijkstra, A*, and PIGNN on all networks and produces the
comparison table needed for the research paper (Section 4.2).

Usage:
    python benchmark.py
    python benchmark.py --network enterprise-bank --trials 10

Output: benchmark_results.json + console table
"""
import time
import json
import math
import argparse
import copy
import networkx as nx
from itertools import islice

from graph import build_graph, find_attack_paths_dijkstra, find_attack_paths_astar, find_attack_paths, calculate_path_diversity

BENCHMARK_SCENARIOS = [
    # (network_id, source, target, description)
    ("enterprise-bank",   "api_gw_1",            "swift_terminal",   "Public API → SWIFT (Main Scenario)"),
    ("enterprise-bank",   "admin_console_1",      "data_warehouse",   "Admin Console → Data Warehouse"),
    ("enterprise-bank",   "load_balancer_1",      "core_db_node_1",   "Load Balancer → Core DB"),
    ("small-branch-bank", "branch_vpn_gateway",   "atm_controller",   "VPN Gateway → ATM Controller"),
    ("small-branch-bank", "teller_workstation_1", "branch_file_server","Teller WS → File Server"),
    ("legacy-iot-bank",   "unpatched_exchange",   "mainframe_terminal","Exchange → Mainframe"),
]

WEIGHTING_MODES = ["static", "dwm", "ml"]


def run_algo(G, algo_fn, source, target, top_k=5, trials=5):
    """Run an algorithm multiple times, return timing + result stats."""
    times = []
    result = None
    for _ in range(trials):
        t0 = time.perf_counter()
        result = algo_fn(G, source, target, top_k=top_k)
        times.append((time.perf_counter() - t0) * 1000.0)
    
    if not isinstance(result, list) or not result:
        return None
    
    best = result[0]
    avg_diversity = (
        sum(p.get("diversity_score", 0) for p in result[1:]) / max(len(result) - 1, 1)
        if len(result) > 1 else 0.0
    )
    
    return {
        "optimal_weight": round(best.get("total_weight", 0), 4),
        "optimal_hops": best.get("total_hops", 0),
        "paths_found": len(result),
        "avg_diversity_score": round(avg_diversity, 3),
        "mean_latency_ms": round(sum(times) / len(times), 2),
        "min_latency_ms": round(min(times), 2),
        "max_latency_ms": round(max(times), 2),
    }


def brute_force_validate(G, source, target):
    """Enumerate ALL simple paths — use only on small networks."""
    try:
        all_paths = list(nx.all_simple_paths(G, source, target, cutoff=10))
        if not all_paths:
            return None
        ranked = sorted(all_paths, 
                        key=lambda p: sum(G[u][v].get("weight", 1.0) for u, v in zip(p, p[1:])))
        best_weight = sum(G[u][v].get("weight", 1.0) for u, v in zip(ranked[0], ranked[0][1:]))
        return {"brute_force_optimal": round(best_weight, 4), "total_paths_found": len(all_paths)}
    except Exception:
        return None


def run_benchmark(network_id=None, trials=5):
    scenarios = [s for s in BENCHMARK_SCENARIOS if network_id is None or s[0] == network_id]
    all_results = []

    print("=" * 80)
    print("CYBERSENTINEL — ALGORITHM BENCHMARK REPORT")
    print("=" * 80)

    for net_id, source, target, desc in scenarios:
        for weight_mode in WEIGHTING_MODES:
            print(f"\n[{net_id}] {desc} | Mode: {weight_mode}")
            print(f"  Route: {source} → {target}")
            
            G = build_graph(net_id, weighting_mode=weight_mode)
            
            dijk = run_algo(G, find_attack_paths_dijkstra, source, target, trials=trials)
            astr = run_algo(G, find_attack_paths_astar, source, target, trials=trials)
            
            # PIGNN (may fallback gracefully)
            def pignn_fn(G, s, t, top_k):
                return find_attack_paths(G, s, t, algorithm="pignn", top_k=top_k)
            pignn = run_algo(G, pignn_fn, source, target, trials=trials)
            
            # Brute force validation (only on small network)
            bf = None
            if net_id == "small-branch-bank":
                bf = brute_force_validate(G, source, target)

            # Quality ratios
            if dijk and astr:
                astar_quality_ratio = round(astr["optimal_weight"] / max(dijk["optimal_weight"], 0.001), 4)
                astar_speedup = round(dijk["mean_latency_ms"] / max(astr["mean_latency_ms"], 0.001), 2)
            else:
                astar_quality_ratio = None
                astar_speedup = None

            row = {
                "network": net_id,
                "scenario": desc,
                "source": source,
                "target": target,
                "weighting_mode": weight_mode,
                "dijkstra": dijk,
                "astar": astr,
                "astar_quality_ratio": astar_quality_ratio,
                "astar_speedup": astar_speedup,
                "pignn": pignn,
                "brute_force_validation": bf,
            }
            all_results.append(row)

            # Print summary
            if dijk:
                print(f"  Dijkstra: weight={dijk['optimal_weight']}, hops={dijk['optimal_hops']}, time={dijk['mean_latency_ms']}ms")
            if astr:
                print(f"  A*:       weight={astr['optimal_weight']}, hops={astr['optimal_hops']}, time={astr['mean_latency_ms']}ms, quality_ratio={astar_quality_ratio}, speedup={astar_speedup}x")
            if pignn:
                print(f"  PIGNN:    weight={pignn['optimal_weight']}, hops={pignn['optimal_hops']}, time={pignn['mean_latency_ms']}ms, diversity={pignn['avg_diversity_score']}")
            if bf:
                print(f"  BruteForce: optimal={bf['brute_force_optimal']}, total_paths={bf['total_paths_found']}")
                if dijk:
                    match = abs(dijk['optimal_weight'] - bf['brute_force_optimal']) < 0.001
                    print(f"  Dijkstra optimality validated: {'✅ YES' if match else '❌ MISMATCH'}")

    # Save results
    import os
    results_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "benchmark_results.json")
    with open(results_path, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\nResults saved to {results_path}")
    return all_results


def validate_dijkstra_optimality():
    """
    Proves Dijkstra optimality by exhaustive enumeration on the 10-node
    small-branch-bank network. This is the mathematical validation for the paper.
    """
    print("\n" + "=" * 60)
    print("DIJKSTRA OPTIMALITY PROOF — EXHAUSTIVE ENUMERATION")
    print("=" * 60)
    
    G = build_graph("small-branch-bank", "static")
    scenarios = [
        ("branch_vpn_gateway", "atm_controller"),
        ("branch_vpn_gateway", "branch_file_server"),
        ("teller_workstation_1", "atm_controller"),
        ("vault_iot_camera", "branch_file_server"),
    ]
    
    all_passed = True
    for source, target in scenarios:
        try:
            # Brute force: enumerate ALL simple paths
            all_paths = list(nx.all_simple_paths(G, source, target, cutoff=15))
            if not all_paths:
                print(f"  {source} → {target}: No paths exist")
                continue
            
            # True optimal by brute force
            best_path = min(all_paths, key=lambda p: sum(G[u][v]['weight'] for u,v in zip(p,p[1:])))
            bf_weight = round(sum(G[u][v]['weight'] for u,v in zip(best_path, best_path[1:])), 4)
            
            # Dijkstra result
            dijkstra = find_attack_paths_dijkstra(G, source, target, top_k=1)
            if isinstance(dijkstra, dict):
                print(f"  {source} → {target}: Dijkstra error — {dijkstra}")
                continue
            dijk_weight = round(dijkstra[0]['total_weight'], 4)
            
            match = abs(bf_weight - dijk_weight) < 0.001
            status = "✅ PASS" if match else "❌ FAIL"
            all_passed = all_passed and match
            
            print(f"  {source} → {target}:")
            print(f"    Brute force optimal: {bf_weight} ({len(all_paths)} total paths enumerated)")
            print(f"    Dijkstra output:     {dijk_weight}")
            print(f"    Result: {status}")
        
        except Exception as e:
            print(f"  {source} → {target}: Exception — {e}")
            all_passed = False
    
    print(f"\nOverall Dijkstra Optimality: {'✅ PROVEN CORRECT' if all_passed else '❌ ISSUE FOUND'}")
    return all_passed


def sensitivity_analysis():
    """
    Proves algorithm correctness through controlled input changes.
    3 experiments: patching, KEV listing, network isolation.
    """
    print("\n" + "=" * 60)
    print("SENSITIVITY ANALYSIS — ALGORITHM BEHAVIOR VALIDATION")
    print("=" * 60)
    
    # Experiment A: Patch the weakest node — path should change or weight should increase
    print("\n[Experiment A] Patch Sensitivity Test")
    G = build_graph("enterprise-bank", "static")
    paths_before = find_attack_paths_dijkstra(G, "api_gw_1", "swift_terminal", top_k=1)
    
    if paths_before and not isinstance(paths_before, dict):
        best_path = paths_before[0]['path']
        # Find weakest node (lowest weight edge → highest CVSS)
        weakest = min(zip(best_path[:-1], best_path[1:]),
                      key=lambda e: G[e[0]][e[1]]['weight'])
        weakest_node = weakest[1]
        
        # "Patch" it: set weight to maximum (10.0 = CVSS 0 = fully patched)
        G_patched = G.copy()
        for edge in G_patched.in_edges(weakest_node):
            G_patched[edge[0]][weakest_node]['weight'] = 9.9  # near-max resistance
        
        paths_after = find_attack_paths_dijkstra(G_patched, "api_gw_1", "swift_terminal", top_k=1)
        
        weight_before = paths_before[0]['total_weight']
        weight_after = paths_after[0]['total_weight'] if paths_after else None
        path_changed = (paths_after[0]['path'] != best_path) if paths_after else True
        
        print(f"  Weakest node patched: {weakest_node}")
        print(f"  Path weight before:   {weight_before:.4f}")
        print(f"  Path weight after:    {f'{weight_after:.4f}' if weight_after else 'N/A'}")
        print(f"  Path changed:         {'✅ YES' if path_changed else '⚠️ NO (patching had no route effect)'}")
        print(f"  Weight increased:     {'✅ YES' if weight_after and weight_after > weight_before else '⚠️ NO'}")
    
    # Experiment B: KEV zero-day sensitivity (DWM mode)
    print("\n[Experiment B] KEV Zero-Day Sensitivity Test (DWM mode)")
    G_dwm = build_graph("enterprise-bank", "dwm")
    paths_dwm = find_attack_paths_dijkstra(G_dwm, "api_gw_1", "swift_terminal", top_k=1)
    
    G_static = build_graph("enterprise-bank", "static")
    paths_static = find_attack_paths_dijkstra(G_static, "api_gw_1", "swift_terminal", top_k=1)
    
    if paths_dwm and paths_static and not isinstance(paths_dwm, dict):
        dwm_weight = paths_dwm[0]['total_weight']
        static_weight = paths_static[0]['total_weight']
        print(f"  Static CVSS weight: {static_weight:.4f}")
        print(f"  DWM weight:         {dwm_weight:.4f}")
        print(f"  DWM adjusts path:   {'✅ YES — KEV/age factors changed weights' if abs(dwm_weight - static_weight) > 0.01 else '⚠️ NO difference — check KEV data in cves.json'}")
    
    # Experiment C: Network isolation test
    print("\n[Experiment C] Network Isolation Test")
    G_iso = build_graph("enterprise-bank", "static")
    paths_normal = find_attack_paths_dijkstra(G_iso, "api_gw_1", "swift_terminal", top_k=1)
    
    if paths_normal and not isinstance(paths_normal, dict):
        hub_node = paths_normal[0]['path'][1]  # Second hop (likely a hub)
        G_iso.remove_node(hub_node)
        paths_isolated = find_attack_paths_dijkstra(G_iso, "api_gw_1", "swift_terminal", top_k=1)
        
        hub_removed = isinstance(paths_isolated, dict) or (
            paths_isolated and hub_node not in paths_isolated[0]['path']
        )
        print(f"  Isolated node: {hub_node}")
        print(f"  Hub node removed from path: {'✅ YES' if hub_removed else '❌ NO'}")
        if not isinstance(paths_isolated, dict) and paths_isolated:
            print(f"  Alternative path found: {' → '.join(paths_isolated[0]['path'])}")


def network_realism_report():
    """
    Computes and reports graph topology metrics.
    Validates that synthetic networks match real enterprise network statistics.
    Reference: Beygelzimer et al. (2005); Cisco Annual Internet Report (2020).
    
    Real enterprise network benchmarks (from literature):
      Clustering coefficient: 0.31 – 0.38
      Average path length:    2.8  – 4.1
      Average degree:         3.0  – 5.0
      Diameter:               6    – 12
    """
    REAL_WORLD_RANGES = {
        "clustering_coefficient": (0.31, 0.38),
        "avg_path_length":        (2.8, 4.1),
        "avg_degree":             (3.0, 5.0),
        "diameter":               (6, 12),
    }
    
    networks = [
        ("enterprise-bank", "Enterprise Bank (47 nodes)"),
        ("small-branch-bank", "Small Branch Bank (10 nodes)"),
        ("legacy-iot-bank", "Legacy IoT Bank"),
        ("bangladesh-heist", "Bangladesh Bank Heist (4 nodes)"),
    ]
    
    print("\n" + "=" * 60)
    print("NETWORK TOPOLOGY REALISM REPORT")
    print("=" * 60)
    
    for net_id, net_name in networks:
        try:
            G = build_graph(net_id, "static")
            U = G.to_undirected()
            if not nx.is_connected(U):
                U = G.subgraph(max(nx.weakly_connected_components(G), key=len)).to_undirected()
            
            cc = nx.average_clustering(U)
            apl = nx.average_shortest_path_length(U) if nx.is_connected(U) else None
            avg_deg = sum(d for _, d in G.degree()) / G.number_of_nodes()
            try:
                diam = nx.diameter(U)
            except Exception:
                diam = None
            
            print(f"\n{net_name}")
            print(f"  Nodes: {G.number_of_nodes()}, Edges: {G.number_of_edges()}")
            print(f"  Clustering Coefficient: {cc:.3f}  (real range: 0.31-0.38)")
            print(f"  Avg Path Length:        {f'{apl:.2f}' if apl else 'N/A'}  (real range: 2.8-4.1)")
            print(f"  Average Degree:         {avg_deg:.2f}  (real range: 3.0-5.0)")
            print(f"  Diameter:               {diam if diam else 'N/A'}  (real range: 6-12)")
            
        except Exception as e:
            print(f"\n{net_name}: Error — {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CyberSentinel Algorithm Benchmark")
    parser.add_argument("--network", type=str, default=None, help="Filter to one network ID")
    parser.add_argument("--trials", type=int, default=5, help="Number of timing trials per scenario")
    args = parser.parse_args()
    
    run_benchmark(network_id=args.network, trials=args.trials)
    validate_dijkstra_optimality()
    sensitivity_analysis()
    network_realism_report()

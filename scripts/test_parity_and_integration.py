"""
Rigorous Test Suite for CyberSentinel (Phase 1 & Phase 2)
=========================================================
Tests:
  1. Person 1: Network loading, Dijkstra & A* pathfinding, Top-K ranking, CVE & node data fields.
  2. Person 2: DWM Threat Scorer, ML-Weighted Scorer, and Structured Remediation.
  3. Person 4: FastAPI Server SSE Endpoints (/networks, /options, /simulate, /fix).
"""

import sys
import os
import json

# Add backend to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from graph import build_graph, find_attack_paths, list_networks, get_dropdown_options
import dwm_scorer
import ml_scorer
from main import app, _node_fix
from fastapi.testclient import TestClient

def run_tests():
    print("=" * 70)
    print("RUNNING RIGOROUS TEST SUITE: CYBER SENTINEL PHASE 1 & 2")
    print("=" * 70)

    # ---------------------------------------------------------
    # TEST 1: Person 1 - Multi-Network Topology Loading
    # ---------------------------------------------------------
    print("\n[TEST 1] Person 1: Multi-Network Topology Discovery...")
    networks = list_networks()
    net_ids = [n["id"] for n in networks]
    print(f"  Discovered networks: {net_ids}")
    assert "enterprise-bank" in net_ids, "Missing enterprise-bank network"
    assert "small-branch-bank" in net_ids, "Missing small-branch-bank network"
    assert "legacy-iot-bank" in net_ids, "Missing legacy-iot-bank network"
    print("  --> PASS: All 3 network topologies discovered successfully.")

    # ---------------------------------------------------------
    # TEST 2: Person 1 - Data Field Integrity (DWM attributes)
    # ---------------------------------------------------------
    print("\n[TEST 2] Person 1 & 2: CVE & Node Data Attributes...")
    for net_id in net_ids:
        G = build_graph(network_id=net_id)
        assert len(G.nodes) > 0, f"Graph {net_id} has no nodes"
        assert len(G.edges) > 0, f"Graph {net_id} has no edges"
        for node_id, data in G.nodes(data=True):
            assert "exposure" in data, f"Node {node_id} missing exposure attribute"
            for cve in data.get("cves", []):
                assert "kev_listed" in cve, f"CVE {cve.get('cve_id')} missing kev_listed"
                assert "days_since_published" in cve, f"CVE {cve.get('cve_id')} missing days_since_published"
                assert "patch_available" in cve, f"CVE {cve.get('cve_id')} missing patch_available"
                assert "remediation" in cve, f"CVE {cve.get('cve_id')} missing remediation object"
                rem = cve["remediation"]
                assert "issue" in rem and "impact" in rem and "fix" in rem, f"Incomplete remediation on {cve.get('cve_id')}"
        print(f"  Network '{net_id}': verified {len(G.nodes)} nodes and all CVE attributes.")
    print("  --> PASS: All nodes have exposure and all CVEs have kev_listed, patch_available, days_since_published, and remediation.")

    # ---------------------------------------------------------
    # TEST 3: Person 1 - Top-K Pathfinding (Dijkstra vs A*)
    # ---------------------------------------------------------
    print("\n[TEST 3] Person 1: Top-K Dijkstra and A* Search...")
    G_ent = build_graph("enterprise-bank")
    entry = "api_gw_1"
    target = "swift_terminal"
    
    dijkstra_paths = find_attack_paths(G_ent, entry, target, algorithm="dijkstra", top_k=5)
    assert isinstance(dijkstra_paths, list), "Dijkstra paths should be a list"
    assert len(dijkstra_paths) > 0, "Dijkstra should find at least 1 path"
    print(f"  Dijkstra found {len(dijkstra_paths)} ranked paths from {entry} to {target}.")
    assert dijkstra_paths[0]["is_optimal"] is True, "First path should be marked optimal"
    assert dijkstra_paths[0]["rank"] == 1, "First path rank should be 1"
    assert "total_weight" in dijkstra_paths[0], "Missing total_weight"
    assert "total_hops" in dijkstra_paths[0], "Missing total_hops"
    
    # Check ascending order of weights
    weights = [p["total_weight"] for p in dijkstra_paths]
    assert weights == sorted(weights), f"Paths must be sorted ascending by weight: {weights}"
    print(f"  Dijkstra weights (ascending): {[round(w, 2) for w in weights]}")

    astar_paths = find_attack_paths(G_ent, entry, target, algorithm="astar", top_k=1)
    assert isinstance(astar_paths, list) and len(astar_paths) > 0, "A* should find a path"
    print(f"  A* path found: {' -> '.join(astar_paths[0]['path'])} (hops: {astar_paths[0]['total_hops']})")
    print("  --> PASS: Dijkstra Top-K ranking and A* search functioning correctly.")

    # ---------------------------------------------------------
    # TEST 4: Person 2 - Dynamic Weight Management (DWM) Scorer
    # ---------------------------------------------------------
    print("\n[TEST 4] Person 2: Dynamic Weight Management (DWM) Math...")
    # Baseline CVSS 8.0, not KEV, fresh, internal -> adjusted = 8.0
    base_adj = dwm_scorer.calculate_dynamic_weight(8.0, kev_listed=False, days_since_published=10, patch_available=True, exposure="internal")
    # Urgent: CVSS 8.0, KEV listed (1.3x), unpatched (1.15x), old (1.1x), critical (1.4x)
    urgent_adj = dwm_scorer.calculate_dynamic_weight(8.0, kev_listed=True, days_since_published=500, patch_available=False, exposure="critical")
    print(f"  DWM base adjusted score: {base_adj}")
    print(f"  DWM urgent adjusted score: {urgent_adj}")
    assert urgent_adj > base_adj, "Urgent threat must have higher adjusted risk score"
    
    # Inverted edge weights: higher risk -> lower Dijkstra weight
    base_edge_wt = dwm_scorer.calculate_edge_weight_dwm(8.0, kev_listed=False, days_since_published=10, patch_available=True, exposure="internal")
    urgent_edge_wt = dwm_scorer.calculate_edge_weight_dwm(8.0, kev_listed=True, days_since_published=500, patch_available=False, exposure="critical")
    assert urgent_edge_wt < base_edge_wt, "Urgent threat must have lower edge weight for Dijkstra prioritization"
    print(f"  Edge weights: base={base_edge_wt}, urgent={urgent_edge_wt} (urgent is lower/faster)")

    # Test graph built with DWM
    G_dwm = build_graph("enterprise-bank", weighting_mode="dwm")
    dwm_paths = find_attack_paths(G_dwm, entry, target, algorithm="dijkstra", top_k=3)
    assert len(dwm_paths) > 0, "DWM pathfinding should succeed"
    print(f"  DWM optimal path weight: {round(dwm_paths[0]['total_weight'], 2)}")
    print("  --> PASS: DWM mathematical scoring verified.")

    # ---------------------------------------------------------
    # TEST 5: Person 2 - Machine Learning (ML) Scorer
    # ---------------------------------------------------------
    print("\n[TEST 5] Person 2: ML-Weighted Scorer...")
    ml_edge_hot = ml_scorer.calculate_edge_weight_ml(9.0, kev_listed=True, days_since_published=800, patch_available=False, exposure="public", node_degree=5)
    ml_edge_cold = ml_scorer.calculate_edge_weight_ml(9.0, kev_listed=False, days_since_published=10, patch_available=True, exposure="internal", node_degree=1)
    print(f"  ML Scorer edge weight: hot={ml_edge_hot}, cold={ml_edge_cold}")
    assert ml_edge_hot < ml_edge_cold, "ML hot edge must have lower weight than cold edge"

    G_ml = build_graph("enterprise-bank", weighting_mode="ml")
    ml_paths = find_attack_paths(G_ml, entry, target, algorithm="dijkstra", top_k=3)
    assert len(ml_paths) > 0, "ML pathfinding should succeed"
    print(f"  ML optimal path weight: {round(ml_paths[0]['total_weight'], 2)}")
    print("  --> PASS: ML-weighted threat scoring verified.")

    # ---------------------------------------------------------
    # TEST 6: Person 4 - FastAPI API Endpoints & SSE Streaming
    # ---------------------------------------------------------
    print("\n[TEST 6] Person 4: FastAPI Server Integration Endpoints...")
    client = TestClient(app)
    
    # 1. GET /networks
    resp_net = client.get("/networks")
    assert resp_net.status_code == 200, f"GET /networks returned {resp_net.status_code}"
    assert len(resp_net.json()) == 3, "GET /networks must return 3 topologies"
    print("  GET /networks: OK (3 topologies)")

    # 2. GET /options
    resp_opt = client.get("/options")
    assert resp_opt.status_code == 200, f"GET /options returned {resp_opt.status_code}"
    opt_data = resp_opt.json()
    assert "sources" in opt_data and "destinations" in opt_data
    print("  GET /options: OK")

    # 3. POST /simulate (SSE Stream)
    sim_payload = {
        "entry_node": "api_gw_1",
        "target_node": "swift_terminal",
        "network_id": "enterprise-bank",
        "algorithm": "dijkstra",
        "weighting_mode": "dwm",
        "path_index": 0,
        "top_k": 3
    }
    resp_sim = client.post("/simulate", json=sim_payload)
    assert resp_sim.status_code == 200, f"POST /simulate returned {resp_sim.status_code}"
    lines = resp_sim.text.split("\n\n")
    event_types = []
    received_path = None
    for line in lines:
        if line.startswith("data: ") and not line.endswith("[DONE]"):
            try:
                ev = json.loads(line.replace("data: ", ""))
                event_types.append(ev.get("type"))
                if ev.get("type") == "path":
                    received_path = ev.get("data")
            except:
                pass
    print(f"  POST /simulate SSE events received: {set(event_types)}")
    assert "paths" in event_types, "Missing 'paths' SSE event (Top-K array)"
    assert "path" in event_types, "Missing 'path' SSE event"
    assert "token" in event_types, "Missing narrative 'token' SSE events"
    assert received_path is not None, "Did not capture path object from simulate stream"
    print("  POST /simulate: OK (streams Top-K paths + narrative tokens)")

    # 4. POST /fix (SSE Stream with node_fix SafetyCards)
    resp_fix = client.post("/fix", json={"attack_path": received_path})
    assert resp_fix.status_code == 200, f"POST /fix returned {resp_fix.status_code}"
    fix_lines = resp_fix.text.split("\n\n")
    node_fixes = []
    for line in fix_lines:
        if line.startswith("data: ") and not line.endswith("[DONE]"):
            try:
                ev = json.loads(line.replace("data: ", ""))
                if ev.get("type") == "node_fix":
                    node_fixes.append(ev.get("data"))
            except:
                pass
    print(f"  POST /fix received {len(node_fixes)} node_fix events.")
    assert len(node_fixes) > 0, "POST /fix must stream node_fix events"
    sample_fix = node_fixes[0]
    assert "issue" in sample_fix, "node_fix missing issue"
    assert "impact" in sample_fix, "node_fix missing impact"
    assert "fix" in sample_fix, "node_fix missing fix"
    print(f"  Sample SafetyCard fix: node={sample_fix.get('node_id')}, issue={sample_fix.get('issue')[:45]}...")
    print("  POST /fix: OK (streams structured per-node SafetyCards)")

    print("\n" + "=" * 70)
    print("ALL 6 RIGOROUS INTEGRATION TESTS PASSED WITH ZERO ERRORS!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()

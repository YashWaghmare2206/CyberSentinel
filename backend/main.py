"""
main.py — FastAPI entry point
=============================
Integrates Person 1's Multi-Topology & A*/Dijkstra Pathfinding with
Person 2's Dynamic Weight Management (DWM), ML-Weighted Scorer, and
Structured Per-Node Remediation Cards.

Endpoints:
    GET  /networks                          -> list available topologies
    GET  /options                           -> dropdown data (entry points & goals)
    POST /simulate  {entry, target, ...}    -> SSE: ranked paths, selected path, narrative stream
    POST /fix       {attack_path}           -> SSE: per-node node_fix stream (SafetyCards)
    POST /fix/narrative {attack_path}       -> SSE: continuous prose stream
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from graph import build_graph, find_attack_paths, get_dropdown_options, list_networks
from llm import stream_attack_simulation, stream_fix_suggestions

import dwm_scorer

app = FastAPI(title="CyberSentinel API")

# Wide-open CORS for hackathon/demo purposes.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SimulateRequest(BaseModel):
    entry_node: Optional[str] = "api_gw_1"
    target_node: Optional[str] = "swift_terminal"
    network_id: Optional[str] = "enterprise-bank"
    algorithm: Optional[str] = "dijkstra"
    weighting_mode: Optional[str] = "static"  # "static" | "dwm" | "ml"
    path_index: Optional[int] = 0
    top_k: Optional[int] = 5


class FixRequest(BaseModel):
    attack_path: Dict[str, Any]

class QueryRequest(BaseModel):
    sql: str


def _sse(event_type: str, data) -> str:
    """Formats one Server-Sent-Event line: {"type": ..., "data": ...}."""
    return f"data: {json.dumps({'type': event_type, 'data': data})}\n\n"


@app.get("/")
def root():
    return {"status": "ok", "app": "CyberSentinel Security Intelligence API"}


@app.get("/networks")
def networks():
    """Returns Person 1's list_networks() output."""
    return list_networks()


@app.get("/options")
def options(network_id: Optional[str] = None):
    """Dropdown data for the frontend's entry/target selectors."""
    return get_dropdown_options(network_id)


@app.post("/simulate")
async def simulate(req: SimulateRequest, background_tasks: BackgroundTasks):
    # Build graph per request based on selected network and weighting mode
    network_id = req.network_id or "enterprise-bank"
    weighting_mode = req.weighting_mode or "static"
    algorithm = req.algorithm or "dijkstra"
    top_k = max(1, req.top_k or 5, (req.path_index or 0) + 1)

    G = build_graph(network_id, weighting_mode=weighting_mode)
    
    paths = find_attack_paths(
        G, 
        source=req.entry_node, 
        target=req.target_node, 
        algorithm=algorithm,
        top_k=top_k
    )

    if isinstance(paths, dict) and "error" in paths:
        async def error_stream():
            yield _sse("error", paths["error"])
            yield "data: [DONE]\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")



    # Select the requested ranked path (defaults to optimal path index 0)
    idx = req.path_index if req.path_index is not None and req.path_index < len(paths) else 0
    selected_path = paths[idx]

    async def event_generator():
        # 1. Send full ranked Top-K array for PathList.jsx comparison
        yield _sse("paths", paths)
        # 2. Send selected path for graph animation & narrative
        yield _sse("path", selected_path)
        
        # 3. Stream red-team narrative token by token for the selected path
        async for token in stream_attack_simulation(selected_path):
            yield _sse("token", token)
            await asyncio.sleep(0.025)
            
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


def _node_fix(node: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts {issue, impact, fix, compensating_cmd, patch_cmd} remediation block from node's
    worst CVE or synthesizes a concrete remediation step.
    """
    node_id = node.get("id", "host")
    software = node.get("software", "system software")
    sw_pkg = software.lower().split()[0] if software else "service"
    
    cves = node.get("cves") or []
    if not cves:
        return {
            "issue": f"No known CVE is directly mapped to {node.get('name', node_id)}.",
            "impact": "Host functions as a trusted pivot/transit bridge enabling attacker lateral packet relay.",
            "fix": "Enforce strict zero-trust network segmentation and revoke inter-segment trust peering.",
            "compensating_cmd": f"sudo iptables -I FORWARD -s {node_id} -j DROP # Choke pivot route",
            "patch_cmd": f"sudo systemctl restart auditd && sudo chmod 700 /etc/ssh",
            "priority": "Monitor (P3)",
        }

    worst = max(cves, key=lambda c: float(c.get("cvss_score", 0.0)))
    remediation = worst.get("remediation") or {}
    cve_id = worst.get("cve_id")
    cvss_score = float(worst.get("cvss_score", 7.5))
    urgency = "Fix Now (P1)" if cvss_score >= 9.0 else "Fix This Week (P2)" if cvss_score >= 7.0 else "Monitor (P3)"

    compensating_cmd = f"sudo iptables -I INPUT -p tcp --dport 443 -s 10.0.0.0/8 -j DROP # Hotfix for {cve_id}"
    patch_cmd = f"sudo apt-get update && sudo apt-get --only-upgrade install {sw_pkg} -y"

    if remediation and isinstance(remediation, dict) and "issue" in remediation:
        return {
            "cve_id": cve_id,
            "cvss_score": cvss_score,
            "compensating_cmd": compensating_cmd,
            "patch_cmd": patch_cmd,
            "priority": urgency,
            **remediation,
        }

    desc = (worst.get("description") or "").split(". ")[0]
    return {
        "cve_id": cve_id,
        "cvss_score": cvss_score,
        "issue": f"{cve_id} (CVSS {cvss_score:.1f}, {worst.get('severity', 'HIGH')}): {desc}.",
        "impact": f"Adversary exploits {software} to execute unauthorized commands and harvest credentials.",
        "fix": f"{worst.get('patch') or f'Upgrade {software} to latest vendor patched build'}.",
        "compensating_cmd": compensating_cmd,
        "patch_cmd": patch_cmd,
        "priority": urgency,
    }


@app.post("/fix")
async def fix(req: FixRequest, background_tasks: BackgroundTasks):
    attack_path = req.attack_path

    if not attack_path or not attack_path.get("nodes"):
        async def error_stream():
            yield _sse("error", "No attack path provided to generate a fix for.")
            yield "data: [DONE]\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    node_ids = attack_path.get("path", [])
    nodes = attack_path.get("nodes", [])



    async def event_generator():
        # Streams per-node node_fix events (Person 2's Task 1)
        for i, node in enumerate(nodes):
            await asyncio.sleep(0.35)
            node_id = node_ids[i] if i < len(node_ids) else f"node_{i}"
            fix_content = _node_fix(node)
            
            dwm_breakdown = None
            cves = node.get("cves", [])
            if cves and node.get("adjusted_weight"):
                worst_cve = max(cves, key=lambda c: float(c.get("cvss_score", 0.0)))
                dwm_breakdown = dwm_scorer.formula_breakdown(
                    base_cvss=worst_cve.get("cvss_score", 0.0),
                    kev_listed=bool(worst_cve.get("kev_listed", False)),
                    days_since_published=int(worst_cve.get("days_since_published", 0) or 0),
                    patch_available=bool(worst_cve.get("patch_available", True)),
                    exposure=node.get("exposure", "internal"),
                )

            yield _sse("node_fix", {
                "node_id": node_id,
                "node_name": node.get("name", node_id),
                "dwm_breakdown": dwm_breakdown,
                **fix_content,
            })
        
        # Also stream remediation narrative tokens for markdown display in FixPanel
        async for token in stream_fix_suggestions(attack_path):
            yield _sse("token", token)
            await asyncio.sleep(0.01)

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/fix/narrative")
async def fix_narrative(req: FixRequest):
    """
    Continuous prose remediation stream (LLM-generated) for fallback.
    """
    attack_path = req.attack_path
    if not attack_path or not attack_path.get("nodes"):
        async def error_stream():
            yield _sse("error", "No attack path provided to generate a fix for.")
            yield "data: [DONE]\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    async def event_generator():
        async for token in stream_fix_suggestions(attack_path):
            yield _sse("token", token)
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")



# Cache PIGNN metrics at startup to avoid recomputing on every request
_PIGNN_METRICS_CACHE = None

@app.get("/pignn/metrics")
def pignn_metrics():
    """
    Returns pre-computed PIGNN evaluation metrics from evaluate.py.
    Cached on first call. Returns mock metrics if weights not found.
    """
    global _PIGNN_METRICS_CACHE
    if _PIGNN_METRICS_CACHE is not None:
        return _PIGNN_METRICS_CACHE
    
    try:
        from pignn.evaluate import evaluate_pignn
        from pignn.config import WEIGHTS_PATH
        import os
        if os.path.exists(WEIGHTS_PATH):
            metrics = evaluate_pignn(WEIGHTS_PATH)
            _PIGNN_METRICS_CACHE = {"source": "trained_model", **metrics}
        else:
            # Honest disclosure when weights not present
            _PIGNN_METRICS_CACHE = {
                "source": "architecture_only",
                "note": "Model weights not found. Architecture validated only. Run pignn/train.py to train.",
                "auc": None,
                "f1": None,
                "precision": None,
                "recall": None,
                "cycle_free_pct": None,
                "avg_latency_ms": None,
            }
    except Exception as e:
        _PIGNN_METRICS_CACHE = {"source": "error", "error": str(e)}
    
    return _PIGNN_METRICS_CACHE


@app.get("/benchmark/results")
def benchmark_results():
    """
    Returns pre-computed or generated benchmark results from benchmark_results.json.
    Used by Project Guide / Explainer Algorithm Comparison table.
    """
    results_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "benchmark_results.json")
    if os.path.exists(results_path):
        try:
            with open(results_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return {"cached": True, "results": data}
        except Exception as e:
            return {"cached": False, "error": str(e), "results": []}
    return {"cached": False, "results": []}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

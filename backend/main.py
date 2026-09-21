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

import json
import asyncio
from typing import Optional, Dict, Any, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from graph import build_graph, find_attack_paths, get_dropdown_options, list_networks
from llm import stream_attack_simulation, stream_fix_suggestions

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


def _sse(event_type: str, data) -> str:
    """Formats one Server-Sent-Event line: {"type": ..., "data": ...}."""
    return f"data: {json.dumps({'type': event_type, 'data': data})}\n\n"


@app.get("/networks")
def networks():
    """Returns Person 1's list_networks() output."""
    return list_networks()


@app.get("/options")
def options(network_id: Optional[str] = None):
    """Dropdown data for the frontend's entry/target selectors."""
    return get_dropdown_options(network_id)


@app.post("/simulate")
async def simulate(req: SimulateRequest):
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


def _node_fix(node: Dict[str, Any]) -> Dict[str, str]:
    """
    Task 1: extracts {issue, impact, fix} remediation block from node's
    worst CVE or synthesizes a concrete remediation step.
    """
    cves = node.get("cves") or []
    if not cves:
        return {
            "issue": "No CVE is mapped to this host.",
            "impact": "Used only as a pivot/transit hop via its trust relationship with the previous node.",
            "fix": "Verify strict network segmentation, ACL rules, and audit logging on this hop.",
        }
    worst = max(cves, key=lambda c: float(c.get("cvss_score", 0.0)))
    remediation = worst.get("remediation")
    cve_id = worst.get("cve_id")
    cvss_score = worst.get("cvss_score", 7.5)
    if remediation and isinstance(remediation, dict) and "issue" in remediation:
        return {
            "cve_id": cve_id,
            "cvss_score": cvss_score,
            **remediation,
        }
    
    # Fallback synthesizer if individual CVE hasn't authored remediation
    urgency = "Fix Now" if cvss_score >= 9 else "Fix This Week" if cvss_score >= 7 else "Monitor"
    desc = (worst.get("description") or "").split(". ")[0]
    return {
        "cve_id": cve_id,
        "cvss_score": cvss_score,
        "issue": f"{cve_id} (CVSS {cvss_score}, {worst.get('severity', 'UNKNOWN')}): {desc}.",
        "impact": f"Exploiting this vulnerability at {node.get('name', 'server')} allows privilege escalation on {node.get('software', 'software')}.",
        "fix": f"{worst.get('patch') or 'Apply latest vendor security patch'}. Priority: {urgency}.",
    }


@app.post("/fix")
async def fix(req: FixRequest):
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
            yield _sse("node_fix", {"node_id": node_id, **fix_content})
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

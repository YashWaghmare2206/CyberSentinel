"""
main.py — FastAPI entry point (Person 4 territory; wired here so the merged
project runs out of the box). Matches the exact contract the real frontend
(src/api/simulate.js) expects:

    GET  /networks                         -> returns available networks
    GET  /options                          -> dropdown data
    POST /simulate  {entry, target, etc}   -> SSE: path list, then token stream
    POST /fix       {attack_path}             -> SSE: node_fix stream
"""

import json
from typing import Optional, Dict, Any

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
    weighting_mode: Optional[str] = "static"


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
def options():
    """Dropdown data for the frontend's entry/target selectors."""
    return get_dropdown_options()


@app.post("/simulate")
async def simulate(req: SimulateRequest):
    # Build graph per request based on selected network and weighting mode
    G = build_graph(req.network_id, weighting_mode=req.weighting_mode)
    
    paths = find_attack_paths(
        G, 
        source=req.entry_node, 
        target=req.target_node, 
        algorithm=req.algorithm
    )

    if isinstance(paths, dict) and "error" in paths:
        async def error_stream():
            yield _sse("error", paths["error"])
            yield "data: [DONE]\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    top_path = paths[0]

    async def event_generator():
        # 1. Send the raw ranked paths array first so the frontend can render it
        yield _sse("path", paths)
        
        # 2. Stream the red-team narrative token by token.
        async for token in stream_attack_simulation(top_path):
            yield _sse("token", token)
            
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/fix")
async def fix(req: FixRequest):
    attack_path = req.attack_path

    if not attack_path or not attack_path.get("nodes"):
        async def error_stream():
            yield _sse("error", "No attack path provided to generate a fix for.")
            yield "data: [DONE]\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    async def event_generator():
        # Streams per-node node_fix events (Person 2's task, placeholder logic)
        async for token in stream_fix_suggestions(attack_path):
            yield _sse("token", token)
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

"""
main.py — FastAPI entry point (Person 4 territory; wired here so the merged
project runs out of the box). Matches the exact contract the real frontend
(src/api/simulate.js) expects:

    GET  /options                          -> dropdown data
    POST /simulate  {entry_node, target_node} -> SSE: path, then token stream
    POST /fix       {attack_path}             -> SSE: token stream only

The frontend sends the *already-computed* attack_path object back to /fix
(the exact one /simulate emitted) rather than an entry/target pair — this
avoids any drift between what the user saw simulated and what gets patched,
and skips a redundant graph recompute.

SSE event lines are `data: {"type": "path"|"token"|"error", "data": ...}\n\n`,
terminated by a literal `data: [DONE]\n\n` line, matching src/api/simulate.js's
readSSE() parser exactly.
"""

import json
from typing import Optional, Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from graph import build_graph, find_attack_paths, get_dropdown_options
from llm import stream_attack_simulation, stream_fix_suggestions

app = FastAPI(title="CyberSentinel API")

# Wide-open CORS for hackathon/demo purposes (frontend runs on a different port).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build the graph once at startup — Person 1's engine is pure/stateless per call.
G = build_graph()


class SimulateRequest(BaseModel):
    entry_node: Optional[str] = "api_gw_1"
    target_node: Optional[str] = "swift_terminal"


class FixRequest(BaseModel):
    attack_path: Dict[str, Any]


def _sse(event_type: str, data) -> str:
    """Formats one Server-Sent-Event line: {"type": ..., "data": ...}."""
    return f"data: {json.dumps({'type': event_type, 'data': data})}\n\n"


@app.get("/options")
def options():
    """Dropdown data for the frontend's entry/target selectors."""
    return get_dropdown_options()


@app.post("/simulate")
async def simulate(req: SimulateRequest):
    paths = find_attack_paths(G, entry_node=req.entry_node, target_node=req.target_node)

    if isinstance(paths, dict) and "error" in paths:
        async def error_stream():
            yield _sse("error", paths["error"])
            yield "data: [DONE]\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    top_path = paths[0]

    async def event_generator():
        # 1. Send the raw path first so the frontend can render/animate the graph.
        yield _sse("path", top_path)
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
        async for token in stream_fix_suggestions(attack_path):
            yield _sse("token", token)
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

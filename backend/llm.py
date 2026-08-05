"""
llm.py — Gen AI Reasoning Agent (Person 2)
===========================================
Owns: the red-team attack narrative generator + the auto-fix generator.

This module is deliberately self-contained: it only needs the attack-path
object produced by Person 1's `find_attack_paths()` (see backend/graph.py).
It knows nothing about FastAPI or React — it just exposes two async
generators that yield text tokens, which Person 4 wires into SSE endpoints
in main.py and Person 3 renders in StreamPanel.jsx.

Attack-path object shape (as actually returned by graph.py today):
{
    "path": ["api_gw_1", "waf_1", ..., "swift_terminal"],   # ordered node IDs
    "nodes": [ {name, type, software, cvss_score, cves: [...], risk}, ... ],
    "total_hops": int
}
Note: `nodes[i]` corresponds to `path[i]` (same order, same length) but does
NOT itself contain the node id — we zip them back together below.

Supports three backends (pick via LLM_PROVIDER env var): "groq" (default,
free, recommended), "gemini", "claude". Falls back to a local MOCK mode
with no API key so the rest of the team can develop/demo offline.
"""

import os
import json
import asyncio
from typing import AsyncGenerator, Dict, Any, List

import httpx
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq").lower()   # groq | gemini | claude | mock
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-70b-8192")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:streamGenerateContent?alt=sse&key={GEMINI_API_KEY}"
)

CLAUDE_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
CLAUDE_URL = "https://api.anthropic.com/v1/messages"

# If no key is configured for the chosen provider, transparently fall back
# to MOCK mode so the demo never hard-crashes on a missing .env value.
if LLM_PROVIDER == "groq" and not GROQ_API_KEY:
    LLM_PROVIDER = "mock"
elif LLM_PROVIDER == "gemini" and not GEMINI_API_KEY:
    LLM_PROVIDER = "mock"
elif LLM_PROVIDER == "claude" and not CLAUDE_API_KEY:
    LLM_PROVIDER = "mock"


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

ATTACK_SYSTEM_PROMPT = """You are a senior red-team cybersecurity expert at a major bank.
Given a network graph and a list of CVE vulnerabilities, think EXACTLY like an
attacker probing this specific network. Output a numbered kill chain:

1. Which node to attack first and the specific CVE to exploit (name the CVE ID and CVSS score)
2. Exactly how to execute the exploit at each hop (technical but readable)
3. How to pivot to the next node using credentials, misconfigurations, or flaws found
4. What the end target is and what data or capability is at risk

Rules:
- Name every CVE ID you rely on explicitly.
- Refer to every server by its exact node name, never a generic placeholder.
- Be specific and technical, but keep prose readable for a banking risk committee.
- Keep the entire response under 300 words.
- Estimate how long this attack would take a skilled attacker (e.g. "2-4 hours").
- End the response on its own final line with exactly: SEVERITY: CRITICAL, SEVERITY: HIGH, or SEVERITY: MEDIUM.
"""

FIX_SYSTEM_PROMPT = """You are a senior security remediation engineer at a major bank.
You will be given a confirmed attack kill chain (the path an attacker would take
through the network, and the CVEs exploited at each hop). Produce concrete,
actionable remediation steps — not generic advice.

For each vulnerable node in the path, give:
1. The exact patched version / config change to apply (e.g. "Upgrade Apache to 2.4.51+")
2. A specific compensating control if patching cannot happen immediately
   (e.g. a firewall/ACL rule, network segmentation, credential rotation)
3. Priority ranking (Fix Now / Fix This Week / Monitor)

Rules:
- Be concrete: exact version numbers, exact protocols/ports to restrict, exact
  credentials to rotate — no vague statements like "improve security".
- Organize as a numbered list matching the order of the attack path.
- Keep the entire response under 250 words.
- End with one line: RESIDUAL RISK: <one short sentence on what remains if only these steps are taken>.
"""


# ---------------------------------------------------------------------------
# Helpers — turn Person 1's attack-path object into a prompt
# ---------------------------------------------------------------------------

def _zip_path_with_nodes(attack_path: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Re-attaches the node id to each node dict since graph.py's `nodes`
    list doesn't carry its own id field — it's positional against `path`."""
    ids = attack_path.get("path", [])
    nodes = attack_path.get("nodes", [])
    combined = []
    for i, node in enumerate(nodes):
        entry = dict(node)
        entry["id"] = ids[i] if i < len(ids) else f"node_{i}"
        combined.append(entry)
    return combined


def build_user_message(attack_path: Dict[str, Any]) -> str:
    """Builds the dynamic USER MESSAGE sent alongside the system prompt.
    Renders the hop-by-hop chain: node name, software, and every CVE on it.
    """
    combined = _zip_path_with_nodes(attack_path)

    lines = [f"Attack path ({attack_path.get('total_hops', len(combined) - 1)} hops):"]
    lines.append(" -> ".join(n["name"] for n in combined))
    lines.append("")
    lines.append("Hop-by-hop vulnerability detail:")

    for i, node in enumerate(combined):
        lines.append(f"\n[{i}] {node['name']} (id: {node['id']}, type: {node.get('type', 'internal')})")
        lines.append(f"    Software: {node.get('software', 'Unknown')}")
        cves = node.get("cves") or []
        if not cves:
            lines.append("    No known CVEs on this node — treat as a pivot/transit hop only.")
        for cve in cves:
            lines.append(
                f"    - {cve.get('cve_id')} (CVSS {cve.get('cvss_score')}, "
                f"{cve.get('severity')}): {cve.get('description', '')[:220]}"
            )

    lines.append(
        "\nGenerate the attack simulation narrative for exactly this path, in order."
    )
    return "\n".join(lines)


def build_fix_user_message(attack_path: Dict[str, Any]) -> str:
    combined = _zip_path_with_nodes(attack_path)
    lines = ["Confirmed attack path requiring remediation:"]
    lines.append(" -> ".join(n["name"] for n in combined))
    lines.append("")
    for i, node in enumerate(combined):
        cves = node.get("cves") or []
        if not cves:
            continue
        lines.append(f"[{i}] {node['name']} — Software: {node.get('software', 'Unknown')}")
        for cve in cves:
            lines.append(
                f"    - {cve.get('cve_id')} (CVSS {cve.get('cvss_score')}): "
                f"{cve.get('description', '')[:200]} | Patch note: {cve.get('patch', 'n/a')}"
            )
    lines.append("\nGenerate prioritized remediation steps for this exact chain.")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Mock streaming (no API key needed — used for offline dev / dry runs)
# ---------------------------------------------------------------------------

async def _mock_stream(text: str) -> AsyncGenerator[str, None]:
    for word in text.split(" "):
        await asyncio.sleep(0.02)
        yield word + " "


def _mock_attack_narrative(attack_path: Dict[str, Any]) -> str:
    combined = _zip_path_with_nodes(attack_path)
    if not combined:
        return "No path data available. SEVERITY: MEDIUM"
    step_lines = []
    for i, node in enumerate(combined):
        cves = node.get("cves") or []
        if cves:
            top = max(cves, key=lambda c: c.get("cvss_score", 0))
            step_lines.append(
                f"Step {i + 1}: At {node['name']} ({node.get('software', 'unknown software')}), "
                f"exploit {top['cve_id']} (CVSS {top['cvss_score']}) to gain a foothold."
            )
        else:
            step_lines.append(f"Step {i + 1}: Pivot through {node['name']} to reach the next hop.")
    max_cvss = max(
        (c.get("cvss_score", 0) for n in combined for c in (n.get("cves") or [])), default=0
    )
    severity = "CRITICAL" if max_cvss >= 9 else "HIGH" if max_cvss >= 7 else "MEDIUM"
    narrative = "\n".join(step_lines)
    narrative += (
        f"\nFinal target reached: {combined[-1]['name']}. Estimated exploit time: 2-4 hours "
        f"for a skilled attacker.\nSEVERITY: {severity}"
    )
    return narrative


def _mock_fix_suggestions(attack_path: Dict[str, Any]) -> str:
    """Mirrors the prompt's own length constraint (~250 words) by only
    surfacing the single highest-CVSS CVE per node, same as a real LLM
    would summarize rather than listing every CVE verbatim."""
    combined = _zip_path_with_nodes(attack_path)
    lines = []
    n = 1
    for node in combined:
        cves = node.get("cves") or []
        if not cves:
            continue
        top = max(cves, key=lambda c: c.get("cvss_score", 0))
        priority = "Fix Now" if top["cvss_score"] >= 8 else "Fix This Week" if top["cvss_score"] >= 5 else "Monitor"
        lines.append(
            f"{n}. {node['name']}: patch {node.get('software', 'software')} to remediate "
            f"{top['cve_id']} (CVSS {top['cvss_score']}). "
            f"{top.get('patch', 'Apply vendor advisory.')} Priority: {priority}."
        )
        n += 1
    if not lines:
        lines.append("1. No CVEs detected on this path — monitor for configuration drift.")
    text = "\n".join(lines)
    text += "\nRESIDUAL RISK: Undiscovered zero-days on these hosts remain unaddressed until full patch validation."
    return text


# ---------------------------------------------------------------------------
# Provider-specific streaming implementations
# ---------------------------------------------------------------------------

async def _stream_groq(system_prompt: str, user_message: str) -> AsyncGenerator[str, None]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST",
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "stream": True,
                "temperature": 0.4,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
            },
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                payload = line[len("data: "):]
                if payload.strip() == "[DONE]":
                    break
                try:
                    chunk = json.loads(payload)
                except json.JSONDecodeError:
                    continue
                delta = chunk.get("choices", [{}])[0].get("delta", {})
                token = delta.get("content", "")
                if token:
                    yield token


async def _stream_gemini(system_prompt: str, user_message: str) -> AsyncGenerator[str, None]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST",
            GEMINI_URL,
            headers={"Content-Type": "application/json"},
            json={
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": [{"role": "user", "parts": [{"text": user_message}]}],
            },
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                payload = line[len("data: "):]
                try:
                    chunk = json.loads(payload)
                except json.JSONDecodeError:
                    continue
                candidates = chunk.get("candidates", [])
                if not candidates:
                    continue
                parts = candidates[0].get("content", {}).get("parts", [])
                for part in parts:
                    token = part.get("text", "")
                    if token:
                        yield token


async def _stream_claude(system_prompt: str, user_message: str) -> AsyncGenerator[str, None]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST",
            CLAUDE_URL,
            headers={
                "x-api-key": CLAUDE_API_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": CLAUDE_MODEL,
                "max_tokens": 600,
                "system": system_prompt,
                "stream": True,
                "messages": [{"role": "user", "content": user_message}],
            },
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                payload = line[len("data: "):]
                try:
                    event = json.loads(payload)
                except json.JSONDecodeError:
                    continue
                if event.get("type") == "content_block_delta":
                    token = event.get("delta", {}).get("text", "")
                    if token:
                        yield token


async def _dispatch_stream(system_prompt: str, user_message: str, mock_text: str) -> AsyncGenerator[str, None]:
    if LLM_PROVIDER == "groq":
        async for tok in _stream_groq(system_prompt, user_message):
            yield tok
    elif LLM_PROVIDER == "gemini":
        async for tok in _stream_gemini(system_prompt, user_message):
            yield tok
    elif LLM_PROVIDER == "claude":
        async for tok in _stream_claude(system_prompt, user_message):
            yield tok
    else:  # mock
        async for tok in _mock_stream(mock_text):
            yield tok


# ---------------------------------------------------------------------------
# Public API — what Person 4's main.py imports
# ---------------------------------------------------------------------------

async def stream_attack_simulation(attack_path: Dict[str, Any]) -> AsyncGenerator[str, None]:
    """Yields the red-team kill-chain narrative token by token."""
    if isinstance(attack_path, dict) and "error" in attack_path:
        yield f"Simulation error: {attack_path['error']}"
        return
    user_message = build_user_message(attack_path)
    mock_text = _mock_attack_narrative(attack_path)
    async for token in _dispatch_stream(ATTACK_SYSTEM_PROMPT, user_message, mock_text):
        yield token


async def stream_fix_suggestions(attack_path: Dict[str, Any]) -> AsyncGenerator[str, None]:
    """Yields the remediation plan token by token (second Gen AI call)."""
    if isinstance(attack_path, dict) and "error" in attack_path:
        yield f"Fix generation error: {attack_path['error']}"
        return
    user_message = build_fix_user_message(attack_path)
    mock_text = _mock_fix_suggestions(attack_path)
    async for token in _dispatch_stream(FIX_SYSTEM_PROMPT, user_message, mock_text):
        yield token


async def get_full_attack_narrative(attack_path: Dict[str, Any]) -> str:
    """Non-streaming convenience wrapper (useful for tests / Postman)."""
    return "".join([tok async for tok in stream_attack_simulation(attack_path)])


async def get_full_fix_suggestions(attack_path: Dict[str, Any]) -> str:
    return "".join([tok async for tok in stream_fix_suggestions(attack_path)])


# ---------------------------------------------------------------------------
# Standalone test — run `python llm.py` to sanity check against Person 1's
# real graph output, in whatever provider mode your .env sets (or mock).
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from graph import build_graph, find_attack_paths

    async def main():
        print(f"LLM_PROVIDER resolved to: {LLM_PROVIDER}")
        G = build_graph()
        paths = find_attack_paths(G, entry_node="api_gw_1", target_node="swift_terminal")
        if isinstance(paths, dict) and "error" in paths:
            print("Graph error:", paths["error"])
            return
        top_path = paths[0]

        print("\n=== USER MESSAGE (attack) ===")
        print(build_user_message(top_path))

        print("\n=== STREAMING ATTACK NARRATIVE ===")
        async for token in stream_attack_simulation(top_path):
            print(token, end="", flush=True)
        print()

        print("\n=== STREAMING FIX SUGGESTIONS ===")
        async for token in stream_fix_suggestions(top_path):
            print(token, end="", flush=True)
        print()

    asyncio.run(main())

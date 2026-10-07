"""
llm.py — Gen AI Reasoning Agent (Person 2)
===========================================
Owns: the red-team attack narrative generator + the auto-fix generator.

This module is deliberately self-contained: it only needs the attack-path
object produced by Person 1's `find_attack_paths()` (see backend/graph.py).
It knows nothing about FastAPI or React — it just exposes two async
generators that yield text tokens, which Person 4 wires into SSE endpoints
in main.py and Person 3 renders in StreamPanel.jsx.

Attack-path object shape:
{
    "path": ["api_gw_1", "waf_1", ..., "swift_terminal"],
    "nodes": [ {name, type, software, cvss_score, cves: [...], risk}, ... ],
    "total_hops": int
}

Supports backends:
- "groq" (default recommended)
- "gemini" (Google Gemini Flash)
- "claude" (Anthropic)
- "mock" (High-fidelity offline CyberSentinel Tactical Reasoning Engine)
"""

import os
import json
import asyncio
from typing import AsyncGenerator, Dict, Any, List

import httpx
from dotenv import load_dotenv

load_dotenv(override=True)

# ---------------------------------------------------------------------------
# Configuration & Dynamic Loader
# ---------------------------------------------------------------------------

def get_llm_config():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(backend_dir, ".env")
    example_path = os.path.join(backend_dir, ".env.example")

    # Load from .env.example and .env based on which was modified most recently
    if os.path.exists(example_path):
        load_dotenv(example_path, override=True)
    if os.path.exists(env_path):
        try:
            mtime_env = os.path.getmtime(env_path)
            mtime_example = os.path.getmtime(example_path) if os.path.exists(example_path) else 0
            # If .env is newer or equal, let .env take precedence
            if mtime_env >= mtime_example:
                load_dotenv(env_path, override=True)
        except Exception:
            load_dotenv(env_path, override=True)

    provider = os.getenv("LLM_PROVIDER", "groq").lower()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()
    claude_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    claude_model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6").strip()

    # Auto-detect provider if key provided matches a known prefix
    if groq_key.startswith("gsk_") and not groq_key.startswith("gsk_your_"):
        provider = "groq"
    elif gemini_key.startswith("AIzaSy"):
        provider = "gemini"
    elif claude_key.startswith("sk-ant-"):
        provider = "claude"

    return {
        "provider": provider,
        "groq_key": groq_key,
        "groq_model": groq_model,
        "groq_url": "https://api.groq.com/openai/v1/chat/completions",
        "gemini_key": gemini_key,
        "gemini_model": gemini_model,
        "claude_key": claude_key,
        "claude_model": claude_model,
        "claude_url": "https://api.anthropic.com/v1/messages",
    }


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
    ids = attack_path.get("path", [])
    nodes = attack_path.get("nodes", [])
    combined = []
    for i, node in enumerate(nodes):
        entry = dict(node)
        entry["id"] = ids[i] if i < len(ids) else f"node_{i}"
        combined.append(entry)
    return combined


def build_user_message(attack_path: Dict[str, Any]) -> str:
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
        else:
            top_cves = sorted(cves, key=lambda c: float(c.get("cvss_score", 0)), reverse=True)[:2]
            for cve in top_cves:
                desc = (cve.get('description', '') or '').split(". ")[0]
                lines.append(
                    f"    - {cve.get('cve_id')} (CVSS {cve.get('cvss_score')}, "
                    f"{cve.get('severity')}): {desc}"
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
        top_cves = sorted(cves, key=lambda c: float(c.get("cvss_score", 0)), reverse=True)[:2]
        for cve in top_cves:
            desc = (cve.get('description', '') or '').split(". ")[0]
            lines.append(
                f"    - {cve.get('cve_id')} (CVSS {cve.get('cvss_score')}): "
                f"{desc} | Patch: {cve.get('patch', 'apply vendor patch')}"
            )
    lines.append("\nGenerate prioritized remediation steps for this exact chain.")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# High-Fidelity CyberSentinel Tactical Reasoning Engine (Heuristic Fallback)
# ---------------------------------------------------------------------------

async def _mock_stream(text: str) -> AsyncGenerator[str, None]:
    for word in text.split(" "):
        await asyncio.sleep(0.02)
        yield word + " "


def _mock_attack_narrative(attack_path: Dict[str, Any]) -> str:
    combined = _zip_path_with_nodes(attack_path)
    if not combined:
        return "No path data available. SEVERITY: MEDIUM"

    steps = []
    for i, node in enumerate(combined):
        step_num = i + 1
        name = node.get("name", f"Node {i}")
        software = node.get("software", "system software")
        node_type = node.get("type", "internal")
        cves = node.get("cves") or []

        if cves:
            top = max(cves, key=lambda c: float(c.get("cvss_score", 0.0)))
            cve_id = top.get("cve_id", "CVE-UNKNOWN")
            cvss = float(top.get("cvss_score", 7.5))
            desc = (top.get("description") or "").split(". ")[0]
            if desc and not desc.endswith("."):
                desc += "."

            remed = top.get("remediation") or {}
            impact_desc = remed.get("impact", "")

            if i == 0:
                steps.append(
                    f"**Step {step_num} — Perimeter Infiltration & Beachhead ({name})**\n"
                    f"Exploiting {cve_id} (CVSS {cvss:.1f}, {top.get('severity', 'HIGH')} on {software}).\n"
                    f"Attack Vector: {desc} By sending weaponized requests to the edge interface, the adversary bypasses standard perimeter filters and gains unauthenticated command execution."
                )
            elif i == len(combined) - 1:
                steps.append(
                    f"**Step {step_num} — Crown Jewel Breach & Target Compromise ({name})**\n"
                    f"Exploiting {cve_id} (CVSS {cvss:.1f}, {top.get('severity', 'CRITICAL')} on {software}).\n"
                    f"Tactical Impact: {impact_desc or f'Adversary breaches {name} to execute target mission payload, enabling transaction forgery or database exfiltration.'}"
                )
            else:
                prev_name = combined[i - 1].get("name", f"Step {i}")
                steps.append(
                    f"**Step {step_num} — Internal Lateral Movement ({prev_name} → {name})**\n"
                    f"Exploiting {cve_id} (CVSS {cvss:.1f}, {top.get('severity', 'HIGH')} on {software}).\n"
                    f"Pivot Mechanics: Leveraging the foothold on {prev_name}, adversary traverses internal network routes and exploits {software}. {desc} Access tokens and credentials are harvested to continue lateral traversal."
                )
        else:
            prev_name = combined[i - 1].get("name", "previous host") if i > 0 else "entryway"
            steps.append(
                f"**Step {step_num} — Network Transit Hop ({name})**\n"
                f"Zero CVEs detected on this host. Adversary uses trusted internal peering relationships established with {prev_name} to relay packets toward the next segment."
            )

    max_cvss = max(
        (float(c.get("cvss_score", 0.0)) for n in combined for c in (n.get("cves") or [])), default=7.0
    )
    severity = "CRITICAL" if max_cvss >= 9.0 else "HIGH" if max_cvss >= 7.0 else "MEDIUM"
    time_est = "1-3 hours" if severity == "CRITICAL" else "4-8 hours" if severity == "HIGH" else "1-2 days"
    target_name = combined[-1].get("name", "target asset")

    narrative = "\n\n".join(steps)
    narrative += (
        f"\n\n**Kill Chain Evaluation:** Adversary compromises {target_name} in {len(combined) - 1} hops. "
        f"Estimated time to breach: {time_est}.\nSEVERITY: {severity}"
    )
    return narrative


def _mock_fix_suggestions(attack_path: Dict[str, Any]) -> str:
    combined = _zip_path_with_nodes(attack_path)
    if not combined:
        return "No remediation data available."

    lines = ["Prioritized Remediation & Incident Response Plan:\n"]
    n = 1
    for node in combined:
        cves = node.get("cves") or []
        if not cves:
            lines.append(
                f"{n}. {node['name']} (Transit Hop): enforce strict inter-VLAN ACLs and revoke mutual trust to prevent hop relaying. Priority: Monitor."
            )
            n += 1
            continue

        top = max(cves, key=lambda c: float(c.get("cvss_score", 0.0)))
        cvss = float(top.get("cvss_score", 7.0))
        cve_id = top.get("cve_id")
        software = node.get("software", "software")
        priority = "Fix Now" if cvss >= 9.0 else "Fix This Week" if cvss >= 7.0 else "Monitor"
        remed = top.get("remediation") or {}
        fix = remed.get("fix") or top.get("patch") or f"Apply vendor advisory patch for {software}"

        lines.append(
            f"{n}. {node['name']} ({software}): remediate {cve_id} (CVSS {cvss:.1f}). {fix} Priority: {priority}."
        )
        n += 1

    lines.append(
        "\nRESIDUAL RISK: Internal lateral vectors require immediate host-level isolation and credential rotation to prevent alternative kill chains."
    )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Provider-specific streaming implementations
# ---------------------------------------------------------------------------

async def _stream_groq(config: Dict[str, Any], system_prompt: str, user_message: str) -> AsyncGenerator[str, None]:
    candidate_models = [config["groq_model"]]
    for fallback in ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]:
        if fallback not in candidate_models:
            candidate_models.append(fallback)

    last_error = None
    for model_name in candidate_models:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream(
                    "POST",
                    config["groq_url"],
                    headers={
                        "Authorization": f"Bearer {config['groq_key']}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model_name,
                        "stream": True,
                        "temperature": 0.4,
                        "max_tokens": 400,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_message},
                        ],
                    },
                ) as response:
                    if response.status_code in (400, 404, 429):
                        last_error = Exception(f"HTTP {response.status_code} for {model_name}")
                        continue
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
                    return
        except Exception as e:
            last_error = e
            continue

    if last_error:
        raise last_error


async def _stream_gemini(config: Dict[str, Any], system_prompt: str, user_message: str) -> AsyncGenerator[str, None]:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{config['gemini_model']}:streamGenerateContent?alt=sse&key={config['gemini_key']}"
    )
    async with httpx.AsyncClient(timeout=30.0) as client:
        async with client.stream(
            "POST",
            url,
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


async def _stream_claude(config: Dict[str, Any], system_prompt: str, user_message: str) -> AsyncGenerator[str, None]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        async with client.stream(
            "POST",
            config["claude_url"],
            headers={
                "x-api-key": config["claude_key"],
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": config["claude_model"],
                "max_tokens": 500,
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
    config = get_llm_config()
    provider = config["provider"]

    # Check if a live API key is available
    has_groq = provider == "groq" and bool(config["groq_key"]) and not config["groq_key"].startswith("gsk_your_")
    has_gemini = provider == "gemini" and bool(config["gemini_key"])
    has_claude = provider == "claude" and bool(config["claude_key"])

    if has_groq:
        try:
            async for tok in _stream_groq(config, system_prompt, user_message):
                yield tok
            return
        except Exception as e:
            print(f"[WARN] Live LLM provider 'groq' error: {e}. Falling back to CyberSentinel Tactical AI Engine.")
            notice = "[CyberSentinel Tactical AI Engine // Autonomous Defense Mode]\n\n"
            yield notice
            async for tok in _mock_stream(mock_text):
                yield tok
            return

    if has_gemini:
        try:
            async for tok in _stream_gemini(config, system_prompt, user_message):
                yield tok
            return
        except Exception as e:
            print(f"[WARN] Live LLM provider 'gemini' error: {e}. Falling back to CyberSentinel Tactical AI Engine.")
            notice = "[CyberSentinel Tactical AI Engine // Autonomous Defense Mode]\n\n"
            yield notice
            async for tok in _mock_stream(mock_text):
                yield tok
            return

    if has_claude:
        try:
            async for tok in _stream_claude(config, system_prompt, user_message):
                yield tok
            return
        except Exception as e:
            print(f"[WARN] Live LLM provider 'claude' error: {e}. Falling back to CyberSentinel Tactical AI Engine.")
            notice = "[CyberSentinel Tactical AI Engine // Autonomous Defense Mode]\n\n"
            yield notice
            async for tok in _mock_stream(mock_text):
                yield tok
            return

    # Default offline Tactical Heuristic AI streaming
    async for tok in _mock_stream(mock_text):
        yield tok


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def stream_attack_simulation(attack_path: Dict[str, Any]) -> AsyncGenerator[str, None]:
    if isinstance(attack_path, dict) and "error" in attack_path:
        yield f"Simulation error: {attack_path['error']}"
        return
    user_message = build_user_message(attack_path)
    mock_text = _mock_attack_narrative(attack_path)
    async for token in _dispatch_stream(ATTACK_SYSTEM_PROMPT, user_message, mock_text):
        yield token


async def stream_fix_suggestions(attack_path: Dict[str, Any]) -> AsyncGenerator[str, None]:
    if isinstance(attack_path, dict) and "error" in attack_path:
        yield f"Fix generation error: {attack_path['error']}"
        return
    user_message = build_fix_user_message(attack_path)
    mock_text = _mock_fix_suggestions(attack_path)
    async for token in _dispatch_stream(FIX_SYSTEM_PROMPT, user_message, mock_text):
        yield token


async def get_full_attack_narrative(attack_path: Dict[str, Any]) -> str:
    return "".join([tok async for tok in stream_attack_simulation(attack_path)])


async def get_full_fix_suggestions(attack_path: Dict[str, Any]) -> str:
    return "".join([tok async for tok in stream_fix_suggestions(attack_path)])


if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from graph import build_graph, find_attack_paths

    async def main():
        G = build_graph()
        paths = find_attack_paths(G, source="api_gw_1", target="swift_terminal")
        if isinstance(paths, dict) and "error" in paths:
            print("Graph error:", paths["error"])
            return
        top_path = paths[0]

        print("\n=== STREAMING ATTACK NARRATIVE ===")
        async for token in stream_attack_simulation(top_path):
            print(token, end="", flush=True)
        print()

        print("\n=== STREAMING FIX SUGGESTIONS ===")
        async for token in stream_fix_suggestions(top_path):
            print(token, end="", flush=True)
        print()

    asyncio.run(main())

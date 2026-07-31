// ─────────────────────────────────────────────────────────────────────────
// Talks to Person 4's FastAPI backend (POST /simulate, POST /fix -- both
// SSE per blueprint section 5.2 / 6.5). EventSource only supports GET, so
// per the blueprint's own note we use fetch() + a ReadableStream reader.
//
// If the backend isn't reachable yet (Person 4 hasn't deployed main.py, or
// we're offline), every function transparently falls back to the mock
// generators in data/mockBackend.js so the dashboard is always demoable.
// ─────────────────────────────────────────────────────────────────────────

import { localSimulateStream, localFixStream } from "../data/localEngine";

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const CONNECT_TIMEOUT_MS = 1500;

async function* readSSE(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const line = rawEvent.replace(/^data:\s?/, "").trim();
      if (!line) continue;
      if (line === "[DONE]") {
        yield { type: "done" };
        return;
      }
      try {
        yield JSON.parse(line);
      } catch {
        // ignore malformed keep-alive lines
      }
    }
  }
}

async function postWithTimeout(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok || !res.body) throw new Error(`Backend responded ${res.status}`);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Streams the attack simulation. Yields { type: "path" | "token" | "done" }.
 * Falls back to the local risk-weighted Dijkstra + narrative generator
 * (using Person 1's real network.json/cves.json) if the live backend errors.
 */
export async function* streamSimulation({ entryNode, targetNode, entryLabel, targetLabel }) {
  try {
    const res = await postWithTimeout("/simulate", { entry_node: entryNode, target_node: targetNode });
    yield { type: "source", data: "live" };
    yield* readSSE(res);
  } catch {
    yield { type: "source", data: "local" };
    yield* localSimulateStream(entryNode, targetNode, entryLabel, targetLabel);
  }
}

/**
 * Streams the auto-fix instructions for a given attack path.
 * Falls back to the local remediation-plan generator if the live backend errors.
 */
export async function* streamFix(attackPath) {
  try {
    const res = await postWithTimeout("/fix", { attack_path: attackPath });
    yield { type: "source", data: "live" };
    yield* readSSE(res);
  } catch {
    yield { type: "source", data: "local" };
    yield* localFixStream(attackPath);
  }
}

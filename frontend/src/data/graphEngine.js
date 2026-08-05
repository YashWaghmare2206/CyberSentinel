// ─────────────────────────────────────────────────────────────────────────
// Client-side port of Person 1's backend/graph.py + backend/scorer.py.
// Runs the SAME risk-weighted Dijkstra algorithm over the SAME real
// network.json / cves.json Person 1 shipped, so the dashboard is fully
// live and correct even before Person 4's FastAPI server exists.
//
// The moment /simulate is live (see api/simulate.js), this only serves as
// the fallback path — but it will keep matching the backend exactly,
// since it's a straight port, not an approximation.
// ─────────────────────────────────────────────────────────────────────────

import network from "./network.json";
import cveList from "./cves.json";

// Maps real-world entry points to network nodes (mirrors graph.py exactly).
export const COMMON_ENTRY_POINTS = {
  api_gw_1: "Public-facing web apps (Unpatched software, Insecure APIs)",
  admin_console_1: "Phishing / Insider Threat (Stolen credentials)",
  load_balancer_1: "Exposed infrastructure / Weak remote endpoints",
  linux_legacy_node: "IoT / Unmanaged legacy devices on network",
};

// Maps real-world end goals to network nodes (mirrors graph.py exactly).
export const COMMON_END_GOALS = {
  swift_terminal: "Financial gain (Wire fraud, Cryptocurrency theft)",
  data_warehouse: "Data theft (Customer records, Intellectual property)",
  core_db_node_1: "Sabotage / Ransomware (Disrupting core services)",
  web_app_1: "Botnet building / Persistence (Hijacking compute power)",
};

// scorer.py: calculate_edge_weight — invert CVSS so high risk = low weight.
function calculateEdgeWeight(cvssScore) {
  const score = Math.max(0, Math.min(10, Number(cvssScore) || 0));
  return Math.max(0.1, 10 - score);
}

let _graph = null;

/**
 * graph.py: build_graph() — builds an in-memory directed graph, grouping
 * every CVE under its node and tagging each node with its worst (max)
 * CVSS score, exactly like the Python version.
 */
export function buildGraph() {
  if (_graph) return _graph;

  const cvesByNode = {};
  for (const cve of cveList) {
    if (!cve.node_id) continue;
    (cvesByNode[cve.node_id] ??= []).push(cve);
  }

  const nodes = new Map();
  for (const n of network.nodes) {
    const nodeCves = cvesByNode[n.id] ?? [];
    const maxCvss = nodeCves.length
      ? Math.max(...nodeCves.map((c) => Number(c.cvss_score) || 0))
      : 0;
    nodes.set(n.id, {
      id: n.id,
      name: n.name ?? n.id,
      type: n.type ?? "internal",
      software: n.software ?? "Unknown",
      cvss_score: maxCvss,
      risk: maxCvss,
      cves: nodeCves,
    });
  }

  const adjacency = new Map([...nodes.keys()].map((id) => [id, []]));
  const edges = [];
  for (const e of network.edges) {
    if (!nodes.has(e.from) || !nodes.has(e.to)) continue;
    const targetCvss = nodes.get(e.to).cvss_score;
    const weight = calculateEdgeWeight(targetCvss);
    adjacency.get(e.from).push({ to: e.to, weight, protocol: e.protocol ?? "TCP" });
    edges.push({ from: e.from, to: e.to, protocol: e.protocol ?? "TCP", weight });
  }

  _graph = { nodes, adjacency, edges };
  return _graph;
}

// Binary min-heap of [dist, counter, node] tuples, mirroring networkx's
// heapq-based _dijkstra_multisource exactly (including its counter-based
// FIFO tie-break for equal distances) so results match graph.py bit-for-bit.
class MinHeap {
  constructor() {
    this.items = [];
  }
  get size() {
    return this.items.length;
  }
  push(item) {
    const items = this.items;
    items.push(item);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._less(items[i], items[parent])) {
        [items[i], items[parent]] = [items[parent], items[i]];
        i = parent;
      } else break;
    }
  }
  pop() {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length) {
      items[0] = last;
      let i = 0;
      const n = items.length;
      while (true) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let smallest = i;
        if (l < n && this._less(items[l], items[smallest])) smallest = l;
        if (r < n && this._less(items[r], items[smallest])) smallest = r;
        if (smallest === i) break;
        [items[i], items[smallest]] = [items[smallest], items[i]];
        i = smallest;
      }
    }
    return top;
  }
  _less(a, b) {
    // Compare by (dist, counter) like Python tuple comparison.
    return a[0] !== b[0] ? a[0] < b[0] : a[1] < b[1];
  }
}

function dijkstra(graph, source, target) {
  const { adjacency } = graph;
  const dist = new Map();
  const seen = new Map();
  const prev = new Map();
  const heap = new MinHeap();
  let counter = 0;

  seen.set(source, 0);
  heap.push([0, counter++, source]);

  while (heap.size) {
    const [d, , v] = heap.pop();
    if (dist.has(v)) continue;
    dist.set(v, d);
    if (v === target) break;

    for (const { to, weight } of adjacency.get(v) ?? []) {
      const vuDist = dist.get(v) + weight;
      if (!seen.has(to) || vuDist < seen.get(to)) {
        seen.set(to, vuDist);
        heap.push([vuDist, counter++, to]);
        prev.set(to, v);
      }
    }
  }

  if (!dist.has(target)) return null;

  const path = [target];
  let cur = target;
  while (cur !== source) {
    cur = prev.get(cur);
    if (cur === undefined) return null;
    path.unshift(cur);
  }
  return path;
}

/**
 * graph.py: find_attack_paths() — risk-weighted Dijkstra between the
 * chosen entry point and end goal. Returns the same shape as the Python
 * function: [{ path, nodes, total_hops }], or { error } if unreachable.
 */
export function findAttackPaths(entryNode = "api_gw_1", targetNode = "swift_terminal") {
  const graph = buildGraph();
  if (!graph.nodes.has(entryNode)) {
    return { error: `Invalid entry point: ${entryNode} not in network map.` };
  }
  if (!graph.nodes.has(targetNode)) {
    return { error: `Invalid destination: ${targetNode} not in network map.` };
  }

  const path = dijkstra(graph, entryNode, targetNode);
  if (!path) {
    return { error: `No valid network path exists between ${entryNode} and ${targetNode}.` };
  }

  const pathNodes = path.map((id) => graph.nodes.get(id));
  return [{ path, nodes: pathNodes, total_hops: path.length - 1 }];
}

export function getNode(id) {
  return buildGraph().nodes.get(id);
}

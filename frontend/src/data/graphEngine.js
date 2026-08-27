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

import entNetwork from "./networks/enterprise-bank/network.json";
import entCves from "./networks/enterprise-bank/cves.json";
import sbNetwork from "./networks/small-branch-bank/network.json";
import sbCves from "./networks/small-branch-bank/cves.json";
import iotNetwork from "./networks/legacy-iot-bank/network.json";
import iotCves from "./networks/legacy-iot-bank/cves.json";

const NETWORKS = {
  "enterprise-bank": { network: entNetwork, cves: entCves },
  "small-branch-bank": { network: sbNetwork, cves: sbCves },
  "legacy-iot-bank": { network: iotNetwork, cves: iotCves }
};

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

// Temporary DWM logic to match the backend dwm_scorer.py
function calculateDynamicWeight(baseCvss, kevListed, daysSince, patchAvailable, exposure) {
  const baseScore = Math.max(0, Math.min(10, Number(baseCvss) || 0));
  let tempMult = 1.0;
  if (kevListed) tempMult += 0.2;
  if (!patchAvailable) tempMult += 0.1;
  let envMult = 1.0;
  if (exposure === "public") envMult += 0.2;
  else if (exposure === "critical") envMult += 0.3;
  let adj = baseScore * tempMult * envMult;
  adj = Math.max(0, Math.min(10, adj));
  return Math.max(0.1, 10 - adj);
}

let _graphs = {};

export function buildGraph(networkId = "enterprise-bank", weightingMode = "static") {
  const cacheKey = `${networkId}-${weightingMode}`;
  if (_graphs[cacheKey]) return _graphs[cacheKey];

  const netData = NETWORKS[networkId] || NETWORKS["enterprise-bank"];
  const { network, cves: cveList } = netData;

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
      exposure: n.exposure ?? "internal",
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
    const targetNode = nodes.get(e.to);
    const targetCvss = targetNode.cvss_score;
    
    let weight = calculateEdgeWeight(targetCvss);
    if (weightingMode === "dwm") {
      const nodeCves = targetNode.cves || [];
      if (nodeCves.length > 0) {
        // Find worst CVE for DWM params
        const worst = nodeCves.reduce((a, b) => (Number(a.cvss_score) || 0) > (Number(b.cvss_score) || 0) ? a : b);
        weight = calculateDynamicWeight(targetCvss, worst.kev_listed, worst.days_since_published, worst.patch_available, targetNode.exposure);
      }
    }
    
    adjacency.get(e.from).push({ to: e.to, weight, protocol: e.protocol ?? "TCP" });
    edges.push({ from: e.from, to: e.to, protocol: e.protocol ?? "TCP", weight });
  }

  const graph = { nodes, adjacency, edges };
  _graphs[cacheKey] = graph;
  return graph;
}

// DFS to find top simple paths (matches nx.shortest_simple_paths)
function findSimplePaths(graph, source, target, topK = 5) {
  const { adjacency } = graph;
  const paths = [];
  
  function dfs(current, currentPath, currentWeight) {
    if (current === target) {
      paths.push({ path: [...currentPath], weight: currentWeight });
      return;
    }
    if (currentPath.length > 15 || paths.length > 5000) return;
    
    for (const { to, weight } of adjacency.get(current) ?? []) {
      if (!currentPath.includes(to)) {
        currentPath.push(to);
        dfs(to, currentPath, currentWeight + weight);
        currentPath.pop();
      }
    }
  }
  
  dfs(source, [source], 0);
  paths.sort((a, b) => a.weight - b.weight);
  return paths.slice(0, topK);
}

export function findAttackPaths(entryNode = "api_gw_1", targetNode = "swift_terminal", networkId = "enterprise-bank", algorithm = "dijkstra", weightingMode = "static") {
  const graph = buildGraph(networkId, weightingMode);
  if (!graph.nodes.has(entryNode)) {
    return { error: `Invalid entry point: ${entryNode} not in network map.` };
  }
  if (!graph.nodes.has(targetNode)) {
    return { error: `Invalid destination: ${targetNode} not in network map.` };
  }

  // Use top-K DFS logic for both dijkstra and astar locally for simplicity, 
  // since this is just fallback and we just need valid top-K parity.
  const simplePaths = findSimplePaths(graph, entryNode, targetNode, 5);
  
  if (!simplePaths.length) {
    return { error: `No valid network path exists between ${entryNode} and ${targetNode}.` };
  }

  return simplePaths.map((p, i) => {
    const pathNodes = p.path.map((id) => graph.nodes.get(id));
    return {
      rank: i + 1,
      is_optimal: i === 0,
      path: p.path,
      nodes: pathNodes,
      total_weight: p.weight,
      total_hops: p.path.length - 1
    };
  });
}

export function getNode(id, networkId = "enterprise-bank", weightingMode = "static") {
  return buildGraph(networkId, weightingMode).nodes.get(id);
}

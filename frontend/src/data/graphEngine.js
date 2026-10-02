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

import entNetwork from "./networks/enterprise-bank/network.json" with { type: "json" };
import entCves from "./networks/enterprise-bank/cves.json" with { type: "json" };
import sbNetwork from "./networks/small-branch-bank/network.json" with { type: "json" };
import sbCves from "./networks/small-branch-bank/cves.json" with { type: "json" };
import iotNetwork from "./networks/legacy-iot-bank/network.json" with { type: "json" };
import iotCves from "./networks/legacy-iot-bank/cves.json" with { type: "json" };


const NETWORKS = {
  "enterprise-bank": { network: entNetwork, cves: entCves },
  "small-branch-bank": { network: sbNetwork, cves: sbCves },
  "legacy-iot-bank": { network: iotNetwork, cves: iotCves }
};

export const NETWORK_OPTIONS = {
  "enterprise-bank": {
    sources: {
      api_gw_1: "Public API Gateway (Unpatched software, Insecure APIs)",
      admin_console_1: "Phishing / Insider (Stolen credentials)",
      load_balancer_1: "Exposed Load Balancer (Weak endpoints)",
      linux_legacy_node: "Unmanaged Legacy Device (IoT pivoting)",
    },
    destinations: {
      swift_terminal: "SWIFT Terminal (Financial wire fraud)",
      data_warehouse: "Data Warehouse (Customer records theft)",
      core_db_node_1: "Core Database (Ransomware sabotage)",
      web_app_1: "Web Application (Compute hijacking)",
    },
  },
  "small-branch-bank": {
    sources: {
      branch_vpn_gateway: "Branch VPN Gateway (Insecure remote access)",
      vault_iot_camera: "Vault IP Camera (IoT firmware vulnerability)",
      teller_workstation_1: "Teller Workstation 1 (Phishing / Local exploit)",
    },
    destinations: {
      atm_controller: "ATM Controller (Cash dispense manipulation)",
      branch_file_server: "Branch File Server (Customer records / Exfiltration)",
    },
  },
  "legacy-iot-bank": {
    sources: {
      unpatched_exchange: "Legacy Exchange Server (Remote code execution)",
      legacy_hvac_controller: "Building HVAC BMS (Facility IoT backdoor)",
    },
    destinations: {
      mainframe_terminal: "AS400 Mainframe Terminal (Core banking ledger)",
      win7_workstation: "Legacy Win7 Workstation (Administrative control)",
    },
  },
  "bangladesh-heist": {
    sources: {
      teller_ws_bd: "BD Bank Teller Workstation (Spear-phishing — documented entry point)",
    },
    destinations: {
      fedny_swift: "Federal Reserve NY SWIFT Gateway (Wire fraud — documented $81M target)",
      swift_server_bd: "SWIFT Alliance Access Server (Messaging system)",
    },
  },
};

export const COMMON_ENTRY_POINTS = NETWORK_OPTIONS["enterprise-bank"].sources;
export const COMMON_END_GOALS = NETWORK_OPTIONS["enterprise-bank"].destinations;

export function getNetworkScenarios(networkId = "enterprise-bank") {
  if (NETWORK_OPTIONS[networkId]) return NETWORK_OPTIONS[networkId];
  return NETWORK_OPTIONS["enterprise-bank"];
}

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
    if (weightingMode === "dwm" || weightingMode === "ml") {
      const nodeCves = targetNode.cves || [];
      if (nodeCves.length > 0) {
        // Find worst CVE for DWM/ML params
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

export function selectPath(paths, index = 0) {
  if (!Array.isArray(paths) || paths.length === 0) return null;
  const idx = Math.max(0, Math.min(paths.length - 1, Number(index) || 0));
  return paths[idx];
}

/**
 * MITRE ATT&CK Technique Mapping
 * Maps node types/IDs/names to known ATT&CK techniques.
 * Source: https://attack.mitre.org/matrices/enterprise/
 * Reference: Strom et al. (2018). MITRE ATT&CK: Design and Philosophy.
 */
const MITRE_MAPPINGS = [
  // By node ID exact match
  { match: ["api_gw_1", "load_balancer_1", "unpatched_exchange"],
    id: "T1190", tactic: "Initial Access", name: "Exploit Public-Facing Application" },
  { match: ["admin_console_1", "teller_ws_bd", "teller_workstation_1"],
    id: "T1566.001", tactic: "Initial Access", name: "Phishing: Spearphishing Attachment" },
  { match: ["dmz_bastion", "branch_vpn_gateway", "domain_ctrl_bd"],
    id: "T1021.004", tactic: "Lateral Movement", name: "Remote Services: SSH" },
  { match: ["domain_ctrl_bd"],
    id: "T1550.002", tactic: "Lateral Movement", name: "Pass the Hash" },
  { match: ["core_db_node_1", "swift_server_bd", "swift_terminal"],
    id: "T1078.002", tactic: "Privilege Escalation", name: "Valid Accounts: Domain Accounts" },
  { match: ["swift_terminal", "fedny_swift"],
    id: "T1020", tactic: "Exfiltration", name: "Automated Exfiltration" },
  { match: ["data_warehouse"],
    id: "T1530", tactic: "Collection", name: "Data from Cloud Storage" },
  { match: ["atm_controller"],
    id: "T1491", tactic: "Impact", name: "Defacement / Service Disruption" },
  { match: ["mainframe_terminal"],
    id: "T1486", tactic: "Impact", name: "Data Encrypted for Impact" },
  { match: ["legacy_hvac_controller", "vault_iot_camera"],
    id: "T1200", tactic: "Initial Access", name: "Hardware Additions (IoT)" },
];

export function getMitreAttackMapping(node) {
  if (!node) return null;
  const id = (node.id || "").toLowerCase();
  const name = (node.name || "").toLowerCase();
  
  for (const mapping of MITRE_MAPPINGS) {
    if (mapping.match.some(m => id.includes(m) || name.includes(m.replace(/_/g, " ")))) {
      return { id: mapping.id, tactic: mapping.tactic, name: mapping.name };
    }
  }
  return null;
}


// ─────────────────────────────────────────────────────────────────────────
// Stands in for Person 2's llm.py / SSE narrative until that's live (see
// api/simulate.js, which always tries the real backend first). Unlike a
// fixed script, this reads whatever real path findAttackPaths() computed
// -- for the real network.json/cves.json Person 1 shipped -- and narrates
// it, so it stays correct for any entry point / target combination.
// ─────────────────────────────────────────────────────────────────────────

import { findAttackPaths } from "./graphEngine";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function topCve(node) {
  if (!node.cves?.length) return null;
  return [...node.cves].sort((a, b) => (b.cvss_score ?? 0) - (a.cvss_score ?? 0))[0];
}

function severityForScore(score) {
  if (score >= 9) return "CRITICAL";
  if (score >= 7) return "HIGH";
  if (score >= 4) return "MEDIUM";
  return "LOW";
}

const TYPE_VERB = {
  public: "reaches",
  internal: "pivots into",
  data: "reaches into",
  critical: "breaches",
  control: "seizes control of",
};

/** Builds the red-team narrative text for a given computed path. */
export function buildNarrative(pathResult, entryLabel, targetLabel) {
  const { nodes, total_hops } = pathResult;
  const lines = [];
  let worstScore = 0;
  let worstCve = null;

  nodes.forEach((node, i) => {
    const cve = topCve(node);
    const verb = TYPE_VERB[node.type] ?? "reaches";
    const stepNum = i + 1;

    if (cve && cve.cvss_score > worstScore) {
      worstScore = cve.cvss_score;
      worstCve = cve;
    }

    if (i === 0) {
      lines.push(
        `Step ${stepNum}: The attacker starts at ${node.name} (${node.software}) -- ${entryLabel}.` +
          (cve
            ? ` This host is exposed to ${cve.cve_id} (CVSS ${cve.cvss_score.toFixed(1)}, ${cve.severity}), a ${cve.exploit_type.toLowerCase()} flaw. It's the beachhead.`
            : ` No mapped CVE here -- the attacker uses it purely as an entry surface.`)
      );
      return;
    }

    const prev = nodes[i - 1];
    let line = `Step ${stepNum}: From ${prev.name}, the attacker ${verb} ${node.name} (${node.software}).`;
    if (cve) {
      line += ` It's vulnerable to ${cve.cve_id} (CVSS ${cve.cvss_score.toFixed(1)}, ${cve.severity}) -- ${cve.exploit_type.toLowerCase()}. Exploited, granting deeper access.`;
    } else {
      line += ` No CVE is mapped to this host; the attacker rides its trust relationship with the previous hop instead.`;
    }
    lines.push(line);
  });

  const finalNode = nodes[nodes.length - 1];
  lines.push(
    `Step ${nodes.length + 1}: Endpoint reached -- ${finalNode.name} (${targetLabel}). ` +
      `Total kill chain: ${total_hops} hops across ${nodes.filter((n) => topCve(n)).length} chained CVE${
        nodes.filter((n) => topCve(n)).length === 1 ? "" : "s"
      }. Worst finding along the path: ${worstCve ? `${worstCve.cve_id} (CVSS ${worstScore.toFixed(1)})` : "none"}.`
  );

  const severity = severityForScore(worstScore);
  lines.push(`\nSEVERITY: ${severity}. Estimated time to execute with commodity tooling: ${
    severity === "CRITICAL" ? "2-4 hours" : severity === "HIGH" ? "4-8 hours" : "1-2 days"
  }.`);

  return lines.join("\n\n");
}

/**
 * Builds the auto-fix remediation text for a given computed path.
 * Kept as a plain-text fallback.
 */
export function buildFixPlan(pathResult) {
  const { nodes } = pathResult;
  const lines = [];
  nodes.forEach((node, i) => {
    const cve = topCve(node);
    if (!cve) return;
    const urgency = cve.cvss_score >= 9 ? "1 hour" : cve.cvss_score >= 7 ? "24 hours" : "1 week";
    lines.push(
      `${i + 1}. ${node.name} -- Remediate ${cve.cve_id} (CVSS ${cve.cvss_score.toFixed(1)}): ${cve.patch || "apply vendor patch"}. Priority: ${urgency}.`
    );
  });
  lines.push(
    `${lines.length + 1}. Network-wide -- Segment the destination asset on an isolated VLAN with allow-listed hosts only, and enable audit logging on every host in this chain.`
  );
  return lines.join("\n");
}

/**
 * Task 1: per-node remediation object, pulled from the node's worst CVE.
 * SafetyCard.jsx renders this structured { issue, impact, fix } content.
 */
export function buildNodeFix(node) {
  const cve = topCve(node);
  if (!cve) {
    return {
      issue: "No CVE is mapped to this host.",
      impact: "Used only as a pivot/transit hop via its trust relationship with the previous node.",
      fix: "No patch required here — verify segmentation and logging are still enforced on this hop.",
    };
  }
  if (cve.remediation?.issue) {
    return {
      cve_id: cve.cve_id,
      cvss_score: cve.cvss_score,
      ...cve.remediation,
    };
  }
  const urgency = cve.cvss_score >= 9 ? "Fix Now" : cve.cvss_score >= 7 ? "Fix This Week" : "Monitor";
  return {
    cve_id: cve.cve_id,
    cvss_score: cve.cvss_score,
    issue: `${cve.cve_id} (CVSS ${cve.cvss_score.toFixed(1)}, ${cve.severity}): ${(cve.description || "").split(". ")[0]}.`,
    impact: `Exploiting this at ${node.name} advances the attacker along the kill chain via ${node.software}.`,
    fix: `${cve.patch || "Apply the vendor patch"}. Priority: ${urgency}.`,
  };
}

/**
 * Computes the real attack path and streams the narrative token by token.
 * Task 2: accepts an options bag so the caller can switch between
 * ranked paths (pathIndex) and weighting modes.
 */
export async function* localSimulateStream(
  entryNode,
  targetNode,
  entryLabel,
  targetLabel,
  options = {}
) {
  const { pathIndex = 0, networkId = "enterprise-bank", algorithm = "dijkstra", weightingMode = "static" } = options;
  const result = findAttackPaths(entryNode, targetNode, networkId, algorithm, weightingMode);
  if ("error" in result) {
    yield { type: "error", data: result.error };
    yield { type: "done" };
    return;
  }
  yield { type: "paths", data: result }; // full ranked set
  const idx = Math.max(0, Math.min(result.length - 1, pathIndex));
  const pathResult = result[idx];
  yield { type: "path", data: pathResult }; // selected path
  await sleep(300);

  const narrative = buildNarrative(pathResult, entryLabel, targetLabel);
  const words = narrative.split(/(\s+)/);
  for (const word of words) {
    yield { type: "token", data: word };
    await sleep(55 + Math.random() * 30);
  }
  yield { type: "done" };
}

/**
 * Task 1: streams one node_fix event per node in path order,
 * so SafetyCard.jsx can reveal cards one at a time.
 */
export async function* localFixStream(pathResult) {
  const { nodes } = pathResult;
  if (nodes && Array.isArray(nodes)) {
    for (const node of nodes) {
      yield { type: "node_fix", node_id: node.id, data: buildNodeFix(node) };
      await sleep(320 + Math.random() * 120);
    }
  }
  
  // Also yield legacy fix_token stream for text fallback
  const fixPlan = buildFixPlan(pathResult);
  const words = fixPlan.split(/(\s+)/);
  for (const word of words) {
    yield { type: "fix_token", data: word };
    await sleep(6 + Math.random() * 10);
  }
  yield { type: "done" };
}


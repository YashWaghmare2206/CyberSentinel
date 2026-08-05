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

/** Builds the auto-fix remediation text for a given computed path. */
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
 * Computes the real attack path (Person 1's algorithm) and streams the
 * narrative token by token, mimicking the shape of the real /simulate SSE
 * stream: {type: "path"} then {type: "token"}* then {type: "done"}.
 */
export async function* localSimulateStream(entryNode, targetNode, entryLabel, targetLabel) {
  const result = findAttackPaths(entryNode, targetNode);
  if ("error" in result) {
    yield { type: "error", data: result.error };
    yield { type: "done" };
    return;
  }
  const pathResult = result[0];
  yield { type: "path", data: pathResult };
  await sleep(300);

  const narrative = buildNarrative(pathResult, entryLabel, targetLabel);
  const words = narrative.split(/(\s+)/);
  for (const word of words) {
    yield { type: "token", data: word };
    await sleep(14 + Math.random() * 18);
  }
  yield { type: "done" };
}

/** Streams the auto-fix plan for an already-computed path. */
export async function* localFixStream(pathResult) {
  const fixPlan = buildFixPlan(pathResult);
  const words = fixPlan.split(/(\s+)/);
  for (const word of words) {
    yield { type: "fix_token", data: word };
    await sleep(8 + Math.random() * 14);
  }
  yield { type: "done" };
}

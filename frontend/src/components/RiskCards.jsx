import SafetyCard from "./SafetyCard";
import { buildNodeFix } from "../data/localEngine";
import "./RiskCards.css";

function topCve(node) {
  if (!node.cves?.length) return null;
  return [...node.cves].sort((a, b) => (b.cvss_score ?? 0) - (a.cvss_score ?? 0))[0];
}

export default function RiskCards({ attackPath, status, STATUS, weightingMode = "static" }) {
  const hasRun = status !== STATUS.IDLE;
  const nodes = attackPath?.nodes ?? [];
  const vulnerableNodes = nodes.filter((n) => n.cves?.length);

  return (
    <div className="risk-cards-panel">
      <div className="panel-header">
        <span className="panel-eyebrow">03 // Vulnerability Breakdown & Threat Intelligence</span>
        <h2>Vulnerability Risk Cards</h2>
        {hasRun && <span className="risk-cards-count">{vulnerableNodes.length} hosts flagged</span>}
      </div>

      {!hasRun && (
        <div className="risk-cards-empty">
          CVE threat intelligence and vulnerability details for each node along the attack path will
          appear here once a simulation runs.
        </div>
      )}

      {hasRun && (
        <div className="risk-cards-grid">
          {nodes.map((node, i) => {
            const cve = topCve(node);
            const remediation = buildNodeFix(node);

            return (
              <SafetyCard
                key={`${node.id}-${i}`}
                hopIndex={i}
                nodeId={node.id}
                nodeName={node.name}
                cveId={cve?.cve_id}
                cvssScore={cve?.cvss_score}
                adjustedScore={node.adjusted_weight}
                weightingMode={weightingMode}
                severity={cve?.severity}
                issue={remediation?.issue}
                impact={remediation?.impact}
                fix={remediation?.fix}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

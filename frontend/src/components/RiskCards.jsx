import { riskTier } from "../data/layout";
import "./RiskCards.css";

function topCve(node) {
  if (!node.cves?.length) return null;
  return [...node.cves].sort((a, b) => (b.cvss_score ?? 0) - (a.cvss_score ?? 0))[0];
}

export default function RiskCards({ attackPath, status, STATUS }) {
  const hasRun = status !== STATUS.IDLE;
  const vulnerableNodes = (attackPath?.nodes ?? []).filter((n) => n.cves?.length);

  return (
    <div className="risk-cards-panel">
      <div className="panel-header">
        <span className="panel-eyebrow">03 // Vulnerability Breakdown</span>
        <h2>Risk Cards</h2>
        {hasRun && <span className="risk-cards-count">{vulnerableNodes.length} hosts flagged</span>}
      </div>

      {!hasRun && (
        <div className="risk-cards-empty">
          CVE details for each node on the attack path will appear here once a
          simulation runs.
        </div>
      )}

      {hasRun && (
        <div className="risk-cards-grid">
          {vulnerableNodes.map((node) => {
            const cve = topCve(node);
            const tier = riskTier(cve.cvss_score);
            const extra = node.cves.length - 1;
            return (
              <a
                key={node.id}
                className={`risk-card risk-card--${tier}`}
                href={`https://nvd.nist.gov/vuln/detail/${cve.cve_id}`}
                target="_blank"
                rel="noreferrer"
              >
                <div className="risk-card__head">
                  <span className="risk-card__node">{node.name}</span>
                  <span className={`risk-card__badge risk-card__badge--${tier}`}>
                    {cve.cvss_score.toFixed(1)}
                  </span>
                </div>
                <div className="risk-card__cve">
                  {cve.cve_id}
                  {extra > 0 && <span className="risk-card__extra"> +{extra} more CVE{extra === 1 ? "" : "s"}</span>}
                </div>
                <p className="risk-card__desc">{cve.description}</p>
                <div className="risk-card__footer">
                  <span>{cve.exploit_type}</span>
                  <span className="risk-card__link">View on NVD ↗</span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

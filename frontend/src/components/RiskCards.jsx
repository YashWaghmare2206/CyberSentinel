import { useState, useMemo } from "react";
import SafetyCard from "./SafetyCard";
import { buildNodeFix } from "../data/localEngine";
import "./RiskCards.css";

function topCve(node) {
  if (!node.cves?.length) return null;
  return [...node.cves].sort((a, b) => (Number(b.cvss_score) || 0) - (Number(a.cvss_score) || 0))[0];
}

export default function RiskCards({ attackPath, status, STATUS, weightingMode = "static" }) {
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const hasRun = status !== STATUS.IDLE;
  const nodes = attackPath?.nodes ?? [];

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      const cve = topCve(node);
      const sev = (cve?.severity || (node.cves?.length ? "HIGH" : "SAFE")).toUpperCase();

      if (filterSeverity !== "ALL" && sev !== filterSeverity) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = (node.name || "").toLowerCase().includes(query);
        const matchesId = (node.id || "").toLowerCase().includes(query);
        const matchesSw = (node.software || "").toLowerCase().includes(query);
        const matchesCve = (cve?.cve_id || "").toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesSw && !matchesCve) {
          return false;
        }
      }

      return true;
    });
  }, [nodes, filterSeverity, searchQuery]);

  // Counts for pills
  const counts = useMemo(() => {
    let crit = 0;
    let high = 0;
    let med = 0;
    let clean = 0;
    nodes.forEach((n) => {
      const c = topCve(n);
      if (!c) clean++;
      else if ((c.severity || "").toUpperCase() === "CRITICAL" || (Number(c.cvss_score) >= 9)) crit++;
      else if ((c.severity || "").toUpperCase() === "HIGH" || (Number(c.cvss_score) >= 7)) high++;
      else med++;
    });
    return { all: nodes.length, crit, high, med, clean };
  }, [nodes]);

  const maxCvss = Math.max(...nodes.flatMap((n) => (n.cves || []).map((c) => Number(c.cvss_score) || 0)), 0);

  return (
    <div className="risk-cards-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-header__left">
          <span className="panel-eyebrow">03 // Vulnerability Risk Intelligence</span>
          <h2>Target Attack Path Risk Cards</h2>
        </div>
        {hasRun && (
          <div className="risk-cards-header-stats">
            <span className="risk-stat-badge">
              <strong>{nodes.length}</strong> Total Hops
            </span>
            <span className="risk-stat-badge risk-stat-badge--danger">
              Max CVSS: <strong>{maxCvss > 0 ? maxCvss.toFixed(1) : "N/A"}</strong>
            </span>
          </div>
        )}
      </div>

      {!hasRun && (
        <div className="risk-cards-empty">
          <div className="empty-risk-icon">🛡️</div>
          <h3>No Simulation Path Active</h3>
          <p>
            Trigger a simulation in the dashboard to generate comprehensive CVE vulnerability risk cards,
            exploit blast radius analysis, and dynamic weight penalty formulas for every hop.
          </p>
        </div>
      )}

      {hasRun && (
        <>
          {/* Controls Bar: Search & Severity Filters */}
          <div className="risk-cards-controls">
            <div className="risk-filter-pills" role="tablist">
              <button
                type="button"
                className={`risk-filter-btn ${filterSeverity === "ALL" ? "is-active" : ""}`}
                onClick={() => setFilterSeverity("ALL")}
              >
                All Hops ({counts.all})
              </button>
              {counts.crit > 0 && (
                <button
                  type="button"
                  className={`risk-filter-btn risk-filter-btn--crit ${filterSeverity === "CRITICAL" ? "is-active" : ""}`}
                  onClick={() => setFilterSeverity("CRITICAL")}
                >
                  Critical ({counts.crit})
                </button>
              )}
              {counts.high > 0 && (
                <button
                  type="button"
                  className={`risk-filter-btn risk-filter-btn--high ${filterSeverity === "HIGH" ? "is-active" : ""}`}
                  onClick={() => setFilterSeverity("HIGH")}
                >
                  High ({counts.high})
                </button>
              )}
              {counts.med > 0 && (
                <button
                  type="button"
                  className={`risk-filter-btn ${filterSeverity === "MEDIUM" ? "is-active" : ""}`}
                  onClick={() => setFilterSeverity("MEDIUM")}
                >
                  Medium ({counts.med})
                </button>
              )}
              {counts.clean > 0 && (
                <button
                  type="button"
                  className={`risk-filter-btn ${filterSeverity === "SAFE" ? "is-active" : ""}`}
                  onClick={() => setFilterSeverity("SAFE")}
                >
                  Transit Pivot ({counts.clean})
                </button>
              )}
            </div>

            <div className="risk-search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="risk-search-input"
                placeholder="Search host, CVE ID, software..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="risk-search-clear"
                  onClick={() => setSearchQuery("")}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="risk-cards-grid">
            {filteredNodes.length === 0 ? (
              <div className="risk-cards-none-found">
                No hosts matched the filter criteria &quot;{searchQuery || filterSeverity}&quot;.
              </div>
            ) : (
              filteredNodes.map((node, i) => {
                const cve = topCve(node);
                const remediation = buildNodeFix(node);
                const hopIndex = nodes.findIndex((n) => n.id === node.id);

                return (
                  <SafetyCard
                    key={`${node.id}-${i}`}
                    hopIndex={hopIndex >= 0 ? hopIndex : i}
                    nodeId={node.id}
                    nodeName={node.name}
                    software={node.software}
                    exposure={node.exposure}
                    cveId={cve?.cve_id}
                    cvssScore={cve?.cvss_score}
                    adjustedScore={node.adjusted_weight}
                    weightingMode={weightingMode}
                    severity={cve?.severity}
                    kevListed={cve?.kev_listed}
                    issue={remediation?.issue}
                    impact={remediation?.impact}
                    fix={remediation?.fix}
                    dwmBreakdown={node.dwm_breakdown}
                  />
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

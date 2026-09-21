import React from "react";
import SeverityBadge from "./SeverityBadge";
import { getMitreAttackMapping } from "../data/graphEngine";
import "./ExecutiveReportModal.css";

function formatRemediationFix(fixText, software, cveId) {
  if (!fixText) return "Apply latest vendor security update and verify network segmentation.";
  if (fixText.includes("No specific patch string is on file for")) {
    const vendorMatch = fixText.match(/check the vendor's advisory for ([^and]+) and/i);
    const targetSoftware = vendorMatch ? vendorMatch[1].trim() : (software || "this system");
    return `Apply latest vendor security update for ${targetSoftware} to remediate ${cveId || "identified vulnerability"}. Enforce strict network segmentation and WAF/ACL rules until patched.`;
  }
  return fixText;
}

/**
 * ExecutiveReportModal — CISO-Level Threat Intelligence & Audit Briefing
 * Offers an executive-ready summary, compliance gap analysis, and one-click PDF print export.
 */
export default function ExecutiveReportModal({
  isOpen,
  onClose,
  networkId,
  attackPath,
  rankedPaths = [],
  narrative,
  severity,
  nodeFixes = [],
  weightingMode,
  algorithm,
}) {
  if (!isOpen) return null;

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const nodes = attackPath?.nodes || [];
  const totalHops = attackPath?.total_hops ?? (nodes.length > 0 ? nodes.length - 1 : 0);
  const totalWeight = attackPath?.total_weight ?? 0;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="report-modal-backdrop" onClick={onClose}>
      <div
        className="report-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="report-modal__header">
          <div className="report-modal__brand">
            <span className="report-modal__mark">◆</span>
            <div>
              <h2>CyberSentinel Threat Intelligence Briefing</h2>
              <p className="report-modal__meta">
                CONFIDENTIAL // Incident Simulation Audit · Generated: {dateStr}
              </p>
            </div>
          </div>
          <div className="report-modal__actions">
            <button
              type="button"
              className="report-btn report-btn--print"
              onClick={handlePrint}
              title="Print or Save as PDF"
            >
              🖨️ Export PDF / Print
            </button>
            <button
              type="button"
              className="report-btn report-btn--close"
              onClick={onClose}
              aria-label="Close report"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="report-modal__content">
          {/* Section 1: Executive KPI Summary */}
          <section className="report-section report-kpis">
            <div className="kpi-card">
              <span className="kpi-label">Assessed Perimeter</span>
              <span className="kpi-val">{networkId?.replace(/-/g, " ").toUpperCase()}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Calculated Severity</span>
              <div className="kpi-val">
                <SeverityBadge severity={severity || "HIGH"} />
              </div>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Compromise Steps</span>
              <span className="kpi-val">{totalHops} Network Hops</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Algorithmic Risk Weight</span>
              <span className="kpi-val">{Number(totalWeight).toFixed(2)}</span>
            </div>
          </section>

          {/* Section 2: Executive Assessment */}
          <section className="report-section">
            <h3 className="section-title">01 // Executive Risk Assessment</h3>
            <p className="section-body">
              An advanced adversary exploiting unpatched perimeter infrastructure can traverse{" "}
              <strong>{totalHops} pivotal network nodes</strong> to compromise target banking assets.
              Evaluation under <strong>{algorithm?.toUpperCase()}</strong> pathfinding and{" "}
              <strong>{weightingMode === "dwm" ? "Dynamic Weight Management (DWM)" : weightingMode === "ml" ? "Machine Learning (ML)" : "Static CVSS"}</strong>{" "}
              indicates that public-facing application flaws and internal trust relationships are the primary enablers of lateral movement.
            </p>
            {narrative && (
              <div className="report-narrative-box">
                <div className="narrative-tag">Red-Team AI Attack Sequence</div>
                <div className="narrative-text">{narrative.replace(/SEVERITY:.*$/gi, "").trim()}</div>
              </div>
            )}
          </section>

          {/* Section 3: Alternative Attack Vectors */}
          {rankedPaths.length > 1 && (
            <section className="report-section">
              <h3 className="section-title">02 // Alternative Kill Chains Identified</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Status</th>
                    <th>Hops</th>
                    <th>Cumulative Weight</th>
                    <th>Pivotal Attack Vector</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedPaths.map((p, idx) => (
                    <tr key={idx} className={idx === 0 ? "is-optimal-row" : ""}>
                      <td>#{idx + 1}</td>
                      <td>{idx === 0 ? "★ OPTIMAL (Most Likely)" : "Alternative Vector"}</td>
                      <td>{p.total_hops} hops</td>
                      <td>{Number(p.total_weight).toFixed(1)}</td>
                      <td className="table-path-mono">{p.path?.join(" → ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Section 4: Prioritized Remediation Checklist */}
          <section className="report-section">
            <h3 className="section-title">03 // Prioritized Action & Remediation Checklist</h3>
            <div className="report-fixes-list">
              {(nodeFixes.length > 0 ? nodeFixes : nodes).map((item, i) => {
                const nodeId = item.node_id || item.id;
                const nodeObj = attackPath?.nodes?.find((n) => n.id === nodeId) || {};
                const nodeName = item.node_name || nodeObj.name || item.name || nodeId;
                
                // Robust CVE resolution from item, node data, or fix text
                let cveId = item.cve_id || nodeObj.cves?.[0]?.cve_id;
                if (!cveId && item.fix) {
                  const match = item.fix.match(/CVE-\d{4}-\d+/i);
                  if (match) cveId = match[0];
                }
                const cvss = item.cvss_score || nodeObj.cves?.[0]?.cvss_score;
                const mitre = getMitreAttackMapping({ name: nodeName, id: nodeId });

                return (
                  <div key={i} className="report-fix-card">
                    <div className="report-fix-header">
                      <div className="report-fix-header__left">
                        <span className="fix-hop-num">Step {i + 1}</span>
                        <strong className="fix-node-title">{nodeName}</strong>
                      </div>
                      <div className="report-fix-header__tags">
                        {cveId ? (
                          <span className="fix-cve-pill">
                            {cveId}{cvss ? ` (CVSS ${Number(cvss).toFixed(1)})` : ""}
                          </span>
                        ) : (
                          <span className="fix-cve-pill fix-cve-pill--transit">Network Pivot / Transit</span>
                        )}
                        <span className="fix-mitre-pill">{mitre.id}: {mitre.tactic}</span>
                      </div>
                    </div>
                    <div className="report-fix-body">
                      <div className="fix-action-block">
                        <span className="fix-action-label">Remediation Action:</span>
                        <p className="fix-action-text">{formatRemediationFix(item.fix, nodeName, cveId)}</p>
                      </div>
                      <div className="fix-impact-block">
                        <span className="fix-impact-label">Adversary Impact:</span>
                        <p className="fix-impact-text">{item.impact || "Mitigates lateral escalation and unauthorized network access."}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <footer className="report-modal__footer">
          <span>CyberSentinel Threat Intelligence · Incident Simulation Audit</span>
          <button type="button" className="btn-close-bottom" onClick={onClose}>
            Close Briefing
          </button>
        </footer>
      </div>
    </div>
  );
}

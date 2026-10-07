import { useState } from "react";
import SeverityBadge from "./SeverityBadge";
import { getMitreAttackMapping } from "../data/graphEngine";
import "./SafetyCard.css";

function formatRemediationFix(fixText, software, cveId) {
  if (!fixText) return "Apply vendor security update and enforce strict segmentation.";
  if (fixText.includes("No specific patch string is on file for")) {
    const vendorMatch = fixText.match(/check the vendor's advisory for ([^and]+) and/i);
    const targetSoftware = vendorMatch ? vendorMatch[1].trim() : (software || "this system");
    return `Apply latest vendor security update for ${targetSoftware} to remediate ${cveId || "identified vulnerability"}. Enforce strict network segmentation and WAF/ACL rules until patched.`;
  }
  return fixText;
}

export default function SafetyCard({
  nodeName,
  nodeId,
  software,
  exposure,
  cveId,
  cvssScore,
  adjustedScore,
  weightingMode,
  severity,
  kevListed,
  issue,
  impact,
  fix,
  hopIndex,
  dwmBreakdown,
}) {
  const [copied, setCopied] = useState(false);

  const showAdjusted =
    adjustedScore !== undefined &&
    adjustedScore !== null &&
    weightingMode &&
    weightingMode !== "static";

  const mitre = getMitreAttackMapping({ name: nodeName, id: nodeId });
  const cvssNum = Number(cvssScore) || 0;
  const cvssPercent = Math.min(100, Math.max(0, (cvssNum / 10) * 100));

  const targetUrl = cveId
    ? `https://nvd.nist.gov/vuln/detail/${cveId}`
    : mitre
    ? `https://attack.mitre.org/techniques/${mitre.id}/`
    : "https://www.cisa.gov/known-exploited-vulnerabilities-catalog";

  function handleCopyCve() {
    if (!cveId) return;
    navigator.clipboard.writeText(cveId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function handleCardClick(e) {
    if (window.getSelection()?.toString()?.length > 0) return;
    if (e.target.closest("button, a, summary, input, details")) return;
    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <article
      className={`safety-card safety-card--clickable ${cvssNum >= 9 ? "safety-card--critical" : cvssNum >= 7 ? "safety-card--high" : "safety-card--medium"}`}
      onClick={handleCardClick}
      title={`Click card to navigate to official advisory site (${cveId ? `NIST NVD ${cveId}` : "MITRE ATT&CK"})`}
    >
      {/* Card Header */}
      <header className="safety-card__header">
        <div className="safety-card__title-group">
          {hopIndex !== undefined && (
            <span className="safety-card__hop">HOP {String(hopIndex + 1).padStart(2, "0")}</span>
          )}
          <div className="safety-card__node-info">
            <span className="safety-card__node">{nodeName || nodeId || "Network Node"}</span>
            {software && <span className="safety-card__software">{software}</span>}
          </div>
          {exposure && (
            <span className={`safety-card__exposure exposure--${exposure}`}>
              {exposure === "public" ? "🌐 PUBLIC FACING" : "🔒 INTERNAL ZONE"}
            </span>
          )}
        </div>

        <div className="safety-card__badges">
          {kevListed && (
            <span className="safety-card__kev-badge" title="Listed in CISA Known Exploited Vulnerabilities Catalog">
              <span className="kev-pulse" />
              CISA KEV EXPLOITED
            </span>
          )}
          {mitre && (
            <a
              className="safety-card__mitre"
              href={`https://attack.mitre.org/techniques/${mitre.id}/`}
              target="_blank"
              rel="noreferrer"
              title={`MITRE ATT&CK ${mitre.id} (${mitre.tactic}): ${mitre.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              MITRE {mitre.id} ↗
            </a>
          )}
          {cveId && (
            <div className="safety-card__cve-actions">
              <a
                className="safety-card__cve-link"
                href={targetUrl}
                target="_blank"
                rel="noreferrer"
                title={`Open official NIST NVD record for ${cveId} in new tab`}
                onClick={(e) => e.stopPropagation()}
              >
                <span>🔗 {cveId}</span>
                <span className="cve-arrow">↗</span>
              </a>
              <button
                type="button"
                className="safety-card__cve-copy"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyCve();
                }}
                title="Copy CVE ID"
              >
                {copied ? "✓ Copied" : "📋"}
              </button>
            </div>
          )}
          {severity && <SeverityBadge severity={severity} />}
        </div>
      </header>

      {/* Visual CVSS Risk Meter */}
      {cvssNum > 0 && (
        <div className="safety-card__meter-bar">
          <div className="meter-labels">
            <span className="meter-label-left">
              Base NVD CVSS: <strong>{cvssNum.toFixed(1)} / 10.0</strong>
            </span>
            {showAdjusted && (
              <span className="meter-label-right">
                {weightingMode === "ml" ? "ML Predicted Risk: " : "DWM Edge Weight: "}
                <strong>{Number(adjustedScore).toFixed(1)}</strong>
              </span>
            )}
          </div>
          <div className="meter-track">
            <div
              className={`meter-fill meter-fill--${cvssNum >= 9 ? "critical" : cvssNum >= 7 ? "high" : "medium"}`}
              style={{ width: `${cvssPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Structured Technical Breakdown */}
      <dl className="safety-card__body">
        {issue && (
          <div className="safety-card__section">
            <dt className="safety-card__term safety-card__term--issue">
              <span className="term-num">01</span> Identified Vulnerability & Flaw
            </dt>
            <dd className="safety-card__desc">{issue}</dd>
          </div>
        )}
        {impact && (
          <div className="safety-card__section">
            <dt className="safety-card__term safety-card__term--impact">
              <span className="term-num">02</span> Lateral Exploit Blast Radius
            </dt>
            <dd className="safety-card__desc">{impact}</dd>
          </div>
        )}
        {fix && (
          <div className="safety-card__section">
            <dt className="safety-card__term safety-card__term--fix">
              <span className="term-num">03</span> Compensating & Remediation Control
            </dt>
            <dd className="safety-card__desc safety-card__desc--fix">{formatRemediationFix(fix, nodeName, cveId)}</dd>
          </div>
        )}
      </dl>

      {/* DWM Formula Receipt */}
      {dwmBreakdown && weightingMode === "dwm" && (
        <details className="safety-card__dwm-receipt">
          <summary className="safety-card__dwm-summary">
            📐 DWM Scoring Formula Receipt — Contextual Edge Weight Multipliers
          </summary>
          <div className="safety-card__dwm-body">
            <div className="dwm-step dwm-step--base">
              <span>Base NVD CVSS Score</span>
              <strong>{dwmBreakdown.base_cvss}</strong>
            </div>
            {dwmBreakdown.steps.map((step, i) => (
              <div key={i} className={`dwm-step ${step.applied ? 'dwm-step--active' : 'dwm-step--inactive'}`}>
                <div className="dwm-step__label">
                  {step.applied ? '✦' : '○'} {step.label}
                  <span className="dwm-step__mult">×{step.multiplier}</span>
                </div>
                <div className="dwm-step__reason">{step.reason}</div>
                <div className="dwm-step__result">→ {step.value_after}</div>
              </div>
            ))}
            <div className="dwm-step dwm-step--result">
              <span>Adjusted CVSS → Final Edge Weight</span>
              <strong>{dwmBreakdown.adjusted_cvss} → {dwmBreakdown.edge_weight}</strong>
            </div>
            <div
              className="dwm-interpretation"
              style={{
                color: dwmBreakdown.edge_weight < 1.0 ? '#f87171' :
                       dwmBreakdown.edge_weight < 3.0 ? '#fb923c' :
                       dwmBreakdown.edge_weight < 6.0 ? '#facc15' : '#4ade80'
              }}
            >
              {dwmBreakdown.interpretation}
            </div>
          </div>
        </details>
      )}

      {/* External Advisory Site Navigation Action */}
      <div className="safety-card__footer-nav">
        <a
          href={targetUrl}
          target="_blank"
          rel="noreferrer"
          className="safety-card__nav-btn"
          onClick={(e) => e.stopPropagation()}
          title={`Open official ${cveId ? `NIST NVD vulnerability page for ${cveId}` : "MITRE ATT&CK technique"} in external tab`}
        >
          <span>🌐 {cveId ? `Open ${cveId} on NIST NVD` : "Open MITRE Technique Advisory"}</span>
          <span className="nav-arrow">↗</span>
        </a>
      </div>
    </article>
  );
}

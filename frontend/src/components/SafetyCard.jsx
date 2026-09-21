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
  cveId,
  cvssScore,
  adjustedScore,
  weightingMode,
  severity,
  issue,
  impact,
  fix,
  hopIndex,
}) {
  const showAdjusted =
    adjustedScore !== undefined &&
    adjustedScore !== null &&
    weightingMode &&
    weightingMode !== "static";

  const mitre = getMitreAttackMapping({ name: nodeName, id: nodeId });

  return (
    <article className="safety-card">
      <header className="safety-card__header">
        <div className="safety-card__title-group">
          {hopIndex !== undefined && (
            <span className="safety-card__hop">Hop {hopIndex + 1}</span>
          )}
          <span className="safety-card__node">{nodeName || nodeId || "Network Node"}</span>
        </div>
        <div className="safety-card__badges">
          {mitre && (
            <a
              className="safety-card__mitre"
              href={`https://attack.mitre.org/techniques/${mitre.id}/`}
              target="_blank"
              rel="noreferrer"
              title={`MITRE ATT&CK ${mitre.id} (${mitre.tactic}): ${mitre.name}`}
            >
              MITRE {mitre.id}
            </a>
          )}
          {cveId && (
            <a
              className="safety-card__cve"
              href={`https://nvd.nist.gov/vuln/detail/${cveId}`}
              target="_blank"
              rel="noreferrer"
              title="Inspect on NIST National Vulnerability Database"
            >
              {cveId} ↗
            </a>
          )}
          {severity && <SeverityBadge severity={severity} />}
          {cvssScore !== undefined && cvssScore !== null && (
            <span className="safety-card__cvss" title="Base NVD CVSS Score">
              CVSS {Number(cvssScore).toFixed(1)}
            </span>
          )}
          {showAdjusted && (
            <span
              className="safety-card__cvss safety-card__cvss--adjusted"
              title="Contextual Dynamic Weight / ML Risk Score"
            >
              {weightingMode === "ml" ? "ML Risk" : "DWM Risk"} {Number(adjustedScore).toFixed(1)}
            </span>
          )}
        </div>
      </header>

      <dl className="safety-card__body">
        {issue && (
          <>
            <dt className="safety-card__term safety-card__term--issue">01 // Identified Flaw</dt>
            <dd className="safety-card__desc">{issue}</dd>
          </>
        )}
        {impact && (
          <>
            <dt className="safety-card__term safety-card__term--impact">02 // Exploit Blast Radius</dt>
            <dd className="safety-card__desc">{impact}</dd>
          </>
        )}
        {fix && (
          <>
            <dt className="safety-card__term safety-card__term--fix">03 // Remediation Action</dt>
            <dd className="safety-card__desc safety-card__desc--fix">{formatRemediationFix(fix, nodeName, cveId)}</dd>
          </>
        )}
      </dl>
    </article>
  );
}

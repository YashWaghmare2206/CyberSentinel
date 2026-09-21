import { useState } from "react";
import SafetyCard from "./SafetyCard";
import "./FixPanel.css";

export default function FixPanel({ fixText, nodeFixes, status, STATUS, weightingMode = "static" }) {
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  const visible = status !== STATUS.IDLE && status !== STATUS.SIMULATING;
  const isFixing = status === STATUS.FIXING;

  if (!visible) return null;

  const hasCards = Array.isArray(nodeFixes) && nodeFixes.length > 0;

  function handleApplyFixes() {
    setApplying(true);
    setTimeout(() => {
      setApplying(false);
      setApplied(true);
    }, 600);
  }

  return (
    <div className="fix-panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">04 // Automated Incident Response</span>
          <h2>Auto-Fix Instructions</h2>
        </div>
        <div className="fix-panel__header-actions">
          {isFixing && <span className="fix-panel__spinner" aria-label="Generating fixes" />}
          {hasCards && !isFixing && (
            <button
              type="button"
              className={`btn-apply-fixes ${applied ? "is-applied" : ""}`}
              onClick={handleApplyFixes}
              disabled={applying}
            >
              {applying ? (
                <>
                  <span className="fix-panel__spinner" />
                  <span>Deploying Patches...</span>
                </>
              ) : applied ? (
                <span>✓ All {nodeFixes.length} Fixes Applied</span>
              ) : (
                <span>Deploy All Fixes</span>
              )}
            </button>
          )}
        </div>
      </div>

      {hasCards ? (
        <div className="fix-panel__cards">
          {nodeFixes.map((card, i) => (
            <SafetyCard
              key={`${card.node_id || "hop"}-${i}`}
              hopIndex={i}
              nodeId={card.node_id}
              nodeName={card.node_name || card.node_id}
              cveId={card.cve_id}
              cvssScore={card.cvss_score}
              adjustedScore={card.adjusted_weight}
              weightingMode={weightingMode}
              severity={card.severity}
              issue={card.issue}
              impact={card.impact}
              fix={card.fix}
            />
          ))}
          {isFixing && (
            <div className="fix-panel__loading-card">
              <span className="fix-panel__spinner" />
              <span>Analyzing next vulnerable hop in kill chain...</span>
            </div>
          )}
        </div>
      ) : (
        <pre className="fix-panel__text">
          {fixText || "Generating remediation steps for every CVE in the kill chain…"}
          {isFixing && <span className="stream-cursor">▌</span>}
        </pre>
      )}
    </div>
  );
}

import { useEffect, useRef, useState, useMemo } from "react";
import SeverityBadge from "./SeverityBadge";
import "./StreamPanel.css";

function parseNarrative(text) {
  if (!text) return { banner: null, steps: [], summary: null, raw: "" };

  let raw = text;
  let banner = null;

  // Extract banner if present at start e.g. [CYBERSENTINEL ...] or [Notice: ...]
  const bannerMatch = raw.match(/^\[(.*?)\]\s*\n*/);
  if (bannerMatch) {
    banner = bannerMatch[1];
    raw = raw.slice(bannerMatch[0].length);
  }

  // Check for Kill Chain Evaluation / Conclusion at the end
  let summary = null;
  const summarySplit = raw.split(/(?=\*\*Kill Chain Evaluation:\*\*|Kill Chain Evaluation:|### Tactical Assessment)/i);
  let mainText = raw;
  if (summarySplit.length > 1) {
    mainText = summarySplit[0];
    summary = summarySplit.slice(1).join("").trim();
  }

  // Split steps by "**Step X" or "Step X —"
  const stepRegex = /(?:\n\n|^)(?=\*\*Step\s+\d+|Step\s+\d+[\s—:-])/i;
  const rawParts = mainText.split(stepRegex).filter((p) => p.trim().length > 0);

  const steps = rawParts.map((part, index) => {
    const trimmed = part.trim();
    // Match header: e.g. "**Step 1 — Perimeter Infiltration & Beachhead (Public API Gateway 1)**"
    const headerMatch = trimmed.match(/^(?:\*\*)?(Step\s+\d+[^(\n*]+(?:\(([^)]+)\))?)(?:\*\*)?\s*\n*([\s\S]*)/i);

    if (headerMatch) {
      const headerTitle = headerMatch[1].replace(/\*\*/g, "").trim();
      const nodeTarget = headerMatch[2] ? headerMatch[2].trim() : null;
      const body = headerMatch[3] ? headerMatch[3].trim() : "";

      // Extract CVE IDs
      const cves = [...body.matchAll(/\b(CVE-\d{4}-\d{4,7})\b/gi)].map((m) => m[1]);
      // Extract CVSS
      const cvssMatch = body.match(/CVSS\s*([0-9.]+)/i);
      const cvss = cvssMatch ? cvssMatch[1] : null;

      return {
        id: `step-${index + 1}`,
        stepNum: index + 1,
        title: headerTitle,
        nodeTarget,
        cves: Array.from(new Set(cves)),
        cvss,
        body,
      };
    }

    return {
      id: `step-${index + 1}`,
      stepNum: index + 1,
      title: `Tactical Phase ${index + 1}`,
      nodeTarget: null,
      cves: [],
      cvss: null,
      body: trimmed,
    };
  });

  return { banner, steps, summary, raw: text };
}

export default function StreamPanel({
  narrative,
  status,
  STATUS,
  severity,
  dataSource,
  errorMessage,
  algorithm,
  pignnConfidence,
  onSwitchToFix,
  hasFix,
  onSkipTypewriter,
  onOpenRisk,
  onOpenFix,
  fixAvailable,
  lowerTab,
  detailsOpen,
}) {
  const scrollRef = useRef(null);
  const [viewMode, setViewMode] = useState("intel"); // "intel" | "raw"
  const [copied, setCopied] = useState(false);

  const isStreaming = status === STATUS.SIMULATING;
  const isError = status === STATUS.ERROR;
  const hasStarted = status !== STATUS.IDLE;

  const parsed = useMemo(() => parseNarrative(narrative), [narrative]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [narrative, viewMode]);

  function handleCopy() {
    if (!narrative) return;
    navigator.clipboard.writeText(narrative);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="stream-panel">
      <div className="panel-header">
        <div className="panel-header__left">
          <span className="panel-eyebrow">02 // Gen AI Reasoning Agent</span>
          <h2>Red-Team Kill Chain Intelligence</h2>
        </div>
        <div className="panel-header__right">
          {severity && <SeverityBadge severity={severity} />}
          {narrative && (
            <div className="stream-panel__view-controls">
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === "intel" ? "is-active" : ""}`}
                onClick={() => setViewMode("intel")}
                title="Tactical Intelligence Structured View"
              >
                Intel View
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === "raw" ? "is-active" : ""}`}
                onClick={() => setViewMode("raw")}
                title="Raw Monospace Console"
              >
                Console
              </button>
              <button
                type="button"
                className="btn-copy-stream"
                onClick={handleCopy}
                title="Copy Full Tactical Report"
              >
                {copied ? "✓ Copied" : "📋 Copy"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="stream-panel__body" ref={scrollRef}>
        {!hasStarted && (
          <div className="stream-panel__empty">
            <div className="empty-icon-pulse">⚡</div>
            <h3>Awaiting Attack Simulation</h3>
            <p>
              Select an entry point and target crown jewel, then click <strong>Simulate Attack</strong> to initialize the
              AI Reasoning Agent.
            </p>
            <div className="empty-features-grid">
              <div className="empty-feature">
                <span className="feat-num">01</span>
                <span>Hop-by-hop lateral movement reconstruction</span>
              </div>
              <div className="empty-feature">
                <span className="feat-num">02</span>
                <span>Active CVE exploitation & credential harvesting telemetry</span>
              </div>
              <div className="empty-feature">
                <span className="feat-num">03</span>
                <span>Multi-hop pivot mechanics with automated remediation chokepoints</span>
              </div>
            </div>
          </div>
        )}

        {hasStarted && isError && (
          <div className="stream-panel__error">
            <span className="stream-panel__error-icon">⚠</span>
            <div>
              <strong>Simulation Failed</strong>
              <p>{errorMessage || "No reachable lateral movement path was discovered between the chosen topology nodes."}</p>
              <p className="stream-panel__error-hint">
                Verify network segmentation rules or select an alternative entry/destination pair.
              </p>
            </div>
          </div>
        )}

        {hasStarted && !isError && (
          <>
            {/* Banner Header */}
            {parsed.banner && (
              <div className="stream-intel__banner">
                <span className="banner-beacon" />
                <span className="banner-text">{parsed.banner}</span>
              </div>
            )}

            {/* Fast-Forward / Skip button while streaming */}
            {isStreaming && onSkipTypewriter && (
              <div className="stream-panel__skip-bar">
                <div className="skip-bar__typing">
                  <span className="typing-dot" />
                  <span>Streaming red-team reasoning in real time...</span>
                </div>
                <button
                  type="button"
                  className="btn-skip-typing"
                  onClick={onSkipTypewriter}
                  title="Reveal full analysis immediately"
                >
                  ⏩ Fast-Forward
                </button>
              </div>
            )}

            {viewMode === "raw" ? (
              <pre className="stream-panel__text">
                {narrative}
                {isStreaming && <span className="stream-cursor">▌</span>}
              </pre>
            ) : (
              <div className="stream-intel">
                {parsed.steps.map((step) => (
                  <article key={step.id} className="stream-intel__card">
                    <header className="intel-card__head">
                      <div className="intel-card__badge-row">
                        <span className="intel-card__step-tag">HOP {step.stepNum.toString().padStart(2, "0")}</span>
                        {step.nodeTarget && (
                          <span className="intel-card__target-chip">
                            🎯 {step.nodeTarget}
                          </span>
                        )}
                        {step.cvss && (
                          <span className="intel-card__cvss-chip">
                            CVSS {Number(step.cvss).toFixed(1)}
                          </span>
                        )}
                        {step.cves.map((cve) => (
                          <span key={cve} className="intel-card__cve-pill">
                            {cve}
                          </span>
                        ))}
                      </div>
                      <h4 className="intel-card__title">{step.title}</h4>
                    </header>

                    <div className="intel-card__body">
                      {step.body.split("\n\n").map((para, pIdx) => {
                        const trimmedPara = para.trim();
                        if (!trimmedPara) return null;
                        return (
                          <p key={pIdx} className="intel-card__para">
                            {trimmedPara}
                          </p>
                        );
                      })}
                    </div>
                  </article>
                ))}

                {/* Tactical Kill Chain Summary */}
                {parsed.summary && (
                  <div className="stream-intel__summary">
                    <div className="summary-header">
                      <span className="summary-eyebrow">TACTICAL ASSESSMENT // INCIDENT SUMMARY</span>
                      <h4>Kill Chain Execution Conclusion</h4>
                    </div>
                    <div className="summary-body">
                      <p>{parsed.summary.replace(/SEVERITY:\s*(CRITICAL|HIGH|MEDIUM|LOW)/gi, "").trim()}</p>
                    </div>
                    {severity && (
                      <div className="summary-footer">
                        <span>OVERALL BLAST RADIUS SEVERITY:</span>
                        <SeverityBadge severity={severity} />
                      </div>
                    )}
                  </div>
                )}

                {isStreaming && (
                  <div className="stream-intel__cursor-row">
                    <span className="stream-cursor">▌</span>
                    <span className="cursor-label">Analyzing attacker lateral traversal...</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="stream-panel__footer">
        <div className="stream-panel__status-info">
          <span className={`status-dot status-dot--${status}`} />
          <span className="stream-panel__status-text">
            {status === STATUS.IDLE && "Ready"}
            {status === STATUS.SIMULATING && "Reasoning in progress…"}
            {status === STATUS.NARRATIVE_DONE && "Kill chain mapped"}
            {status === STATUS.FIXING && "Compiling remediation…"}
            {status === STATUS.COMPLETE && "Simulation complete"}
            {status === STATUS.ERROR && "Path blocked / severed"}
          </span>
          {dataSource && (
            <span className={`source-pill source-pill--${dataSource === "live" ? "live" : "mock"}`}>
              {dataSource === "live" ? "LIVE ENGINE" : "OFFLINE ENGINE"}
            </span>
          )}
          {algorithm === "pignn" && pignnConfidence != null && (
            <span className="stream-meta-pignn">PIGNN {pignnConfidence}% Conf</span>
          )}
        </div>

        <div className="stream-panel__actions">
          {(hasFix || status === STATUS.NARRATIVE_DONE || status === STATUS.COMPLETE) && onSwitchToFix && (
            <button
              type="button"
              className="btn-switch-to-fix"
              onClick={onSwitchToFix}
            >
              🛡️ View Remediation Fixes →
            </button>
          )}

          {(onOpenRisk || onOpenFix) && (
            <div className="stream-panel__dock-actions" role="tablist">
              <button
                type="button"
                role="tab"
                className={`detail-dock__btn ${lowerTab === "risk" && detailsOpen ? "is-active" : ""}`}
                aria-selected={lowerTab === "risk" && detailsOpen}
                onClick={onOpenRisk}
              >
                Risk Cards
              </button>
              <button
                type="button"
                role="tab"
                className={`detail-dock__btn ${lowerTab === "fix" && detailsOpen ? "is-active" : ""}`}
                aria-selected={lowerTab === "fix" && detailsOpen}
                disabled={!fixAvailable}
                onClick={onOpenFix}
              >
                Auto-Fixes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

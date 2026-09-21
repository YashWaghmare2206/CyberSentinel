import { useEffect, useRef } from "react";
import SeverityBadge from "./SeverityBadge";
import "./StreamPanel.css";

export default function StreamPanel({
  narrative,
  status,
  STATUS,
  severity,
  dataSource,
  errorMessage,
  onOpenRisk,
  onOpenFix,
  fixAvailable,
  lowerTab,
  detailsOpen,
}) {
  const scrollRef = useRef(null);
  const isStreaming = status === STATUS.SIMULATING;
  const isError = status === STATUS.ERROR;
  const hasStarted = status !== STATUS.IDLE;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [narrative]);

  return (
    <div className="stream-panel">
      <div className="panel-header">
        <span className="panel-eyebrow">02 // Gen AI Reasoning Agent</span>
        <h2>Red-Team Kill Chain</h2>
        {severity && <SeverityBadge severity={severity} />}
      </div>

      <div className="stream-panel__body" ref={scrollRef}>
        {!hasStarted && (
          <div className="stream-panel__empty">
            <p>
              Awaiting simulation. Click <strong>Simulate Attack</strong> to have the
              agent reason over the top attack path like a red-team operator —
              naming CVEs, pivots, and the final blast radius.
            </p>
          </div>
        )}

        {hasStarted && isError && (
          <div className="stream-panel__error">
            <span className="stream-panel__error-icon">⚠</span>
            <div>
              <strong>Simulation failed</strong>
              <p>{errorMessage || "No valid attack path was found between the selected entry point and target."}</p>
              <p className="stream-panel__error-hint">
                Try a different entry point / end goal pair, or hit Retry Simulation.
              </p>
            </div>
          </div>
        )}

        {hasStarted && !isError && (
          <pre className="stream-panel__text">
            {narrative}
            {isStreaming && <span className="stream-cursor">▌</span>}
          </pre>
        )}
      </div>

      <div className="stream-panel__footer">
        <div className="stream-panel__status-info">
          <span className={`status-dot status-dot--${status}`} />
          <span className="stream-panel__status-text">
            {status === STATUS.IDLE && "Idle"}
            {status === STATUS.SIMULATING && "Streaming attack…"}
            {status === STATUS.NARRATIVE_DONE && "Narrative complete"}
            {status === STATUS.FIXING && "Generating fixes…"}
            {status === STATUS.COMPLETE && "Complete"}
            {status === STATUS.ERROR && "No path"}
          </span>
          {dataSource && (
            <span className={`source-pill source-pill--${dataSource === "live" ? "live" : "mock"}`}>
              {dataSource === "live" ? "LIVE" : "LOCAL"}
            </span>
          )}
        </div>

        {(onOpenRisk || onOpenFix) && (
          <div className="stream-panel__dock-actions" role="tablist">
            <button
              type="button"
              role="tab"
              className={`detail-dock__btn ${lowerTab === "risk" && detailsOpen ? "is-active" : ""}`}
              aria-selected={lowerTab === "risk" && detailsOpen}
              onClick={onOpenRisk}
            >
              03 // Risk Cards
            </button>
            <button
              type="button"
              role="tab"
              className={`detail-dock__btn ${lowerTab === "fix" && detailsOpen ? "is-active" : ""}`}
              aria-selected={lowerTab === "fix" && detailsOpen}
              disabled={!fixAvailable}
              onClick={onOpenFix}
              title={!fixAvailable ? "Available once a simulation has run" : undefined}
            >
              04 // Auto-Fix Instructions
              {status === STATUS.FIXING && <span className="detail-dock__dot" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

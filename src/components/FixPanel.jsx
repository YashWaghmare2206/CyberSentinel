import "./FixPanel.css";

export default function FixPanel({ fixText, status, STATUS }) {
  const visible = status !== STATUS.IDLE && status !== STATUS.SIMULATING;
  const isFixing = status === STATUS.FIXING;

  if (!visible) return null;

  return (
    <div className="fix-panel">
      <div className="panel-header">
        <span className="panel-eyebrow">04 // Automated Incident Response</span>
        <h2>Auto-Fix Instructions</h2>
        {isFixing && <span className="fix-panel__spinner" aria-label="Generating" />}
      </div>
      <pre className="fix-panel__text">
        {fixText || "Generating remediation steps for every CVE in the kill chain…"}
        {isFixing && <span className="stream-cursor">▌</span>}
      </pre>
    </div>
  );
}

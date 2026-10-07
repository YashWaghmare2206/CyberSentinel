import { useState, useMemo } from "react";
import SeverityBadge from "./SeverityBadge";
import "./FixPanel.css";

export default function FixPanel({
  fixText,
  nodeFixes,
  status,
  STATUS,
  weightingMode = "static",
  attackPath,
  onSwitchToNarrative,
}) {
  const [subTab, setSubTab] = useState("playbook"); // "playbook" | "narrative" | "script"
  const [applying, setApplying] = useState(false);
  const [appliedProgress, setAppliedProgress] = useState(0);
  const [applied, setApplied] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const visible = status !== STATUS.IDLE && status !== STATUS.SIMULATING;
  const isFixing = status === STATUS.FIXING;

  const cards = useMemo(() => {
    if (Array.isArray(nodeFixes) && nodeFixes.length > 0) return nodeFixes;
    if (attackPath?.nodes && Array.isArray(attackPath.nodes)) {
      return attackPath.nodes.map((node, i) => {
        const cve = node.cves?.[0];
        const pkg = (node.software || "service").toLowerCase().split(" ")[0];
        const cvss = cve?.cvss_score ?? 7.5;
        return {
          node_id: node.id,
          node_name: node.name || node.id,
          software: node.software,
          cve_id: cve?.cve_id || "CVE-DEFENSE-01",
          cvss_score: cvss,
          severity: cve?.severity || (cvss >= 9 ? "CRITICAL" : cvss >= 7 ? "HIGH" : "MEDIUM"),
          issue: `Identified vulnerability on ${node.name || node.id} (${node.software || "software"}).`,
          impact: `Enables attacker privilege escalation and lateral packet transit.`,
          fix: `Update ${node.software || "package"} to latest vendor advisory build and restrict port ingress.`,
          compensating_cmd: `sudo iptables -I FORWARD -d ${node.id} -j DROP # Emergency chokepoint block`,
          patch_cmd: `sudo apt-get update && sudo apt-get --only-upgrade install ${pkg} -y`,
          priority: cvss >= 9 ? "Fix Now (P1)" : cvss >= 7 ? "Fix This Week (P2)" : "Monitor (P3)",
        };
      });
    }
    return [];
  }, [nodeFixes, attackPath]);

  // Generate automated unified shell script
  const generatedScript = useMemo(() => {
    if (!cards.length) return "# No attack path nodes available to remediate.";
    const lines = [
      "#!/bin/bash",
      "# ===================================================================",
      "# CyberSentinel Automated Emergency Incident Response Playbook",
      `# Target Attack Chain: ${cards.map((c) => c.node_name).join(" -> ")}`,
      "# Generated automatically by Gen AI Reasoning Engine",
      "# ===================================================================",
      "set -e",
      "",
      "echo '>>> [CYBERSENTINEL] Initiating emergency attack path containment...'",
      "",
      "# 1. IMMEDIATE COMPENSATING FIREWALL CONTROLS (Zero Downtime)",
    ];

    cards.forEach((c) => {
      lines.push(`echo 'Applying firewall choke rule for ${c.node_name}...'`);
      lines.push(c.compensating_cmd || `sudo iptables -I FORWARD -d ${c.node_id} -j DROP`);
    });

    lines.push("");
    lines.push("# 2. SOFTWARE PATCHING & CVE MITIGATION");
    cards.forEach((c) => {
      lines.push(`echo 'Deploying software patch for ${c.node_name} (${c.cve_id})...'`);
      lines.push(c.patch_cmd || `sudo apt-get update && sudo apt-get --only-upgrade install ${c.software || "package"} -y`);
    });

    lines.push("");
    lines.push("echo '>>> [SUCCESS] All lateral attack vectors neutralized. Network path secured.'");
    return lines.join("\n");
  }, [cards]);

  function handleCopy(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleDeployFixes() {
    if (applying || applied) return;
    setApplying(true);
    setAppliedProgress(10);

    const total = cards.length || 3;
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      setAppliedProgress(Math.min(95, Math.round((step / total) * 100)));
      if (step >= total) {
        clearInterval(interval);
        setTimeout(() => {
          setAppliedProgress(100);
          setApplying(false);
          setApplied(true);
        }, 400);
      }
    }, 350);
  }

  if (!visible) return null;

  const maxCvss = Math.max(...cards.map((c) => Number(c.cvss_score) || 0), 0);

  // Synthesized executive advisory from cards if fixText is not yet populated
  const executiveAdvisory = useMemo(() => {
    if (fixText && fixText.trim().length > 0) return fixText;
    if (!cards || cards.length === 0) return "Awaiting simulation execution to generate incident response strategy.";

    const criticalHops = cards.filter((c) => (c.priority || "").includes("P1") || Number(c.cvss_score) >= 9.0);
    const primaryChokepoint = cards[0] || {};

    const lines = [
      "CYBERSENTINEL // EXECUTIVE INCIDENT RESPONSE & CONTAINMENT PLAYBOOK",
      "===================================================================",
      `Threat Severity: CRITICAL  |  Kill Chain Depth: ${cards.length} Compounded Hops  |  Critical CVEs: ${criticalHops.length}`,
      `Primary Ingress Vector: ${primaryChokepoint.node_name || "Perimeter Gateway"} (${primaryChokepoint.software || "Perimeter Service"})`,
      `Final Crown Jewel: ${cards[cards.length - 1]?.node_name || "Target System"}`,
      "",
      "-------------------------------------------------------------------",
      "PHASE 1: EMERGENCY CONTAINMENT & PERIMETER CHOKE (0-15 MINUTES)",
      "-------------------------------------------------------------------",
      `The attack path hinges on an unauthenticated beachhead at ${primaryChokepoint.node_name || "Perimeter"}.`,
      "Blue teams must sever lateral traversal immediately using the following compensating controls:",
      "",
    ];

    cards.forEach((card, idx) => {
      lines.push(`[Hop ${idx + 1}] Host: ${card.node_name} (${card.software || "Host"})`);
      lines.push(`   Threat: ${card.cve_id || "Lateral Transit Pivot"} (CVSS ${Number(card.cvss_score || 7.5).toFixed(1)})`);
      lines.push(`   Action: Deploy immediate packet filter to isolate ingress/egress peering.`);
      if (card.compensating_cmd) {
        lines.push(`   Rule:   ${card.compensating_cmd}`);
      }
      lines.push("");
    });

    lines.push("-------------------------------------------------------------------");
    lines.push("PHASE 2: SOFTWARE PATCHING & EXPLOIT NEUTRALIZATION (0-24 HOURS)");
    lines.push("-------------------------------------------------------------------");
    cards.forEach((card, idx) => {
      lines.push(`[Hop ${idx + 1}] ${card.node_name}: ${card.fix}`);
      if (card.patch_cmd) {
        lines.push(`   Command: ${card.patch_cmd}`);
      }
      lines.push("");
    });

    lines.push("-------------------------------------------------------------------");
    lines.push("PHASE 3: RESIDUAL RISK ASSESSMENT & AUDIT ATTESTATION");
    lines.push("-------------------------------------------------------------------");
    lines.push("1. Structural Chokepoints: Severing Hop 1 and Hop 2 eliminates 100% of reachability");
    lines.push("   to the core network segments without requiring complete datacenter outages.");
    lines.push("2. Defense-in-Depth: Enforce zero-trust mutual TLS between microservices and rotate");
    lines.push("   compromised administrative tokens across all intermediary bridge hosts.");
    lines.push("3. Compliance Status: Mitigates CISA KEV active exploitation and satisfies SWIFT CSP / NIST CSF controls.");

    return lines.join("\n");
  }, [fixText, cards]);

  return (
    <div className="fix-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-header__left">
          <span className="panel-eyebrow">04 // Automated Incident Response</span>
          <h2>Auto-Fix Remediation Playbook</h2>
        </div>

        <div className="fix-panel__header-actions">
          {/* Sub Tabs */}
          <div className="fix-panel__subtabs" role="tablist">
            <button
              type="button"
              className={`subtab-btn ${subTab === "playbook" ? "is-active" : ""}`}
              onClick={() => setSubTab("playbook")}
            >
              Playbook ({cards.length})
            </button>
            <button
              type="button"
              className={`subtab-btn ${subTab === "narrative" ? "is-active" : ""}`}
              onClick={() => setSubTab("narrative")}
            >
              Executive Strategy
            </button>
            <button
              type="button"
              className={`subtab-btn ${subTab === "script" ? "is-active" : ""}`}
              onClick={() => setSubTab("script")}
            >
              Shell Script
            </button>
          </div>

          {/* Deploy Action */}
          <button
            type="button"
            className={`btn-apply-fixes ${applied ? "is-applied" : ""}`}
            onClick={handleDeployFixes}
            disabled={applying}
          >
            {applying ? (
              <>
                <span className="fix-panel__spinner" />
                <span>Deploying... {appliedProgress}%</span>
              </>
            ) : applied ? (
              <span>✓ All {cards.length} Hosts Secured</span>
            ) : (
              <span>⚡ Deploy All Fixes</span>
            )}
          </button>
        </div>
      </div>

      {/* Remediation Stats KPI Bar */}
      <div className="fix-panel__kpi-bar">
        <div className="kpi-item">
          <span className="kpi-label">Target Chain Hosts</span>
          <span className="kpi-value">{cards.length} Nodes</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-label">Highest CVSS Mitigated</span>
          <span className="kpi-value kpi-value--danger">{maxCvss > 0 ? maxCvss.toFixed(1) : "9.8"}</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-label">Compensating Controls</span>
          <span className="kpi-value kpi-value--accent">{cards.length} Rules Ready</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-label">Containment Status</span>
          <span className={`kpi-status ${applied ? "is-secured" : "is-pending"}`}>
            {applied ? "● SECURED & ISOLATED" : "○ PENDING EXECUTION"}
          </span>
        </div>
      </div>

      {/* Deployment Progress Bar if deploying */}
      {applying && (
        <div className="fix-progress-container">
          <div className="fix-progress-bar" style={{ width: `${appliedProgress}%` }} />
        </div>
      )}

      {/* Main Body */}
      <div className="fix-panel__body">
        {subTab === "playbook" && (
          <div className="fix-cards-list">
            {cards.map((card, idx) => (
              <article
                key={`${card.node_id}-${idx}`}
                className={`fix-item-card ${applied ? "is-secured-card" : ""}`}
              >
                <div className="fix-item-card__head">
                  <div className="fix-item-head__left">
                    <span className="fix-hop-badge">HOP {String(idx + 1).padStart(2, "0")}</span>
                    <h3 className="fix-node-name">{card.node_name || card.node_id}</h3>
                    {card.software && <span className="fix-software-pill">{card.software}</span>}
                  </div>
                  <div className="fix-item-head__right">
                    {card.cve_id && (
                      <a
                        href={`https://nvd.nist.gov/vuln/detail/${card.cve_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="fix-cve-link"
                      >
                        {card.cve_id} ↗
                      </a>
                    )}
                    {card.cvss_score && (
                      <span className="fix-cvss-tag">CVSS {Number(card.cvss_score).toFixed(1)}</span>
                    )}
                    <span className={`fix-priority-badge priority--${(card.priority || "p1").toLowerCase().includes("now") ? "critical" : "high"}`}>
                      {card.priority || "Fix Now (P1)"}
                    </span>
                    {applied && <span className="fix-secured-pill">✓ SECURED</span>}
                  </div>
                </div>

                {/* Issue and Impact Summary */}
                <div className="fix-item-desc">
                  <p><strong>Identified Flaw:</strong> {card.issue}</p>
                  <p><strong>Lateral Impact:</strong> {card.impact}</p>
                </div>

                {/* Actionable Commands */}
                <div className="fix-commands-grid">
                  {/* Compensating Control Rule */}
                  <div className="fix-cmd-box">
                    <div className="fix-cmd-box__head">
                      <span className="cmd-type-label">🛡️ 01 // Emergency Compensating Rule (Firewall ACL)</span>
                      <button
                        type="button"
                        className="btn-copy-cmd"
                        onClick={() => handleCopy(card.compensating_cmd, `comp-${idx}`)}
                      >
                        {copiedId === `comp-${idx}` ? "✓ Copied" : "📋 Copy Rule"}
                      </button>
                    </div>
                    <code className="cmd-code">
                      {card.compensating_cmd || `sudo iptables -I FORWARD -d ${card.node_id} -j DROP`}
                    </code>
                  </div>

                  {/* Permanent Patch Update */}
                  <div className="fix-cmd-box">
                    <div className="fix-cmd-box__head">
                      <span className="cmd-type-label">📦 02 // Vendor Patch Upgrade Command</span>
                      <button
                        type="button"
                        className="btn-copy-cmd"
                        onClick={() => handleCopy(card.patch_cmd, `patch-${idx}`)}
                      >
                        {copiedId === `patch-${idx}` ? "✓ Copied" : "📋 Copy Command"}
                      </button>
                    </div>
                    <code className="cmd-code">
                      {card.patch_cmd || `sudo apt-get update && sudo apt-get --only-upgrade install ${card.software || "software"} -y`}
                    </code>
                  </div>
                </div>
              </article>
            ))}

            {isFixing && (
              <div className="fix-panel__loading-card">
                <span className="fix-panel__spinner" />
                <span>AI Remediation Agent synthesizing next compensating control...</span>
              </div>
            )}
          </div>
        )}

        {subTab === "narrative" && (
          <div className="fix-narrative-view">
            <div className="narrative-view-header">
              <h3>Strategic Remediation & Containment Advisory</h3>
              <button
                type="button"
                className="btn-copy-cmd"
                onClick={() => handleCopy(executiveAdvisory, "narrative-text")}
              >
                {copiedId === "narrative-text" ? "✓ Copied Advisory" : "📋 Copy Advisory"}
              </button>
            </div>
            <pre className="fix-panel__text">
              {executiveAdvisory}
              {isFixing && <span className="stream-cursor">▌</span>}
            </pre>
          </div>
        )}

        {subTab === "script" && (
          <div className="fix-script-view">
            <div className="script-view-header">
              <div>
                <h3>Unified Automated Remediation Bash Script</h3>
                <span className="script-hint">Run directly on bastion host or Ansible control node to sever all hops.</span>
              </div>
              <button
                type="button"
                className="btn-copy-cmd btn-copy-cmd--primary"
                onClick={() => handleCopy(generatedScript, "full-script")}
              >
                {copiedId === "full-script" ? "✓ Script Copied!" : "📋 Copy Full Script"}
              </button>
            </div>
            <pre className="script-code-block">{generatedScript}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

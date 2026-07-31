import { Handle, Position } from "reactflow";
import { RISK_COLORS } from "../data/layout";

const TYPE_LABEL = {
  public: "PUBLIC",
  internal: "INTERNAL",
  data: "DATA",
  critical: "CRITICAL ASSET",
  control: "CONTROL",
};

export default function RiskNode({ data }) {
  const { node, onPath, compromised, active, dimmed, tier } = data;
  const color = compromised ? RISK_COLORS.critical : RISK_COLORS[tier];
  const topCve = node.cves?.length
    ? [...node.cves].sort((a, b) => (b.cvss_score ?? 0) - (a.cvss_score ?? 0))[0]
    : null;

  return (
    <div
      className={[
        "risk-node",
        `risk-node--${tier}`,
        onPath ? "risk-node--on-path" : "",
        compromised ? "risk-node--compromised" : "",
        dimmed ? "risk-node--dimmed" : "",
      ].join(" ")}
      style={{ "--node-color": color }}
      title={node.software}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />

      <div className="risk-node__top">
        <span className="risk-node__type">{TYPE_LABEL[node.type] ?? node.type}</span>
        {node.risk > 0 && <span className="risk-node__score">{node.risk.toFixed(1)}</span>}
      </div>
      <div className="risk-node__name">{node.name}</div>
      <div className="risk-node__meta">{node.software}</div>
      {topCve && (
        <div className="risk-node__cve">
          {topCve.cve_id}
          {node.cves.length > 1 && <span className="risk-node__cve-extra"> +{node.cves.length - 1}</span>}
        </div>
      )}
      {active && <div className="risk-node__pulse" />}
    </div>
  );
}


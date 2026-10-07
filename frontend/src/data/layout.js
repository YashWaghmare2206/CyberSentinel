// Manual tiered layout (public internet -> ... -> SWIFT terminal).
// A production version would run a real layout algorithm (dagre / elk);
// for 15 fixed nodes a hand-placed tier map reads far more like a real
// network diagram than an auto-layout would.
export const NODE_POSITIONS = {
  api_gateway_01: { x: 0, y: 260 },
  load_balancer_01: { x: 220, y: 260 },
  web_server_01: { x: 440, y: 100 },
  web_server_02: { x: 440, y: 420 },
  internal_api_01: { x: 660, y: 100 },
  internal_api_02: { x: 660, y: 420 },
  message_queue_01: { x: 880, y: 560 },
  app_db_01: { x: 880, y: 100 },
  app_db_02: { x: 880, y: 300 },
  core_banking_01: { x: 1100, y: 200 },
  customer_dw_01: { x: 1320, y: 20 },
  admin_console_01: { x: 1320, y: 260 },
  monitoring_01: { x: 1100, y: 440 },
  firewall_01: { x: 1540, y: 260 },
  swift_terminal: { x: 1760, y: 260 },
};

// Severity thresholds + colors specified directly in the blueprint (5.2 / Task 3.2).
export const RISK_COLORS = {
  critical: "#E74C3C", // CVSS 8+
  medium: "#F39C12", // CVSS 5-7
  safe: "#2ECC71", // CVSS < 5 or no CVE
};

export function riskTier(score) {
  if (!score) return "safe";
  if (score >= 8) return "critical";
  if (score >= 5) return "medium";
  return "safe";
}

export function riskColor(score) {
  return RISK_COLORS[riskTier(score)];
}

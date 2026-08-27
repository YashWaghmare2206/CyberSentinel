import { useEffect, useMemo, useRef } from "react";
import ForceGraph3D from "3d-force-graph";
import SpriteText from "three-spritetext";
import { buildGraph } from "../data/graphEngine";
import "./NetworkGraph.css";

const graph = buildGraph();

// Continuous risk gradient (green → yellow → orange → red) instead of a
// flat per-type color — with real CVSS scores ranging from 0 to 10 across
// 47 nodes, this alone produces a genuinely varied, information-dense
// palette instead of one or two colors dominating the scene.
const RISK_STOPS = [
  { t: 0, c: [46, 204, 113] },   // safe / no known CVE
  { t: 5, c: [241, 196, 15] },   // medium
  { t: 7.5, c: [243, 156, 18] }, // high
  { t: 10, c: [231, 76, 60] },   // critical
];
function riskGradient(score) {
  const s = Math.max(0, Math.min(10, score || 0));
  for (let i = 0; i < RISK_STOPS.length - 1; i++) {
    const a = RISK_STOPS[i];
    const b = RISK_STOPS[i + 1];
    if (s >= a.t && s <= b.t) {
      const ratio = (s - a.t) / (b.t - a.t || 1);
      const rgb = a.c.map((v, idx) => Math.round(v + (b.c[idx] - v) * ratio));
      return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    }
  }
  return `rgb(${RISK_STOPS[RISK_STOPS.length - 1].c.join(",")})`;
}

// Groups the network's real protocol list into a small set of families so
// links read as meaningfully color-coded rather than one flat gray line —
// web traffic, database traffic, auth/directory, remote admin, and
// messaging each get their own hue.
const PROTOCOL_FAMILY = {
  HTTP: "#3EC6FF", HTTPS: "#3EC6FF", REST: "#3EC6FF", TLS: "#3EC6FF",
  JDBC: "#B57BFF", SQL: "#B57BFF", PostgreSQL: "#B57BFF", MySQL: "#B57BFF", Redis: "#B57BFF",
  LDAP: "#F1C40F", Kerberos: "#F1C40F",
  SSH: "#FF6FA5", RDP: "#FF6FA5", SMB: "#FF6FA5",
  AMQP: "#2ECC9A",
};
function protocolColor(protocol) {
  return PROTOCOL_FAMILY[protocol] ?? "#7C87B8"; // TCP / Proprietary / unknown
}

function nodeRadius(n) {
  return 4 + Math.min(n.risk || 0, 10) * 0.9;
}

function countCompromisedSteps(narrative, pathLength) {
  if (!narrative) return 0;
  const matches = narrative.match(/Step\s+(\d+)/gi) || [];
  const maxStep = matches.reduce((max, m) => {
    const n = parseInt(m.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  return Math.min(maxStep, pathLength);
}

// Builds the static { nodes, links } graph data once — node/link identity
// stays stable across re-renders so 3d-force-graph doesn't re-run the
// force simulation from scratch on every narrative token.
function buildGraphData() {
  const nodes = [...graph.nodes.values()].map((n) => ({
    id: n.id,
    name: n.name,
    software: n.software,
    type: n.type,
    risk: n.risk,
    cves: n.cves,
  }));
  const links = graph.edges.map((e) => ({
    source: e.from,
    target: e.to,
    protocol: e.protocol,
  }));
  return { nodes, links };
}

export default function NetworkGraph({ attackPath, narrative, status, STATUS }) {
  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const hasFitRef = useRef(false);
  const graphData = useMemo(buildGraphData, []);

  const pathSet = useMemo(() => new Set(attackPath?.path ?? []), [attackPath]);
  const compromisedCount = useMemo(
    () => countCompromisedSteps(narrative, attackPath?.path?.length ?? 0),
    [narrative, attackPath]
  );
  const settledSet = useMemo(() => {
    if (!attackPath) return new Set();
    return new Set(attackPath.path.slice(0, Math.max(compromisedCount - 1, 0)));
  }, [attackPath, compromisedCount]);
  const activeNodeId =
    attackPath?.path?.[Math.max(compromisedCount - 1, 0)] ?? attackPath?.path?.[0];

  const isSimulating =
    status === STATUS.SIMULATING ||
    status === STATUS.NARRATIVE_DONE ||
    status === STATUS.FIXING ||
    status === STATUS.COMPLETE;

  // ── One-time scene setup ────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const fg = ForceGraph3D()(el)
      .backgroundColor("rgba(0,0,0,0)")
      .graphData(graphData)
      .nodeLabel((n) => {
        const cve = n.cves?.length
          ? [...n.cves].sort((a, b) => (b.cvss_score ?? 0) - (a.cvss_score ?? 0))[0]
          : null;
        return `<div style="font-family:monospace;font-size:12px;padding:4px 2px">
          <b>${n.name}</b><br/>${n.software}${
          cve ? `<br/><span style="color:#F39C12">${cve.cve_id} · CVSS ${cve.cvss_score}</span>` : ""
        }</div>`;
      })
      .nodeThreeObjectExtend(true)
      .nodeThreeObject((n) => {
        // Persistent floating labels only for the nodes that matter most at
        // a glance (public-facing entry points, critical assets, control
        // nodes) — the 23 similar "internal" hops rely on the hover
        // tooltip instead, or this becomes a wall of overlapping text.
        if (n.type === "internal") return null;
        const sprite = new SpriteText(n.name);
        sprite.textHeight = 2.6;
        sprite.color = "#F5F7FF";
        sprite.backgroundColor = "rgba(6,9,28,0.82)";
        sprite.padding = 1.6;
        sprite.borderRadius = 2;
        // Offset scaled by this node's own radius so the label clears the
        // sphere instead of sitting inside/behind it for high-risk nodes.
        sprite.position.set(0, nodeRadius(n) + 4, 0);
        return sprite;
      })
      .nodeVal(nodeRadius)
      .nodeResolution(16)
      .nodeOpacity(0.95)
      .linkDirectionalArrowLength(3.2)
      .linkDirectionalArrowRelPos(1)
      .linkCurvature(0.12)
      .linkWidth(0.7)
      .showNavInfo(false)
      .warmupTicks(80)
      .cooldownTicks(50);

    // Real spread instead of a clumped ball, but bounded so the graph
    // settles into one stable, compact shape rather than continuing to
    // drift wider the longer the simulation runs (which made zoomToFit
    // look fine early on and increasingly zoomed-out later).
    fg.d3Force("charge").strength(-90).distanceMax(260);
    fg.d3Force("link").distance(26);

    fg.controls().autoRotate = true;
    fg.controls().autoRotateSpeed = 0.35;
    fg.cameraPosition({ x: 0, y: 50, z: 220 });

    fg.onEngineStop(() => {
      if (!hasFitRef.current) {
        fg.zoomToFit(400, 50);
        hasFitRef.current = true;
        // The layout keeps micro-adjusting for a moment after "stop" fires;
        // one follow-up fit shortly after locks in a settled, accurate frame.
        setTimeout(() => fg.zoomToFit(400, 50), 600);
      }
    });

    // Pause auto-rotate the moment a person grabs the scene.
    fg.controls().addEventListener("start", () => {
      fg.controls().autoRotate = false;
    });

    fgRef.current = fg;

    const handleResize = () => {
      fg.width(el.clientWidth);
      fg.height(el.clientHeight);
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      fg._destructor?.();
      el.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-color / re-highlight on every simulation tick ────────────────
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    fg.nodeColor((n) => {
      if (!isSimulating) return riskGradient(n.risk);
      if (!pathSet.has(n.id)) return "#232C52"; // dimmed / off-path
      if (settledSet.has(n.id) || n.id === activeNodeId) return "#E74C3C"; // compromised
      return "#F39C12"; // still ahead on the path, not yet reached
    });

    fg.linkColor((l) => {
      const fromId = typeof l.source === "object" ? l.source.id : l.source;
      const toId = typeof l.target === "object" ? l.target.id : l.target;
      if (!isSimulating) return protocolColor(l.protocol);
      const fromIdx = attackPath?.path?.indexOf(fromId) ?? -1;
      const toIdx = attackPath?.path?.indexOf(toId) ?? -1;
      const onPath = fromIdx !== -1 && toIdx === fromIdx + 1;
      if (!onPath) return "rgba(35,44,82,0.35)";
      const traversed = toIdx <= compromisedCount - 1;
      return traversed ? "#E74C3C" : "#F39C12";
    });

    fg.linkWidth((l) => {
      const fromId = typeof l.source === "object" ? l.source.id : l.source;
      const toId = typeof l.target === "object" ? l.target.id : l.target;
      const fromIdx = attackPath?.path?.indexOf(fromId) ?? -1;
      const toIdx = attackPath?.path?.indexOf(toId) ?? -1;
      const onPath = isSimulating && fromIdx !== -1 && toIdx === fromIdx + 1;
      return onPath ? 2.4 : 0.7;
    });

    fg.linkOpacity(isSimulating ? 0.55 : 0.75);

    fg.controls().autoRotate = !isSimulating;

    // Fly the camera to whichever node is currently under attack. Uses a
    // fixed-distance offset along the node's direction from the origin
    // rather than scaling the node's own coordinates — the naive
    // "position * ratio" approach breaks down (camera flies to infinity)
    // whenever a node sits near the origin, which happens routinely after
    // zoomToFit recenters the whole scene.
    if (isSimulating && activeNodeId) {
      const node = fg.graphData().nodes.find((n) => n.id === activeNodeId);
      if (node && node.x !== undefined) {
        const OFFSET = 45;
        const dist = Math.hypot(node.x, node.y, node.z || 0);
        const [dx, dy, dz] = dist < 1 ? [0, 0.15, 1] : [node.x / dist, node.y / dist, (node.z || 0) / dist];
        fg.cameraPosition(
          { x: node.x + dx * OFFSET, y: node.y + dy * OFFSET + 25, z: (node.z || 0) + dz * OFFSET },
          { x: node.x, y: node.y, z: node.z || 0 },
          900
        );
      }
    }
  }, [isSimulating, pathSet, settledSet, activeNodeId, attackPath, compromisedCount]);

  // ── Return to the full overview once a run finishes/resets ─────────
  // Deliberately separate from the tick-by-tick effect above so it only
  // reacts to attackPath actually clearing (Reset), not to every
  // narrative token — otherwise it would fight the fly-to camera above.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !hasFitRef.current) return;
    if (!attackPath) fg.zoomToFit(400, 50);
  }, [attackPath]);

  return (
    <div className="network-graph-panel">
      <div className="panel-header">
        <span className="panel-eyebrow">01 // Network Topology · {graph.nodes.size} nodes · 3D</span>
        <h2>Bank Infrastructure Map</h2>
      </div>
      <div className="network-graph-canvas" ref={containerRef} />
      <div className="graph-legend">
        <span className="legend-item"><i style={{ background: "#2ECC71" }} /> Low risk</span>
        <span className="legend-item"><i style={{ background: "#F1C40F" }} /> Medium risk</span>
        <span className="legend-item"><i style={{ background: "#F39C12" }} /> High risk</span>
        <span className="legend-item"><i style={{ background: "#E74C3C" }} /> Critical / compromised</span>
        <span className="legend-item legend-sep" />
        <span className="legend-item"><i style={{ background: "#3EC6FF" }} /> Web</span>
        <span className="legend-item"><i style={{ background: "#B57BFF" }} /> Database</span>
        <span className="legend-item"><i style={{ background: "#F1C40F" }} /> Auth / directory</span>
        <span className="legend-item"><i style={{ background: "#FF6FA5" }} /> Remote admin</span>
      </div>
    </div>
  );
}


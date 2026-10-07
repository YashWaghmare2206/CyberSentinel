import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "3d-force-graph";
import SpriteText from "three-spritetext";
import { buildGraph, getMitreAttackMapping } from "../data/graphEngine";
import PlaybackControls from "./PlaybackControls";
import "./NetworkGraph.css";

const NETWORK_TITLES = {
  "enterprise-bank": "Bank Infrastructure Map",
  "cloud-fintech-core": "Cloud FinTech & Payment Architecture",
  "defense-aerospace-corp": "Defense & Aerospace SCADA Mesh",
  "healthcare-hospital-system": "Hospital Clinical Systems Network",
  "small-branch-bank": "Small Branch Bank Topology",
  "legacy-iot-bank": "Legacy IoT & Mainframe Infrastructure",
};

// Continuous risk gradient (green → yellow → orange → red) instead of a
// flat per-type color — with real CVSS scores ranging from 0 to 10 across
// nodes, this produces a varied, information-dense palette.
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
// links read as meaningfully color-coded rather than one flat gray line
const PROTOCOL_FAMILY = {
  HTTP: "#3EC6FF", HTTPS: "#3EC6FF", REST: "#3EC6FF", TLS: "#3EC6FF",
  JDBC: "#B57BFF", SQL: "#B57BFF", PostgreSQL: "#B57BFF", MySQL: "#B57BFF", Redis: "#B57BFF",
  LDAP: "#F1C40F", Kerberos: "#F1C40F",
  SSH: "#FF6FA5", RDP: "#FF6FA5", SMB: "#FF6FA5",
  AMQP: "#2ECC9A",
};
function protocolColor(protocol) {
  return PROTOCOL_FAMILY[protocol] ?? "#7C87B8";
}

function nodeRadius(n) {
  return 4 + Math.min(n.risk || 0, 10) * 0.9;
}

function countCompromisedSteps(narrative, pathLength) {
  if (!narrative) return 0;
  const stepMatches = narrative.match(/Step\s+(\d+)/gi) || [];
  const numMatches = narrative.match(/(?:^|\n)\s*(\d+)\.\s+/g) || [];

  let maxStep = 0;
  for (const m of stepMatches) {
    const n = parseInt(m.replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n > maxStep) maxStep = n;
  }
  for (const m of numMatches) {
    const n = parseInt(m.replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n > maxStep) maxStep = n;
  }
  return Math.min(maxStep, pathLength);
}

// Builds the static { nodes, links } graph data
function buildGraphData(graph) {
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

export default function NetworkGraph({
  attackPath,
  allAttackPaths = [],
  narrative,
  status,
  STATUS,
  networkId = "enterprise-bank",
  weightingMode = "static",
  isolatedNodes = new Set(),
  toggleIsolateNode,
  containmentMessage,
  activeHopIndex,
}) {
  const graph = useMemo(() => buildGraph(networkId, weightingMode), [networkId, weightingMode]);

  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const hasFitRef = useRef(false);
  const graphData = useMemo(() => buildGraphData(graph), [graph]);

  // Deliberate, calm hop progression with interactive playback HUD & speed options
  const [liveHopIndex, setLiveHopIndex] = useState(0);
  const [isHopsAnimating, setIsHopsAnimating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const animTimerRef = useRef(null);

  useEffect(() => {
    if (status === STATUS.IDLE || status === STATUS.ERROR || !attackPath?.path?.length) {
      if (animTimerRef.current) {
        clearInterval(animTimerRef.current);
        animTimerRef.current = null;
      }
      setLiveHopIndex(0);
      setIsHopsAnimating(false);
      return;
    }

    // Start deliberate hop progression when simulation starts
    if (status === STATUS.SIMULATING && !isHopsAnimating && liveHopIndex === 0) {
      setLiveHopIndex(1);
      setIsHopsAnimating(true);
      setIsPlaying(true);
      const totalHops = attackPath.path.length;

      if (animTimerRef.current) clearInterval(animTimerRef.current);

      const delay = Math.round(2600 / playbackSpeed);
      animTimerRef.current = setInterval(() => {
        setLiveHopIndex((prev) => {
          if (!isPlaying) return prev;
          if (prev < totalHops) {
            return prev + 1;
          }
          if (animTimerRef.current) {
            clearInterval(animTimerRef.current);
            animTimerRef.current = null;
          }
          setIsHopsAnimating(false);
          return totalHops;
        });
      }, delay);
    }
  }, [status, attackPath, STATUS, isHopsAnimating, liveHopIndex, playbackSpeed, isPlaying]);

  // Dynamic speed adjustment & play/pause listener during animation
  useEffect(() => {
    if (!isHopsAnimating || !attackPath?.path?.length) return;
    if (animTimerRef.current) clearInterval(animTimerRef.current);

    if (!isPlaying) return;

    const totalHops = attackPath.path.length;
    const delay = Math.round(2600 / playbackSpeed);

    animTimerRef.current = setInterval(() => {
      setLiveHopIndex((prev) => {
        if (prev < totalHops) return prev + 1;
        if (animTimerRef.current) {
          clearInterval(animTimerRef.current);
          animTimerRef.current = null;
        }
        setIsHopsAnimating(false);
        return totalHops;
      });
    }, delay);

    return () => {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, isHopsAnimating, attackPath]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
    };
  }, []);

  // When graphData changes (user changed network), update the engine geometry and fit to view
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.graphData(graphData);
      setTimeout(() => {
        fgRef.current?.zoomToFit(600, 60);
      }, 250);
    }
  }, [graphData]);

  const pathSet = useMemo(() => new Set(attackPath?.path ?? []), [attackPath]);

  const compromisedCount = useMemo(() => {
    if (!attackPath?.path?.length) return 0;
    const pathLen = attackPath.path.length;
    if (activeHopIndex != null && activeHopIndex >= 0) {
      return Math.min(activeHopIndex + 1, pathLen);
    }
    // While hop animation is progressing, follow the live hop index exactly
    if (isHopsAnimating) {
      return Math.min(Math.max(liveHopIndex, 1), pathLen);
    }
    // When simulation is done and hop animation has completed, all hops are compromised
    if (status === STATUS.COMPLETE || status === STATUS.NARRATIVE_DONE || status === STATUS.FIXING) {
      return pathLen;
    }
    return Math.max(liveHopIndex, 1);
  }, [attackPath, status, STATUS, liveHopIndex, isHopsAnimating, activeHopIndex]);

  const settledSet = useMemo(() => {
    if (!attackPath?.path?.length) return new Set();
    const isDone = !isHopsAnimating && (status === STATUS.COMPLETE || status === STATUS.NARRATIVE_DONE || status === STATUS.FIXING);
    const count = isDone ? attackPath.path.length : Math.max(compromisedCount - 1, 0);
    return new Set(attackPath.path.slice(0, count));
  }, [attackPath, compromisedCount, status, STATUS, isHopsAnimating]);

  const activeNodeId = useMemo(() => {
    if (!attackPath?.path?.length) return null;
    const idx = Math.min(Math.max(compromisedCount - 1, 0), attackPath.path.length - 1);
    return attackPath.path[idx];
  }, [attackPath, compromisedCount]);

  const isSimulating =
    status === STATUS.SIMULATING ||
    status === STATUS.NARRATIVE_DONE ||
    status === STATUS.FIXING ||
    status === STATUS.COMPLETE;

  // ── One-time scene setup with React 18 StrictMode safety ────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (fgRef.current) {
      try {
        fgRef.current._destructor?.();
      } catch (e) {
        // ignore
      }
      el.innerHTML = "";
      fgRef.current = null;
    }

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
        if (n.type === "internal") return null;
        const sprite = new SpriteText(n.name);
        sprite.textHeight = 2.6;
        sprite.color = "#F5F7FF";
        sprite.backgroundColor = "rgba(6,9,28,0.82)";
        sprite.padding = 1.6;
        sprite.borderRadius = 2;
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

    fg.d3Force("charge").strength(-90).distanceMax(260);
    fg.d3Force("link").distance(26);

    fg.controls().autoRotate = true;
    fg.controls().autoRotateSpeed = 0.35;
    fg.cameraPosition({ x: 0, y: 50, z: 220 });

    fg.onEngineStop(() => {
      if (!hasFitRef.current) {
        fg.zoomToFit(400, 50);
        hasFitRef.current = true;
        setTimeout(() => fg.zoomToFit(400, 50), 600);
      }
    });

    fg.controls().addEventListener("start", () => {
      fg.controls().autoRotate = false;
    });

    fg.onNodeClick((node) => {
      setSelectedNode(node);
    });
    fg.onBackgroundClick(() => {
      setSelectedNode(null);
    });

    fgRef.current = fg;

    const handleResize = () => {
      if (!el || !fg) return;
      const w = el.clientWidth || el.parentElement?.clientWidth || 700;
      const h = el.clientHeight || el.parentElement?.clientHeight || 500;
      if (w > 0 && h > 0) {
        fg.width(w);
        fg.height(h);
      }
    };

    const ro = new ResizeObserver(() => {
      handleResize();
    });
    ro.observe(el);

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
      try {
        fg._destructor?.();
      } catch (e) {
        // ignore
      }
      el.innerHTML = "";
      fgRef.current = null;
      hasFitRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-color / re-highlight on every simulation tick ────────────────
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    fg.nodeColor((n) => {
      if (isolatedNodes && isolatedNodes.has(n.id)) return "#00f0ff"; // Quarantined cyan
      if (!isSimulating) return riskGradient(n.risk);
      if (!pathSet.has(n.id)) return "#232C52"; // dimmed / off-path
      if (settledSet.has(n.id) || n.id === activeNodeId) return "#E74C3C"; // compromised
      return "#F39C12"; // still ahead on the path, not yet reached
    });

    // Pre-compute alternative edges
    const altEdges = new Set();
    if (isSimulating && allAttackPaths && allAttackPaths.length > 1) {
      for (let i = 1; i < allAttackPaths.length; i++) {
        const altPath = allAttackPaths[i].path;
        if (!altPath) continue;
        for (let j = 0; j < altPath.length - 1; j++) {
          altEdges.add(`${altPath[j]}-${altPath[j+1]}`);
        }
      }
    }

    fg.linkColor((l) => {
      const fromId = typeof l.source === "object" ? l.source.id : l.source;
      const toId = typeof l.target === "object" ? l.target.id : l.target;
      if (isolatedNodes && (isolatedNodes.has(fromId) || isolatedNodes.has(toId))) {
        return "rgba(0, 240, 255, 0.18)"; // Severed quarantined edge
      }
      if (!isSimulating) return protocolColor(l.protocol);
      
      const fromIdx = attackPath?.path?.indexOf(fromId) ?? -1;
      const toIdx = attackPath?.path?.indexOf(toId) ?? -1;
      const onPath = fromIdx !== -1 && toIdx === fromIdx + 1;
      
      if (onPath) {
        const traversed = toIdx <= compromisedCount - 1;
        return traversed ? "#E74C3C" : "#F39C12";
      } else if (altEdges.has(`${fromId}-${toId}`)) {
        return "#8E44AD"; // Purple for alternative path
      }
      return "rgba(35,44,82,0.35)";
    });

    fg.linkWidth((l) => {
      const fromId = typeof l.source === "object" ? l.source.id : l.source;
      const toId = typeof l.target === "object" ? l.target.id : l.target;
      
      const fromIdx = attackPath?.path?.indexOf(fromId) ?? -1;
      const toIdx = attackPath?.path?.indexOf(toId) ?? -1;
      const onPath = isSimulating && fromIdx !== -1 && toIdx === fromIdx + 1;
      
      if (onPath) return 2.4;
      if (isSimulating && altEdges.has(`${fromId}-${toId}`)) return 1.5;
      return 0.7;
    });

    fg.linkOpacity(isSimulating ? 0.55 : 0.75);

    // Glowing directional breach particles along traversed attack path
    fg.linkDirectionalParticles((l) => {
      const fromId = typeof l.source === "object" ? l.source.id : l.source;
      const toId = typeof l.target === "object" ? l.target.id : l.target;
      const fromIdx = attackPath?.path?.indexOf(fromId) ?? -1;
      const toIdx = attackPath?.path?.indexOf(toId) ?? -1;
      const onPath = isSimulating && fromIdx !== -1 && toIdx === fromIdx + 1;
      if (onPath && toIdx <= compromisedCount - 1) return 3;
      return 0;
    });
    fg.linkDirectionalParticleSpeed(0.005);
    fg.linkDirectionalParticleWidth(2.2);
    fg.linkDirectionalParticleColor(() => "#FF4C4C");

    // Camera handling during hop progression
    if (isHopsAnimating) {
      fg.controls().autoRotate = false;
      if (activeNodeId) {
        const node = fg.graphData().nodes.find((n) => n.id === activeNodeId);
        if (node && node.x !== undefined) {
          const OFFSET = 45;
          const dist = Math.hypot(node.x, node.y, node.z || 0);
          const [dx, dy, dz] = dist < 1 ? [0, 0.15, 1] : [node.x / dist, node.y / dist, (node.z || 0) / dist];
          fg.cameraPosition(
            { x: node.x + dx * OFFSET, y: node.y + dy * OFFSET + 25, z: (node.z || 0) + dz * OFFSET },
            { x: node.x, y: node.y, z: node.z || 0 },
            1800
          );
        }
      }
    } else {
      fg.controls().autoRotate = true;
    }
  }, [isSimulating, pathSet, settledSet, activeNodeId, attackPath, allAttackPaths, compromisedCount, status, STATUS, isHopsAnimating, isolatedNodes]);

  // ── Return to the full overview once hop animation completes ─────────
  const prevAnimatingRef = useRef(false);
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    
    if (prevAnimatingRef.current && !isHopsAnimating) {
      const timer = setTimeout(() => {
        fg.zoomToFit(900, 60);
        if (fg.controls()) {
          fg.controls().target.set(0, 0, 0);
          fg.controls().autoRotate = true;
        }
      }, 800);
      return () => clearTimeout(timer);
    }
    prevAnimatingRef.current = isHopsAnimating;
  }, [isHopsAnimating]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !hasFitRef.current) return;
    if (!attackPath) {
      fg.zoomToFit(400, 50);
      if (fg.controls()) fg.controls().autoRotate = true;
    }
  }, [attackPath]);

  return (
    <div className="network-graph-panel">
      <div className="panel-header">
        <span className="panel-eyebrow">
          01 // Network Topology · {graphData.nodes.length} nodes · 3D
          {attackPath?.pignn_confidence != null && (
            <span style={{ marginLeft: "12px", color: "#c084fc", fontWeight: 700 }}>
              ⚡ PIGNN Path ({attackPath.pignn_confidence}% Confidence)
            </span>
          )}
        </span>
        <h2>{NETWORK_TITLES[networkId] || "Network Infrastructure Map"}</h2>
      </div>
      <div className="network-graph-canvas" ref={containerRef}>
        {containmentMessage && (
          <div className="containment-banner" role="alert">
            {containmentMessage}
          </div>
        )}

        {selectedNode && (
          <div className="node-inspector-card">
            <div className="inspector-header">
              <span className="inspector-badge">{selectedNode.type}</span>
              <h4>{selectedNode.name}</h4>
              <button className="inspector-close" onClick={() => setSelectedNode(null)}>✕</button>
            </div>
            <div className="inspector-body">
              <div><strong>Software:</strong> {selectedNode.software || "Unknown"}</div>
              <div><strong>Role / ID:</strong> {selectedNode.id}</div>
              <div>
                <strong>MITRE:</strong> {getMitreAttackMapping(selectedNode)?.id} ({getMitreAttackMapping(selectedNode)?.tactic})
              </div>
              {selectedNode.cves?.length > 0 && (
                <div><strong>Top CVE:</strong> {selectedNode.cves[0].cve_id} (CVSS {selectedNode.cves[0].cvss_score})</div>
              )}
            </div>
            <div className="inspector-actions">
              <button
                type="button"
                className={`btn-isolate ${isolatedNodes?.has(selectedNode.id) ? "is-quarantined" : ""}`}
                onClick={() => toggleIsolateNode && toggleIsolateNode(selectedNode.id)}
              >
                {isolatedNodes?.has(selectedNode.id) ? "🛡️ Restore Host to Network" : "🛑 Isolate Host / Quarantine"}
              </button>
            </div>
          </div>
        )}

        <PlaybackControls
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onPrevHop={() => setLiveHopIndex((prev) => Math.max(prev - 1, 1))}
          onNextHop={() => setLiveHopIndex((prev) => Math.min(prev + 1, attackPath?.path?.length || 1))}
          speed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          currentHop={compromisedCount}
          totalHops={attackPath?.path?.length || 0}
          isolatedCount={isolatedNodes?.size || 0}
          onClearIsolation={() => {
            if (isolatedNodes) {
              for (const nid of isolatedNodes) toggleIsolateNode(nid);
            }
          }}
          status={status}
          STATUS={STATUS}
        />
      </div>
      <div className="graph-legend">
        <span className="legend-item"><i style={{ background: "#2ECC71" }} /> Low risk</span>
        <span className="legend-item"><i style={{ background: "#F1C40F" }} /> Medium risk</span>
        <span className="legend-item"><i style={{ background: "#F39C12" }} /> High risk</span>
        <span className="legend-item"><i style={{ background: "#E74C3C" }} /> Critical / compromised</span>
        <span className="legend-item"><i style={{ background: "#8E44AD" }} /> Alternative Attack Path</span>
        <span className="legend-item legend-sep" />
        <span className="legend-item"><i style={{ background: "#3EC6FF" }} /> Web</span>
        <span className="legend-item"><i style={{ background: "#B57BFF" }} /> Database</span>
        <span className="legend-item"><i style={{ background: "#F1C40F" }} /> Auth / directory</span>
        <span className="legend-item"><i style={{ background: "#FF6FA5" }} /> Remote admin</span>
      </div>
    </div>
  );
}

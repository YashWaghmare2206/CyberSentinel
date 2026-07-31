import { useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { buildGraph } from "../data/graphEngine";
import { computeLayout } from "../data/layoutEngine";
import { riskTier } from "../data/layout";
import RiskNode from "./RiskNode";
import "./NetworkGraph.css";

const nodeTypes = { riskNode: RiskNode };

const graph = buildGraph();
const positions = computeLayout();

function countCompromisedSteps(narrative, pathLength) {
  if (!narrative) return 0;
  const matches = narrative.match(/Step\s+(\d+)/gi) || [];
  const maxStep = matches.reduce((max, m) => {
    const n = parseInt(m.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  // The narrative's final "Step N+1" line is the destination summary, not
  // a new node -- clamp so the camera/highlight never overruns the path.
  return Math.min(maxStep, pathLength);
}

// Non-visual child (must render inside <ReactFlow> to access useReactFlow).
// Pans/zooms to the node currently under attack, and re-fits the whole
// map once the run ends or resets.
function CameraController({ activeNodeId, isActive }) {
  const { setCenter, fitView } = useReactFlow();

  useEffect(() => {
    if (isActive && activeNodeId) {
      const pos = positions[activeNodeId];
      if (pos) {
        setCenter(pos.x + 90, pos.y + 45, { zoom: 1.3, duration: 700 });
      }
    }
  }, [activeNodeId, isActive, setCenter]);

  useEffect(() => {
    if (!isActive) {
      fitView({ padding: 0.15, duration: 500 });
    }
  }, [isActive, fitView]);

  return null;
}

function NetworkGraphInner({ attackPath, narrative, status, STATUS }) {
  const pathSet = useMemo(() => new Set(attackPath?.path ?? []), [attackPath]);
  const compromisedCount = useMemo(
    () => countCompromisedSteps(narrative, attackPath?.path?.length ?? 0),
    [narrative, attackPath]
  );
  // "Settled" = fully compromised, camera has already moved past it.
  // "Active" = the current node under attack right now (gets the pulse + focus).
  const settledSet = useMemo(() => {
    if (!attackPath) return new Set();
    return new Set(attackPath.path.slice(0, Math.max(compromisedCount - 1, 0)));
  }, [attackPath, compromisedCount]);
  const activeNodeId = attackPath?.path?.[Math.max(compromisedCount - 1, 0)] ?? attackPath?.path?.[0];

  const isSimulating =
    status === STATUS.SIMULATING ||
    status === STATUS.NARRATIVE_DONE ||
    status === STATUS.FIXING ||
    status === STATUS.COMPLETE;

  const nodes = useMemo(
    () =>
      [...graph.nodes.values()].map((n) => {
        const pos = positions[n.id] ?? { x: 0, y: 0 };
        const onPath = isSimulating && pathSet.has(n.id);
        const settled = isSimulating && settledSet.has(n.id);
        const active = isSimulating && onPath && n.id === activeNodeId;
        const dimmed = isSimulating && !onPath;
        return {
          id: n.id,
          type: "riskNode",
          position: pos,
          data: {
            node: n,
            onPath,
            compromised: settled || active,
            active,
            dimmed,
            tier: riskTier(n.risk),
          },
          draggable: false,
        };
      }),
    [pathSet, settledSet, activeNodeId, isSimulating]
  );

  const edges = useMemo(
    () =>
      graph.edges.map((e) => {
        const fromIdx = attackPath?.path?.indexOf(e.from) ?? -1;
        const toIdx = attackPath?.path?.indexOf(e.to) ?? -1;
        const bothOnPath = isSimulating && fromIdx !== -1 && toIdx === fromIdx + 1;
        const traversed = bothOnPath && toIdx <= compromisedCount - 1;
        const dimmed = isSimulating && !bothOnPath;
        return {
          id: `${e.from}-${e.to}`,
          source: e.from,
          target: e.to,
          animated: bothOnPath && !traversed,
          style: {
            stroke: traversed ? "#E74C3C" : bothOnPath ? "#F39C12" : "#2A3560",
            strokeWidth: bothOnPath ? 2.5 : 1,
            opacity: dimmed ? 0.15 : 1,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: traversed ? "#E74C3C" : bothOnPath ? "#F39C12" : "#2A3560",
          },
        };
      }),
    [attackPath, compromisedCount, isSimulating]
  );

  return (
    <div className="network-graph-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.15}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
        connectionLineType={ConnectionLineType.SmoothStep}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#1B2450" />
        <Controls showInteractive={false} position="bottom-right" />
        <CameraController activeNodeId={activeNodeId} isActive={isSimulating} />
      </ReactFlow>
    </div>
  );
}

export default function NetworkGraph(props) {
  return (
    <div className="network-graph-panel">
      <div className="panel-header">
        <span className="panel-eyebrow">01 // Network Topology · {graph.nodes.size} nodes</span>
        <h2>Bank Infrastructure Map</h2>
      </div>
      <ReactFlowProvider>
        <NetworkGraphInner {...props} />
      </ReactFlowProvider>
      <div className="graph-legend">
        <span className="legend-item"><i style={{ background: "#E74C3C" }} /> Critical (CVSS 8+)</span>
        <span className="legend-item"><i style={{ background: "#F39C12" }} /> Medium (CVSS 5-7)</span>
        <span className="legend-item"><i style={{ background: "#2ECC71" }} /> Safe / no known CVE</span>
      </div>
    </div>
  );
}

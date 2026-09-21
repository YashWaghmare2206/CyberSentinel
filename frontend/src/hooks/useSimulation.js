import { useCallback, useRef, useState, useEffect } from "react";
import { streamSimulation, streamFix } from "../api/simulate";
import { COMMON_ENTRY_POINTS, COMMON_END_GOALS, getNetworkScenarios, getNode } from "../data/graphEngine";
import { buildNarrative, buildNodeFix } from "../data/localEngine";

const STATUS = {
  IDLE: "idle",
  SIMULATING: "simulating",
  NARRATIVE_DONE: "narrative_done",
  FIXING: "fixing",
  COMPLETE: "complete",
  ERROR: "error",
};

function extractSeverity(text) {
  const match = text.match(/SEVERITY:\s*(CRITICAL|HIGH|MEDIUM|LOW)/i);
  return match ? match[1].toUpperCase() : null;
}

export function useSimulation() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [attackPath, setAttackPath] = useState(null);
  const [allAttackPaths, setAllAttackPaths] = useState([]);
  const [rankedPaths, setRankedPaths] = useState([]);
  const [pathIndex, setPathIndex] = useState(0);
  const [narrative, setNarrative] = useState("");
  const [fixText, setFixText] = useState("");
  const [nodeFixes, setNodeFixes] = useState([]);
  const [severity, setSeverity] = useState(null);
  const [dataSource, setDataSource] = useState(null); // "live" | "local"
  const [errorMessage, setErrorMessage] = useState(null);
  const [networkId, setNetworkId] = useState("enterprise-bank");
  const [algorithm, setAlgorithm] = useState("dijkstra");
  const [weightingMode, setWeightingMode] = useState("static");

  const initialScenarios = getNetworkScenarios("enterprise-bank");
  const [entryNode, setEntryNode] = useState(Object.keys(initialScenarios.sources)[0]);
  const [targetNode, setTargetNode] = useState(Object.keys(initialScenarios.destinations)[0]);
  
  const runId = useRef(0);

  useEffect(() => {
    const scenarios = getNetworkScenarios(networkId);
    const validEntries = Object.keys(scenarios.sources || {});
    const validTargets = Object.keys(scenarios.destinations || {});
    if (!validEntries.includes(entryNode) && validEntries.length > 0) {
      setEntryNode(validEntries[0]);
    }
    if (!validTargets.includes(targetNode) && validTargets.length > 0) {
      setTargetNode(validTargets[0]);
    }
  }, [networkId, entryNode, targetNode]);

  const [isolatedNodes, setIsolatedNodes] = useState(new Set());
  const [containmentMessage, setContainmentMessage] = useState(null);

  const reset = useCallback(() => {
    runId.current += 1;
    setStatus(STATUS.IDLE);
    setAttackPath(null);
    setAllAttackPaths([]);
    setRankedPaths([]);
    setPathIndex(0);
    setNarrative("");
    setFixText("");
    setNodeFixes([]);
    setSeverity(null);
    setDataSource(null);
    setErrorMessage(null);
    setIsolatedNodes(new Set());
    setContainmentMessage(null);
  }, []);

  const runFix = useCallback(async (path, thisRun) => {
    setStatus(STATUS.FIXING);
    setNodeFixes([]);
    try {
      for await (const event of streamFix(path)) {
        if (runId.current !== thisRun) return;
        if (event.type === "source") setDataSource(event.data);
        if (event.type === "node_fix") {
          const cardData = event.data || event;
          setNodeFixes((prev) => [...prev, cardData]);
        }
        if (event.type === "fix_token" || event.type === "token") {
          setFixText((prev) => prev + event.data);
        }
        if (event.type === "done") break;
      }
    } catch (err) {
      console.warn("runFix stream encountered an error:", err);
    } finally {
      if (runId.current === thisRun) {
        setStatus(STATUS.COMPLETE);
      }
    }
  }, []);

  const simulate = useCallback(async (options = {}) => {
    runId.current += 1;
    const thisRun = runId.current;
    const nextPathIndex = options.pathIndex ?? 0;
    setStatus(STATUS.SIMULATING);
    setAttackPath(null);
    setNarrative("");
    setFixText("");
    setNodeFixes([]);
    setSeverity(null);
    setErrorMessage(null);
    setPathIndex(nextPathIndex);

    let fullNarrative = "";
    let path = null;
    let failure = null;

    const scenarios = getNetworkScenarios(networkId);
    const params = {
      entryNode,
      targetNode,
      entryLabel: scenarios.sources?.[entryNode] || COMMON_ENTRY_POINTS[entryNode] || entryNode,
      targetLabel: scenarios.destinations?.[targetNode] || COMMON_END_GOALS[targetNode] || targetNode,
      networkId,
      algorithm,
      weightingMode,
      pathIndex: 0,
    };

    try {
      for await (const event of streamSimulation(params)) {
        if (runId.current !== thisRun) return; // superseded by a reset/new run
        if (event.type === "source") setDataSource(event.data);
        if (event.type === "paths") {
          const pathList = Array.isArray(event.data) ? event.data : [event.data];
          setRankedPaths(pathList);
          setAllAttackPaths(pathList);
        }
        if (event.type === "path") {
          const pathData = event.data;
          if (Array.isArray(pathData)) {
            // Backend or local fallback sent full array
            setRankedPaths(pathData);
            setAllAttackPaths(pathData);
            const chosen = pathData[0];
            path = chosen;
            setAttackPath(chosen);
          } else {
            path = pathData;
            setAttackPath(pathData);
          }
        }
        if (event.type === "token") {
          fullNarrative += event.data;
          setNarrative(fullNarrative);
          const sev = extractSeverity(fullNarrative);
          if (sev) setSeverity(sev);
        }
        if (event.type === "error") {
          failure = event.data || "The simulation could not find a valid attack path.";
        }
        if (event.type === "done") break;
      }
    } catch (err) {
      console.warn("streamSimulation error:", err);
      failure = failure || "Connection interrupted during simulation.";
    }

    if (runId.current !== thisRun) return;

    if (!path) {
      setErrorMessage(
        failure || "No valid attack path was found between the selected entry point and target."
      );
      setStatus(STATUS.ERROR);
      return;
    }

    setStatus(STATUS.NARRATIVE_DONE);

    // Fallback severity calculation if not emitted in text
    if (!severity && path?.nodes) {
      let maxScore = 0;
      for (const n of path.nodes) {
        for (const c of n.cves || []) {
          if ((c.cvss_score || 0) > maxScore) maxScore = c.cvss_score;
        }
      }
      setSeverity(maxScore >= 9 ? "CRITICAL" : maxScore >= 7 ? "HIGH" : "MEDIUM");
    }

    await runFix(path, thisRun);
  }, [runFix, entryNode, targetNode, networkId, algorithm, weightingMode, severity]);

  const selectPath = useCallback(
    (index) => {
      if (!rankedPaths || !rankedPaths[index]) return;
      const chosen = rankedPaths[index];
      setPathIndex(index);
      setAttackPath(chosen);

      // Instantaneous in-memory update for narrative without re-simulating
      const scenarios = getNetworkScenarios(networkId);
      const eLabel = scenarios.sources?.[entryNode] || entryNode;
      const tLabel = scenarios.destinations?.[targetNode] || targetNode;
      const newNarrative = buildNarrative(chosen, eLabel, tLabel);
      setNarrative(newNarrative);
      const sev = extractSeverity(newNarrative);
      if (sev) setSeverity(sev);

      // Instantaneous in-memory update for node fixes
      if (chosen.nodes && Array.isArray(chosen.nodes)) {
        const fixes = chosen.nodes.map((node) => ({
          node_id: node.id,
          node_name: node.name,
          ...buildNodeFix(node),
        }));
        setNodeFixes(fixes);
      }
    },
    [rankedPaths, networkId, entryNode, targetNode]
  );

  const toggleIsolateNode = useCallback((nodeId) => {
    setIsolatedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Handle dynamic re-routing or vector containment when isolatedNodes change
  useEffect(() => {
    if (!rankedPaths || rankedPaths.length === 0) return;
    if (isolatedNodes.size === 0) {
      setContainmentMessage(null);
      return;
    }

    // Check if the current attack path uses any quarantined node
    const isCurrentPathSevered = attackPath?.path?.some((nid) => isolatedNodes.has(nid));
    if (isCurrentPathSevered) {
      // Find another candidate route from rankedPaths that does NOT traverse isolated nodes
      const altIndex = rankedPaths.findIndex((p) => !p.path.some((nid) => isolatedNodes.has(nid)));
      if (altIndex !== -1) {
        selectPath(altIndex);
        setContainmentMessage(`⚠️ Pivot host isolated! Adversary forced onto alternative Route #${altIndex + 1}.`);
      } else {
        // All known routes are severed!
        setAttackPath(null);
        setContainmentMessage(`🛡️ Attack Contained: All attack vectors to destination neutralized by host isolation.`);
      }
    }
  }, [isolatedNodes, rankedPaths, attackPath, selectPath]);

  return {
    status,
    STATUS,
    attackPath,
    allAttackPaths,
    rankedPaths,
    pathIndex,
    narrative,
    fixText,
    nodeFixes,
    severity,
    dataSource,
    errorMessage,
    entryNode,
    targetNode,
    networkId,
    algorithm,
    weightingMode,
    isolatedNodes,
    containmentMessage,
    toggleIsolateNode,
    setEntryNode,
    setTargetNode,
    setNetworkId,
    setAlgorithm,
    setWeightingMode,
    simulate,
    selectPath,
    reset,
  };
}


import { useCallback, useEffect, useRef, useState } from "react";
import { streamSimulation, streamFix } from "../api/simulate";
import { getNetworkScenarios } from "../data/graphEngine";
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

/**
 * Detects which hop index (0-based) the attack has reached based on
 * the narrative text revealed so far.
 */
function detectCurrentHop(narrativeText, pathLength, pathNodes = []) {
  if (!pathLength || pathLength <= 1) return 0;
  if (!narrativeText) return 0;

  // 1. Explicit step numbers: "Step 1", "Step 2", "**1.", "1. Foothold", "Hop 1"
  const regex = /(?:Step\s*(\d+)|\*\*(\d+)\.|\b(\d+)\.\s+[A-Za-z]|Hop\s*(\d+)|\bPhase\s*(\d+))/gi;
  let maxFound = 0;
  let m;
  while ((m = regex.exec(narrativeText)) !== null) {
    const num = parseInt(m[1] || m[2] || m[3] || m[4] || m[5], 10);
    if (Number.isFinite(num) && num >= 1) {
      maxFound = Math.max(maxFound, num);
    }
  }
  if (maxFound > 0) {
    return Math.min(maxFound - 1, pathLength - 1);
  }

  // 2. Check if node names or IDs from path appear in narrative text
  if (Array.isArray(pathNodes) && pathNodes.length > 0) {
    let highestNodeIndex = -1;
    for (let i = 0; i < pathNodes.length; i++) {
      const node = pathNodes[i];
      const id = typeof node === "string" ? node : node?.id;
      const name = typeof node === "object" ? node?.name : null;
      if (id && narrativeText.toLowerCase().includes(id.toLowerCase())) {
        highestNodeIndex = Math.max(highestNodeIndex, i);
      }
      if (name && narrativeText.toLowerCase().includes(name.toLowerCase())) {
        highestNodeIndex = Math.max(highestNodeIndex, i);
      }
    }
    if (highestNodeIndex >= 0) {
      return Math.min(highestNodeIndex, pathLength - 1);
    }
  }

  // 3. Fallback: text progress ratio relative to expected narrative length (~500 chars)
  const ratio = Math.min(1, narrativeText.length / 500);
  return Math.min(Math.floor(ratio * pathLength), pathLength - 1);
}

export function useSimulation() {
  const [networkId, setNetworkIdState] = useState("enterprise-bank");
  const [status, setStatus] = useState(STATUS.IDLE);
  const [attackPath, setAttackPath] = useState(null);
  const [allAttackPaths, setAllAttackPaths] = useState([]);
  const [rankedPaths, setRankedPaths] = useState([]);
  const [pathIndex, setPathIndex] = useState(0);
  const [isolatedNodes, setIsolatedNodes] = useState(new Set());
  const [containmentMessage, setContainmentMessage] = useState(null);
  const [narrative, setNarrative] = useState("");
  const [fixText, setFixText] = useState("");
  const [nodeFixes, setNodeFixes] = useState([]);
  const [severity, setSeverity] = useState(null);
  const [dataSource, setDataSource] = useState(null); // "live" | "local"
  const [errorMessage, setErrorMessage] = useState(null);
  const [algorithm, setAlgorithm] = useState("pignn"); // "pignn" | "dijkstra" | "astar"
  const [weightingMode, setWeightingMode] = useState("dwm"); // "dwm" | "static" | "ml"
  const [pignnConfidence, setPignnConfidence] = useState(null);
  const [activeHopIndex, setActiveHopIndex] = useState(0);

  // Initialize entry and target from default network scenario
  const initialScenarios = getNetworkScenarios("enterprise-bank");
  const [entryNode, setEntryNode] = useState(Object.keys(initialScenarios?.sources || { api_gw_1: "" })[0] || "api_gw_1");
  const [targetNode, setTargetNode] = useState(Object.keys(initialScenarios?.destinations || { swift_terminal: "" })[0] || "swift_terminal");

  const runId = useRef(0);
  const tokenQueueRef = useRef("");
  const streamFinishedRef = useRef(false);
  const fastForwardRef = useRef(false);

  const skipTypewriter = useCallback(() => {
    fastForwardRef.current = true;
  }, []);

  const reset = useCallback(() => {
    runId.current += 1;
    tokenQueueRef.current = "";
    streamFinishedRef.current = true;
    fastForwardRef.current = false;
    setStatus(STATUS.IDLE);
    setAttackPath(null);
    setAllAttackPaths([]);
    setRankedPaths([]);
    setPathIndex(0);
    setIsolatedNodes(new Set());
    setContainmentMessage(null);
    setNarrative("");
    setFixText("");
    setNodeFixes([]);
    setSeverity(null);
    setDataSource(null);
    setErrorMessage(null);
    setPignnConfidence(null);
    setActiveHopIndex(0);
  }, []);

  const setNetworkId = useCallback((newId) => {
    setNetworkIdState(newId);
    const scenarios = getNetworkScenarios(newId);
    const entries = Object.keys(scenarios?.sources || {});
    const targets = Object.keys(scenarios?.destinations || {});
    if (entries.length > 0) setEntryNode(entries[0]);
    if (targets.length > 0) setTargetNode(targets[0]);
    reset();
  }, [reset]);

  useEffect(() => {
    const scenarios = getNetworkScenarios(networkId);
    const entries = Object.keys(scenarios?.sources || {});
    const targets = Object.keys(scenarios?.destinations || {});
    if (entries.length > 0 && !entries.includes(entryNode)) {
      setEntryNode(entries[0]);
    }
    if (targets.length > 0 && !targets.includes(targetNode)) {
      setTargetNode(targets[0]);
    }
  }, [networkId, entryNode, targetNode]);

  const runFix = useCallback(async (path, thisRun) => {
    setStatus(STATUS.FIXING);
    // Initialize base node fixes immediately so cards are visible
    if (path?.nodes && Array.isArray(path.nodes)) {
      setNodeFixes(
        path.nodes.map((node) => {
          const cve = node.cves?.[0];
          const local = buildNodeFix(node);
          const pkg = (node.software || "service").toLowerCase().split(" ")[0];
          const cvss = cve?.cvss_score ?? 7.5;
          return {
            node_id: node.id,
            node_name: node.name || node.id,
            software: node.software,
            cve_id: cve?.cve_id,
            cvss_score: cvss,
            adjusted_weight: node.adjusted_weight,
            severity: cve?.severity,
            issue: local.issue,
            impact: local.impact,
            fix: local.fix,
            compensating_cmd: `sudo iptables -I FORWARD -d ${node.id} -j DROP # Choke exploit path`,
            patch_cmd: `sudo apt-get update && sudo apt-get --only-upgrade install ${pkg} -y`,
            priority: cvss >= 9 ? "Fix Now (P1)" : cvss >= 7 ? "Fix This Week (P2)" : "Monitor (P3)",
            dwm_breakdown: node.dwm_breakdown,
          };
        })
      );
    }

    for await (const event of streamFix(path)) {
      if (runId.current !== thisRun) return;
      if (event.type === "source") setDataSource(event.data);
      if (event.type === "node_fix") {
        const raw = event.data || event;
        const nodeId = event.node_id || raw.node_id;
        const nodeObj = path?.nodes?.find((n) => n.id === nodeId) || {};
        const card = {
          node_id: nodeId,
          node_name: raw.node_name || nodeObj.name || nodeId,
          software: nodeObj.software,
          cve_id: raw.cve_id || nodeObj.cves?.[0]?.cve_id,
          cvss_score: raw.cvss_score ?? nodeObj.cves?.[0]?.cvss_score,
          adjusted_weight: raw.adjusted_weight ?? nodeObj.adjusted_weight,
          severity: raw.severity || nodeObj.cves?.[0]?.severity,
          issue: raw.issue || `Security vulnerability on ${nodeObj.name || nodeId}`,
          impact: raw.impact || `Allows attacker to pivot through ${nodeObj.software || "host"}.`,
          fix: raw.fix || `Apply latest security patch and enforce network segmentation.`,
          compensating_cmd: raw.compensating_cmd || `sudo iptables -I FORWARD -d ${nodeId} -j DROP`,
          patch_cmd: raw.patch_cmd || `sudo apt update && sudo apt install --only-upgrade ${nodeObj.software || "package"} -y`,
          priority: raw.priority || (Number(raw.cvss_score) >= 9 ? "Fix Now (P1)" : "Fix This Week (P2)"),
          dwm_breakdown: raw.dwm_breakdown || nodeObj.dwm_breakdown,
        };
        setNodeFixes((prev) => {
          const idx = prev.findIndex((c) => (c.node_id || c.id) === nodeId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...card };
            return next;
          }
          return [...prev, card];
        });
      }
      if (event.type === "fix_token" || event.type === "token") {
        setFixText((prev) => prev + event.data);
      }
      if (event.type === "done") break;
    }
    if (runId.current === thisRun) setStatus(STATUS.COMPLETE);
  }, []);

  const simulate = useCallback(async () => {
    runId.current += 1;
    const thisRun = runId.current;
    setStatus(STATUS.SIMULATING);
    setAttackPath(null);
    setNarrative("");
    setFixText("");
    setNodeFixes([]);
    setSeverity(null);
    setErrorMessage(null);
    setActiveHopIndex(0);
    tokenQueueRef.current = "";
    streamFinishedRef.current = false;

    let path = null;
    let failure = null;

    const scenarios = getNetworkScenarios(networkId);
    const params = {
      entryNode,
      targetNode,
      entryLabel: scenarios?.sources?.[entryNode] || entryNode,
      targetLabel: scenarios?.destinations?.[targetNode] || targetNode,
      algorithm,
      weightingMode,
      networkId,
    };

    // 1. SSE Stream Consumer
    const streamPromise = (async () => {
      try {
        for await (const event of streamSimulation(params)) {
          if (runId.current !== thisRun) return;
          if (event.type === "source") setDataSource(event.data);
          if (event.type === "paths") {
            const list = Array.isArray(event.data) ? event.data : [event.data];
            setRankedPaths(list);
            setAllAttackPaths(list);
          }
          if (event.type === "path") {
            const pathData = event.data;
            if (Array.isArray(pathData)) {
              setRankedPaths(pathData);
              setAllAttackPaths(pathData);
              const top = pathData[0];
              path = top;
              setAttackPath(top);
              if (top?.pignn_confidence != null) setPignnConfidence(top.pignn_confidence);
            } else {
              path = pathData;
              setAttackPath(pathData);
              if (pathData?.pignn_confidence != null) setPignnConfidence(pathData.pignn_confidence);
            }
          }
          if (event.type === "token") {
            tokenQueueRef.current += event.data;
          }
          if (event.type === "error") {
            failure = event.data || "The simulation could not find a valid attack path.";
          }
          if (event.type === "done") break;
        }
      } catch (err) {
        failure = err.message;
      } finally {
        streamFinishedRef.current = true;
      }
    })();

    // 2. Smooth Typewriter Consumer
    // Paces the output so the user can comfortably read each step as it's typed
    const typewriterPromise = (async () => {
      let displayed = "";
      while (runId.current === thisRun) {
        if (fastForwardRef.current && tokenQueueRef.current.length > 0) {
          // Fast-forward immediately dumps queued tokens
          displayed += tokenQueueRef.current;
          tokenQueueRef.current = "";
          setNarrative(displayed);
          const sev = extractSeverity(displayed);
          if (sev) setSeverity(sev);
          const pathLen = path?.path?.length || 1;
          setActiveHopIndex(pathLen - 1);
        } else if (tokenQueueRef.current.length > 0) {
          // Adaptive chunking: if backlog is very large, type slightly faster
          const backlog = tokenQueueRef.current.length;
          let chunkSize = 1;
          if (backlog > 400) chunkSize = 6;
          else if (backlog > 200) chunkSize = 4;
          else if (backlog > 80) chunkSize = 2;

          const chunk = tokenQueueRef.current.slice(0, chunkSize);
          tokenQueueRef.current = tokenQueueRef.current.slice(chunkSize);
          displayed += chunk;
          setNarrative(displayed);

          const sev = extractSeverity(displayed);
          if (sev) setSeverity(sev);

          const pathLen = path?.path?.length || 1;
          const currentHop = detectCurrentHop(displayed, pathLen, path?.nodes || []);
          setActiveHopIndex(currentHop);
        } else if (streamFinishedRef.current) {
          // Finished receiving SSE and drained typewriter queue
          break;
        }
        // Readable typewriter delay (~26ms per tick)
        await new Promise((resolve) => setTimeout(resolve, 26));
      }
    })();

    await Promise.all([streamPromise, typewriterPromise]);

    if (runId.current !== thisRun) return;

    if (!path) {
      setErrorMessage(
        failure || "No valid attack path was found between the selected entry point and target."
      );
      setStatus(STATUS.ERROR);
      return;
    }

    // Ensure final hop is reached when narrative completes
    if (path.path?.length) {
      setActiveHopIndex(path.path.length - 1);
    }

    setStatus(STATUS.NARRATIVE_DONE);
    await runFix(path, thisRun);
  }, [runFix, networkId, entryNode, targetNode, algorithm, weightingMode]);

  const selectPath = useCallback(
    (index) => {
      if (!rankedPaths || !rankedPaths[index]) return;
      const chosen = rankedPaths[index];
      setPathIndex(index);
      setAttackPath(chosen);
      if (chosen?.pignn_confidence != null) setPignnConfidence(chosen.pignn_confidence);

      const scenarios = getNetworkScenarios(networkId);
      const eLabel = scenarios?.sources?.[entryNode] || entryNode;
      const tLabel = scenarios?.destinations?.[targetNode] || targetNode;
      const newNarrative = buildNarrative(chosen, eLabel, tLabel);
      setNarrative(newNarrative);
      const sev = extractSeverity(newNarrative);
      if (sev) setSeverity(sev);

      if (chosen?.nodes) {
        setNodeFixes(
          chosen.nodes.map((n) => {
            const cve = n.cves?.[0];
            const local = buildNodeFix(n);
            return {
              node_id: n.id,
              node_name: n.name || n.id,
              cve_id: cve?.cve_id,
              cvss_score: cve?.cvss_score,
              adjusted_weight: n.adjusted_weight,
              severity: cve?.severity,
              issue: local.issue,
              impact: local.impact,
              fix: local.fix,
              dwm_breakdown: n.dwm_breakdown,
            };
          })
        );
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

    // Check if current attack path uses any quarantined node
    const isCurrentPathSevered = attackPath?.path?.some((nid) => isolatedNodes.has(nid));
    if (isCurrentPathSevered) {
      const altIndex = rankedPaths.findIndex((p) => !p.path.some((nid) => isolatedNodes.has(nid)));
      if (altIndex !== -1) {
        selectPath(altIndex);
        setContainmentMessage(`⚠️ Pivot host isolated! Adversary forced onto alternative Route #${altIndex + 1}.`);
      } else {
        setAttackPath(null);
        setContainmentMessage(`🛡️ Attack Contained: All attack vectors to destination neutralized by host isolation.`);
      }
    }
  }, [isolatedNodes, rankedPaths, attackPath, selectPath]);

  return {
    status,
    STATUS,
    networkId,
    setNetworkId,
    activeHopIndex,
    attackPath,
    allAttackPaths,
    rankedPaths,
    pathIndex,
    selectPath,
    isolatedNodes,
    containmentMessage,
    toggleIsolateNode,
    narrative,
    fixText,
    nodeFixes,
    severity,
    dataSource,
    errorMessage,
    entryNode,
    targetNode,
    algorithm,
    weightingMode,
    pignnConfidence,
    setEntryNode,
    setTargetNode,
    setAlgorithm,
    setWeightingMode,
    simulate,
    skipTypewriter,
    reset,
  };
}

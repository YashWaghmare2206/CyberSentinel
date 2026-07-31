import { useCallback, useRef, useState } from "react";
import { streamSimulation, streamFix } from "../api/simulate";
import { COMMON_ENTRY_POINTS, COMMON_END_GOALS } from "../data/graphEngine";

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
  const [narrative, setNarrative] = useState("");
  const [fixText, setFixText] = useState("");
  const [severity, setSeverity] = useState(null);
  const [dataSource, setDataSource] = useState(null); // "live" | "local"
  const [errorMessage, setErrorMessage] = useState(null);
  const [entryNode, setEntryNode] = useState(Object.keys(COMMON_ENTRY_POINTS)[0]);
  const [targetNode, setTargetNode] = useState(Object.keys(COMMON_END_GOALS)[0]);
  const runId = useRef(0);

  const reset = useCallback(() => {
    runId.current += 1;
    setStatus(STATUS.IDLE);
    setAttackPath(null);
    setNarrative("");
    setFixText("");
    setSeverity(null);
    setDataSource(null);
    setErrorMessage(null);
  }, []);

  const runFix = useCallback(async (path, thisRun) => {
    setStatus(STATUS.FIXING);
    for await (const event of streamFix(path)) {
      if (runId.current !== thisRun) return;
      if (event.type === "source") setDataSource(event.data);
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
    setSeverity(null);
    setErrorMessage(null);

    let fullNarrative = "";
    let path = null;
    let failure = null;

    const params = {
      entryNode,
      targetNode,
      entryLabel: COMMON_ENTRY_POINTS[entryNode],
      targetLabel: COMMON_END_GOALS[targetNode],
    };

    for await (const event of streamSimulation(params)) {
      if (runId.current !== thisRun) return; // superseded by a reset/new run
      if (event.type === "source") setDataSource(event.data);
      if (event.type === "path") {
        path = event.data;
        setAttackPath(event.data);
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

    if (runId.current !== thisRun) return;

    // No path was found (either an explicit error event, or the stream
    // ended without ever producing one) -- stop here with a visible error
    // instead of leaving the UI stuck on "Simulating...".
    if (!path) {
      setErrorMessage(
        failure || "No valid attack path was found between the selected entry point and target."
      );
      setStatus(STATUS.ERROR);
      return;
    }

    setStatus(STATUS.NARRATIVE_DONE);
    await runFix(path, thisRun);
  }, [runFix, entryNode, targetNode]);

  return {
    status,
    STATUS,
    attackPath,
    narrative,
    fixText,
    severity,
    dataSource,
    errorMessage,
    entryNode,
    targetNode,
    setEntryNode,
    setTargetNode,
    simulate,
    reset,
  };
}

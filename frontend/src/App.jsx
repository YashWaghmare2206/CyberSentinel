import { useState } from "react";
import { useSimulation } from "./hooks/useSimulation";
import Header from "./components/Header";
import StepBar from "./components/StepBar";
import NetworkGraph from "./components/NetworkGraph";
import PathList from "./components/PathList";
import StreamPanel from "./components/StreamPanel";
import RiskCards from "./components/RiskCards";
import FixPanel from "./components/FixPanel";
import ExecutiveReportModal from "./components/ExecutiveReportModal";
import WarehouseDashboard from "./components/warehouse/WarehouseDashboard";
import "./App.css";

function App() {
  const {
    status,
    STATUS,
    attackPath,
    allAttackPaths,
    rankedPaths,
    pathIndex,
    selectPath,
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
    setEntryNode,
    setTargetNode,
    setNetworkId,
    setAlgorithm,
    setWeightingMode,
    isolatedNodes,
    containmentMessage,
    toggleIsolateNode,
    simulate,
    reset,
  } = useSimulation();

  const [workspace, setWorkspace] = useState("simulation");
  const [lowerTab, setLowerTab] = useState("risk");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const fixAvailable =
    status !== STATUS.IDLE && status !== STATUS.SIMULATING && status !== STATUS.ERROR;

  function openDetails(tab) {
    setLowerTab(tab);
    setDetailsOpen(true);
  }

  function handleStepClick(stepId) {
    if (stepId === "simulate") {
      simulate();
    } else if (stepId === "fixes" && fixAvailable) {
      openDetails("fix");
    } else if (stepId === "paths") {
      setDetailsOpen(false);
    } else if (stepId === "scenario") {
      setDetailsOpen(false);
    }
  }

  return (
    <div className="app-shell">
      <Header
        status={status}
        STATUS={STATUS}
        onSimulate={simulate}
        onReset={reset}
        entryNode={entryNode}
        targetNode={targetNode}
        onEntryChange={setEntryNode}
        onTargetChange={setTargetNode}
        networkId={networkId}
        algorithm={algorithm}
        weightingMode={weightingMode}
        onNetworkChange={setNetworkId}
        onAlgorithmChange={setAlgorithm}
        onWeightingModeChange={setWeightingMode}
        onOpenReport={() => setReportOpen(true)}
        workspace={workspace}
        setWorkspace={setWorkspace}
      />

      {workspace === "warehouse" ? (
        <WarehouseDashboard />
      ) : (
        <>
          <StepBar
            networkId={networkId}
            entryNode={entryNode}
            targetNode={targetNode}
            status={status}
            STATUS={STATUS}
            pathIndex={pathIndex}
            onStepClick={handleStepClick}
          />

      <main className="dashboard">
        <section className="dashboard__graph">
          <PathList
            rankedPaths={rankedPaths}
            pathIndex={pathIndex}
            onSelect={selectPath}
            status={status}
            STATUS={STATUS}
          />
          <NetworkGraph
            attackPath={attackPath}
            allAttackPaths={allAttackPaths}
            networkId={networkId}
            weightingMode={weightingMode}
            narrative={narrative}
            status={status}
            STATUS={STATUS}
            isolatedNodes={isolatedNodes}
            toggleIsolateNode={toggleIsolateNode}
            containmentMessage={containmentMessage}
          />
        </section>

        <section className="dashboard__stream">
          <StreamPanel
            narrative={narrative}
            status={status}
            STATUS={STATUS}
            severity={severity}
            dataSource={dataSource}
            errorMessage={errorMessage}
            onOpenRisk={() => openDetails("risk")}
            onOpenFix={() => openDetails("fix")}
            fixAvailable={fixAvailable}
            lowerTab={lowerTab}
            detailsOpen={detailsOpen}
          />
        </section>
      </main>
      </>
      )}

      {detailsOpen && workspace === "simulation" && (
        <div className="details-modal-backdrop" onClick={() => setDetailsOpen(false)}>
          <div
            className="details-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="details-modal__tabs" role="tablist">
              <button
                type="button"
                role="tab"
                className={`lower-tabs__btn ${lowerTab === "risk" ? "is-active" : ""}`}
                aria-selected={lowerTab === "risk"}
                onClick={() => setLowerTab("risk")}
              >
                03 // Risk Cards
              </button>
              <button
                type="button"
                role="tab"
                className={`lower-tabs__btn ${lowerTab === "fix" ? "is-active" : ""}`}
                aria-selected={lowerTab === "fix"}
                disabled={!fixAvailable}
                onClick={() => setLowerTab("fix")}
                title={!fixAvailable ? "Available once a simulation has run" : undefined}
              >
                04 // Auto-Fix Instructions
                {status === STATUS.FIXING && <span className="lower-tabs__dot" />}
              </button>
              <button
                type="button"
                className="details-modal__close"
                aria-label="Close"
                onClick={() => setDetailsOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="details-modal__body">
              <div className={`lower-tabs__pane ${lowerTab === "risk" ? "is-active" : ""}`}>
                <RiskCards attackPath={attackPath} status={status} STATUS={STATUS} weightingMode={weightingMode} />
              </div>
              <div className={`lower-tabs__pane ${lowerTab === "fix" ? "is-active" : ""}`}>
                <FixPanel fixText={fixText} nodeFixes={nodeFixes} status={status} STATUS={STATUS} weightingMode={weightingMode} />
              </div>
            </div>
          </div>
        </div>
      )}

      <ExecutiveReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        networkId={networkId}
        attackPath={attackPath}
        rankedPaths={rankedPaths}
        narrative={narrative}
        severity={severity}
        nodeFixes={nodeFixes}
        weightingMode={weightingMode}
        algorithm={algorithm}
      />
    </div>
  );
}

export default App;

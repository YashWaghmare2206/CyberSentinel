import { useState } from "react";
import { useSimulation } from "./hooks/useSimulation";
import Header from "./components/Header";
import NetworkGraph from "./components/NetworkGraph";
import PathList from "./components/PathList";
import StreamPanel from "./components/StreamPanel";
import RiskCards from "./components/RiskCards";
import FixPanel from "./components/FixPanel";
import SeverityBadge from "./components/SeverityBadge";
import ExecutiveReportModal from "./components/ExecutiveReportModal";
import ProjectExplainer from "./components/explainer/ProjectExplainer";
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
    isolatedNodes,
    containmentMessage,
    toggleIsolateNode,
    narrative,
    fixText,
    nodeFixes,
    severity,
    dataSource,
    errorMessage,
    networkId,
    setNetworkId,
    activeHopIndex,
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
  } = useSimulation();

  const [workspace, setWorkspace] = useState("simulation");
  const [activeConsoleTab, setActiveConsoleTab] = useState("narrative");
  const [lowerTab, setLowerTab] = useState("risk");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const fixAvailable =
    status !== STATUS.IDLE && status !== STATUS.SIMULATING && status !== STATUS.ERROR;

  const pathObj = Array.isArray(attackPath) ? attackPath[0] : attackPath;
  const vulnerableCount = (pathObj?.nodes ?? []).filter((n) => n.cves?.length).length;

  function openDetails(tab) {
    setActiveConsoleTab(tab === "risk" ? "risk" : "fix");
    setLowerTab(tab);
    setDetailsOpen(true);
  }

  return (
    <div className="app-shell">
      <Header
        status={status}
        STATUS={STATUS}
        onSimulate={simulate}
        onReset={reset}
        networkId={networkId}
        onNetworkChange={setNetworkId}
        entryNode={entryNode}
        targetNode={targetNode}
        onEntryChange={setEntryNode}
        onTargetChange={setTargetNode}
        algorithm={algorithm}
        onAlgorithmChange={setAlgorithm}
        weightingMode={weightingMode}
        onWeightingModeChange={setWeightingMode}
        pignnConfidence={pignnConfidence}
        onOpenReport={() => setReportOpen(true)}
        workspace={workspace}
        setWorkspace={setWorkspace}
      />

      {workspace === "explainer" ? (
        <ProjectExplainer onNavigate={setWorkspace} />
      ) : (
        <>
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
              narrative={narrative}
              status={status}
              STATUS={STATUS}
              networkId={networkId}
              weightingMode={weightingMode}
              isolatedNodes={isolatedNodes}
              toggleIsolateNode={toggleIsolateNode}
              containmentMessage={containmentMessage}
              activeHopIndex={activeHopIndex}
            />
          </section>

        <section className="dashboard__console">
          <div className="console-header">
            <div className="console-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                className={`console-tab ${activeConsoleTab === "narrative" ? "is-active" : ""}`}
                aria-selected={activeConsoleTab === "narrative"}
                onClick={() => setActiveConsoleTab("narrative")}
              >
                <span className="console-tab__num">02</span>
                <span>Kill Chain Narrative</span>
                {status === STATUS.SIMULATING && <span className="console-tab__pulse red" />}
              </button>

              <button
                type="button"
                role="tab"
                className={`console-tab ${activeConsoleTab === "fix" ? "is-active" : ""}`}
                aria-selected={activeConsoleTab === "fix"}
                onClick={() => setActiveConsoleTab("fix")}
              >
                <span className="console-tab__num">03</span>
                <span>Auto-Fix Remediation</span>
                {status === STATUS.FIXING && <span className="console-tab__pulse blue" />}
                {fixText && status !== STATUS.FIXING && <span className="console-tab__badge">READY</span>}
              </button>

              <button
                type="button"
                role="tab"
                className={`console-tab ${activeConsoleTab === "risk" ? "is-active" : ""}`}
                aria-selected={activeConsoleTab === "risk"}
                onClick={() => setActiveConsoleTab("risk")}
              >
                <span className="console-tab__num">04</span>
                <span>Risk Cards</span>
                {vulnerableCount > 0 && <span className="console-tab__count">{vulnerableCount}</span>}
              </button>
            </div>

            <div className="console-header__meta">
              {algorithm === "pignn" && pignnConfidence != null && (
                <span className="console-meta-pignn">⚡ PIGNN: {pignnConfidence}%</span>
              )}
              {severity && <SeverityBadge severity={severity} />}
            </div>
          </div>

          <div className="console-body">
            {activeConsoleTab === "narrative" && (
              <StreamPanel
                narrative={narrative}
                status={status}
                STATUS={STATUS}
                severity={severity}
                dataSource={dataSource}
                errorMessage={errorMessage}
                algorithm={algorithm}
                pignnConfidence={pignnConfidence}
                onSwitchToFix={() => setActiveConsoleTab("fix")}
                hasFix={!!fixText}
                onSkipTypewriter={skipTypewriter}
              />
            )}

            {activeConsoleTab === "fix" && (
              <FixPanel
                fixText={fixText}
                nodeFixes={nodeFixes}
                status={status}
                STATUS={STATUS}
                weightingMode={weightingMode}
                attackPath={pathObj}
                onSwitchToNarrative={() => setActiveConsoleTab("narrative")}
              />
            )}

            {activeConsoleTab === "risk" && (
              <RiskCards
                attackPath={attackPath}
                status={status}
                STATUS={STATUS}
                weightingMode={weightingMode}
              />
            )}
          </div>
        </section>
      </main>

      <div className="detail-dock" role="tablist">
        <button
          type="button"
          role="tab"
          className="detail-dock__btn"
          aria-selected={lowerTab === "risk" && detailsOpen}
          onClick={() => openDetails("risk")}
        >
          04 // Fullscreen Risk Cards
        </button>
        <button
          type="button"
          role="tab"
          className="detail-dock__btn"
          aria-selected={lowerTab === "fix" && detailsOpen}
          disabled={!fixAvailable}
          onClick={() => openDetails("fix")}
          title={!fixAvailable ? "Available once a simulation has run" : undefined}
        >
          03 // Fullscreen Remediation
          {status === STATUS.FIXING && <span className="detail-dock__dot" />}
        </button>
        <button
          type="button"
          className="detail-dock__btn"
          onClick={() => setReportOpen(true)}
          title="Open CISO Threat Briefing & Export PDF"
        >
          📄 // Executive Report
        </button>
      </div>

      {detailsOpen && (
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
                <FixPanel fixText={fixText} nodeFixes={nodeFixes} status={status} STATUS={STATUS} weightingMode={weightingMode} attackPath={pathObj} />
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      <ExecutiveReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        networkId={networkId}
        attackPath={pathObj}
        rankedPaths={rankedPaths}
        narrative={narrative}
        severity={severity}
        nodeFixes={nodeFixes}
        fixText={fixText}
        weightingMode={weightingMode}
        algorithm={algorithm}
        entryNode={entryNode}
        targetNode={targetNode}
      />
    </div>
  );
}

export default App;

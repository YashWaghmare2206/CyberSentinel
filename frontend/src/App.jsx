import { useState } from "react";
import { useSimulation } from "./hooks/useSimulation";
import Header from "./components/Header";
import NetworkGraph from "./components/NetworkGraph";
import StreamPanel from "./components/StreamPanel";
import RiskCards from "./components/RiskCards";
import FixPanel from "./components/FixPanel";
import "./App.css";

function App() {
  const {
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
  } = useSimulation();

  const [lowerTab, setLowerTab] = useState("risk");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const fixAvailable =
    status !== STATUS.IDLE && status !== STATUS.SIMULATING && status !== STATUS.ERROR;

  function openDetails(tab) {
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
        entryNode={entryNode}
        targetNode={targetNode}
        onEntryChange={setEntryNode}
        onTargetChange={setTargetNode}
      />

      <main className="dashboard">
        <section className="dashboard__graph">
          <NetworkGraph
            attackPath={attackPath}
            narrative={narrative}
            status={status}
            STATUS={STATUS}
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
          />
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
          03 // Risk Cards
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
          04 // Auto-Fix Instructions
          {status === STATUS.FIXING && <span className="detail-dock__dot" />}
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
                <RiskCards attackPath={attackPath} status={status} STATUS={STATUS} />
              </div>
              <div className={`lower-tabs__pane ${lowerTab === "fix" ? "is-active" : ""}`}>
                <FixPanel fixText={fixText} status={status} STATUS={STATUS} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

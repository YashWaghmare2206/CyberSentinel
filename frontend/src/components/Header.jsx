import ControlBar from "./ControlBar";
import ScenarioSelector from "./ScenarioSelector";
import "./Header.css";

export default function Header({
  status,
  STATUS,
  onSimulate,
  onReset,
  entryNode,
  targetNode,
  onEntryChange,
  onTargetChange,
  networkId,
  algorithm,
  weightingMode,
  onNetworkChange,
  onAlgorithmChange,
  onWeightingModeChange,
  onOpenReport,
  workspace,
  setWorkspace
}) {
  const isBusy = status !== STATUS.IDLE && status !== STATUS.COMPLETE && status !== STATUS.ERROR;
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__mark">◆</span>
        <h1>
          CyberSentinel<span className="app-header__cursor">_</span>
        </h1>
      </div>

      <div className="app-header__center">
        <div className="header-control-group">
          <label className="header-control-label">
            <span>Network</span>
            <select
              className="header-select header-select--network"
              value={networkId}
              onChange={(e) => onNetworkChange(e.target.value)}
              disabled={isBusy}
            >
              <option value="enterprise-bank">Enterprise Bank</option>
              <option value="small-branch-bank">Small Branch Bank</option>
              <option value="legacy-iot-bank">Legacy IoT Bank</option>
            </select>
          </label>

          <label className="header-control-label">
            <span>Algorithm</span>
            <select
              className="header-select header-select--algo"
              value={algorithm}
              onChange={(e) => onAlgorithmChange(e.target.value)}
              disabled={isBusy}
            >
              <option value="pignn">Physics-Informed GNN (PIGNN)</option>
              <option value="dijkstra">Top-K Dijkstra</option>
              <option value="astar">A* Search</option>
            </select>
          </label>

          <label className="header-control-label">
            <span>Risk Model</span>
            <select
              className="header-select header-select--model"
              value={weightingMode}
              onChange={(e) => onWeightingModeChange(e.target.value)}
              disabled={isBusy}
            >
              <option value="static">Static CVSS</option>
              <option value="dwm">Dynamic Weight (DWM)</option>
              <option value="ml">Machine Learning (ML)</option>
            </select>
          </label>
        </div>

        <div className="header-divider" />

        <ScenarioSelector
          entryNode={entryNode}
          targetNode={targetNode}
          onEntryChange={onEntryChange}
          onTargetChange={onTargetChange}
          disabled={isBusy}
          networkId={networkId}
        />
      </div>

      <div className="app-header__actions">
        <div className="workspace-toggle" style={{display: 'flex', gap: '8px', marginRight: '16px'}}>
          <button 
            type="button"
            className="btn-export-report"
            onClick={() => setWorkspace('simulation')}
            style={{ opacity: workspace === 'simulation' ? 1 : 0.5, border: workspace === 'simulation' ? '1px solid #58a6ff' : 'none' }}
          >
            Simulation
          </button>
          <button 
            type="button"
            className="btn-export-report"
            onClick={() => setWorkspace('warehouse')}
            style={{ opacity: workspace === 'warehouse' ? 1 : 0.5, border: workspace === 'warehouse' ? '1px solid #58a6ff' : 'none' }}
            title="DWM Data Mining & Analytics"
          >
            Security Intelligence
          </button>
        </div>
        <ControlBar status={status} STATUS={STATUS} onSimulate={onSimulate} onReset={onReset} />
        <button
          type="button"
          className="btn-export-report"
          onClick={onOpenReport}
          title="Open and export CISO-level Threat Briefing PDF"
        >
          📄 Executive Report
        </button>
      </div>
    </header>
  );
}

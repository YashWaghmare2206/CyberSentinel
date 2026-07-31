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
}) {
  const isBusy = status !== STATUS.IDLE && status !== STATUS.COMPLETE && status !== STATUS.ERROR;
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__mark">◆</span>
        <div>
          <h1>
            CyberSentinel<span className="app-header__cursor">_</span>
          </h1>
          <p>Predict. Prevent. Protect. — PS10 Gen AI Cyber Attack Prediction</p>
        </div>
      </div>
      <ScenarioSelector
        entryNode={entryNode}
        targetNode={targetNode}
        onEntryChange={onEntryChange}
        onTargetChange={onTargetChange}
        disabled={isBusy}
      />
      <ControlBar status={status} STATUS={STATUS} onSimulate={onSimulate} onReset={onReset} />
    </header>
  );
}

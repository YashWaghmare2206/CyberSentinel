import "./ControlBar.css";

export default function ControlBar({ status, STATUS, onSimulate, onReset }) {
  const isBusy = status === STATUS.SIMULATING || status === STATUS.FIXING || status === STATUS.NARRATIVE_DONE;
  const hasRun = status !== STATUS.IDLE;

  return (
    <div className="control-bar">
      <button
        className="btn btn--primary"
        onClick={onSimulate}
        disabled={isBusy}
      >
        {isBusy && <span className="btn__spinner" />}
        {isBusy ? "Simulating…" : status === STATUS.ERROR ? "Retry Simulation" : "Simulate Attack"}
      </button>
      <button
        className="btn btn--ghost"
        onClick={onReset}
        disabled={!hasRun && !isBusy}
      >
        Reset
      </button>
    </div>
  );
}

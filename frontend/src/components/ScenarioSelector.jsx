import { getNetworkScenarios, getNode } from "../data/graphEngine";
import "./ScenarioSelector.css";

export default function ScenarioSelector({
  entryNode,
  targetNode,
  onEntryChange,
  onTargetChange,
  disabled,
  networkId = "enterprise-bank",
}) {
  const scenarios = getNetworkScenarios(networkId);
  const availableEntries = Object.entries(scenarios.sources || {});
  const availableTargets = Object.entries(scenarios.destinations || {});

  return (
    <div className="scenario-selector">
      <label>
        <span>Entry point</span>
        <select
          value={entryNode}
          onChange={(e) => onEntryChange(e.target.value)}
          disabled={disabled}
          title={scenarios.sources[entryNode] || entryNode}
        >
          {availableEntries.map(([id, desc]) => (
            <option key={id} value={id}>
              {desc}
            </option>
          ))}
        </select>
      </label>
      <span className="scenario-selector__arrow">→</span>
      <label>
        <span>End goal</span>
        <select
          value={targetNode}
          onChange={(e) => onTargetChange(e.target.value)}
          disabled={disabled}
          title={scenarios.destinations[targetNode] || targetNode}
        >
          {availableTargets.map(([id, desc]) => (
            <option key={id} value={id}>
              {desc}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

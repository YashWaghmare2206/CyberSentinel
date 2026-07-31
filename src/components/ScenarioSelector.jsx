import { COMMON_ENTRY_POINTS, COMMON_END_GOALS, getNode } from "../data/graphEngine";
import "./ScenarioSelector.css";

export default function ScenarioSelector({
  entryNode,
  targetNode,
  onEntryChange,
  onTargetChange,
  disabled,
}) {
  return (
    <div className="scenario-selector">
      <label>
        <span>Entry point</span>
        <select value={entryNode} onChange={(e) => onEntryChange(e.target.value)} disabled={disabled}>
          {Object.entries(COMMON_ENTRY_POINTS).map(([id, desc]) => (
            <option key={id} value={id}>
              {getNode(id)?.name ?? id} — {desc}
            </option>
          ))}
        </select>
      </label>
      <span className="scenario-selector__arrow">→</span>
      <label>
        <span>End goal</span>
        <select value={targetNode} onChange={(e) => onTargetChange(e.target.value)} disabled={disabled}>
          {Object.entries(COMMON_END_GOALS).map(([id, desc]) => (
            <option key={id} value={id}>
              {getNode(id)?.name ?? id} — {desc}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

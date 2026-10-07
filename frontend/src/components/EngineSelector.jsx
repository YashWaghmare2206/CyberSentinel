import React from "react";
import "./EngineSelector.css";

export default function EngineSelector({
  algorithm,
  onAlgorithmChange,
  weightingMode,
  onWeightingModeChange,
  pignnConfidence,
  disabled,
}) {
  return (
    <div className="engine-selector">
      <label>
        <span>Path Engine</span>
        <select
          value={algorithm}
          onChange={(e) => onAlgorithmChange(e.target.value)}
          disabled={disabled}
          className="engine-selector__select--algo"
        >
          <option value="pignn">⚡ Physics-Informed GNN (PIGNN)</option>
          <option value="dijkstra">Dijkstra (Shortest Path)</option>
          <option value="astar">A* Heuristic Search</option>
        </select>
      </label>

      <label>
        <span>Risk Model</span>
        <select
          value={weightingMode}
          onChange={(e) => onWeightingModeChange(e.target.value)}
          disabled={disabled}
        >
          <option value="dwm">DWM Contextual (Dynamic)</option>
          <option value="static">Static NVD CVSS</option>
        </select>
      </label>

      {algorithm === "pignn" && pignnConfidence != null && (
        <div className="pignn-confidence-chip" title="Geometric-mean path confidence calculated by PIGNN">
          <span className="pignn-confidence-chip__label">CONFIDENCE</span>
          <span className="pignn-confidence-chip__val">{pignnConfidence}%</span>
        </div>
      )}
    </div>
  );
}

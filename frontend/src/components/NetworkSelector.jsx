import React from "react";
import { NETWORKS_LIST } from "../data/graphEngine";
import "./NetworkSelector.css";

export default function NetworkSelector({ networkId, onNetworkChange, disabled }) {
  return (
    <div className="network-selector">
      <label>
        <span className="network-selector__label">Network Topology</span>
        <select
          value={networkId}
          onChange={(e) => onNetworkChange(e.target.value)}
          disabled={disabled}
          className="network-selector__select"
        >
          {NETWORKS_LIST.map((net) => (
            <option key={net.id} value={net.id}>
              {net.name} ({net.desc.split("·")[0].trim()})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

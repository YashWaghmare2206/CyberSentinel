import React from "react";
import "./PlaybackControls.css";

/**
 * PlaybackControls — Floating HUD Transport Controls for 3D Simulation
 * Allows presenters and operators to pause, step, adjust speed, and manage host isolation.
 */
export default function PlaybackControls({
  isPlaying,
  onTogglePlay,
  onPrevHop,
  onNextHop,
  speed,
  onSpeedChange,
  currentHop,
  totalHops,
  isolatedCount = 0,
  onClearIsolation,
  status,
  STATUS,
}) {
  const isSimulating = status === STATUS?.SIMULATING || status === STATUS?.COMPLETE;

  return (
    <div className="playback-controls-hud">
      <div className="playback-controls__group">
        <button
          type="button"
          className="playback-btn"
          onClick={onPrevHop}
          disabled={!isSimulating || currentHop <= 1}
          title="Step to Previous Hop"
        >
          ⏮
        </button>

        <button
          type="button"
          className={`playback-btn playback-btn--primary ${isPlaying ? "is-playing" : ""}`}
          onClick={onTogglePlay}
          disabled={!isSimulating}
          title={isPlaying ? "Pause Simulation" : "Resume / Play Simulation"}
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>

        <button
          type="button"
          className="playback-btn"
          onClick={onNextHop}
          disabled={!isSimulating || (totalHops > 0 && currentHop >= totalHops)}
          title="Step to Next Hop"
        >
          ⏭
        </button>
      </div>

      {totalHops > 0 && (
        <div className="playback-controls__counter" title="Current compromised hop">
          Hop <span className="counter-val">{currentHop}</span> / {totalHops}
        </div>
      )}

      <div className="playback-controls__speed">
        {[0.5, 1, 2].map((s) => (
          <button
            key={s}
            type="button"
            className={`speed-pill ${speed === s ? "is-active" : ""}`}
            onClick={() => onSpeedChange && onSpeedChange(s)}
            title={`Set playback speed to ${s}x`}
          >
            {s}x
          </button>
        ))}
      </div>

      {isolatedCount > 0 && (
        <div className="playback-controls__quarantine">
          <span className="quarantine-badge" title="Quarantined hosts active in sandbox">
            🛡️ {isolatedCount} Isolated
          </span>
          <button
            type="button"
            className="quarantine-clear-btn"
            onClick={onClearIsolation}
            title="Restore all isolated hosts to the network"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

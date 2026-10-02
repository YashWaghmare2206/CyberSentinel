import "./PathList.css";

/**
 * PathList — Top-K Ranked Alternative Attack Paths
 * Allows user to inspect alternative kill chains and switch between them.
 */
export default function PathList({ rankedPaths, pathIndex, onSelect, status, STATUS }) {
  if (!rankedPaths || !Array.isArray(rankedPaths) || rankedPaths.length <= 1) {
    return null;
  }

  const isBusy = status === STATUS?.SIMULATING || status === STATUS?.FIXING;

  return (
    <div className="path-list">
      <div className="path-list__header">
        <span className="path-list__tag">ALT ROUTES</span>
        <span className="path-list__title">Ranked Attack Paths ({rankedPaths.length} Discovered)</span>
      </div>
      <div className="path-list__items">
        {rankedPaths.map((p, i) => {
          const isSelected = i === (pathIndex ?? 0);
          const isOptimal = p.is_optimal || i === 0;
          return (
            <button
              key={`path-${i}`}
              type="button"
              className={`path-chip ${isSelected ? "is-active" : ""} ${isOptimal ? "is-optimal" : ""}`}
              onClick={() => onSelect && onSelect(i)}
              disabled={isBusy}
              title={`Kill chain: ${p.path ? p.path.join(" → ") : `${p.total_hops} hops`}`}
            >
              <div className="path-chip__top">
                <span className="path-chip__rank">
                  {isOptimal ? "★ OPTIMAL" : `ROUTE #${i + 1}`}
                </span>
                {isSelected && <span className="path-chip__indicator">ACTIVE</span>}
              </div>
              <div className="path-chip__meta">
                <span className="path-chip__hops">{p.total_hops} hops</span>
                <span className="path-chip__dot">·</span>
                <span className="path-chip__weight">Total: {Number(p.total_weight).toFixed(2)}</span>
                {p.pignn_confidence && (
                  <>
                    <span className="path-chip__dot">·</span>
                    <span className="path-chip__weight" style={{color: '#ffb000'}}>
                      PIGNN: {Number(p.pignn_confidence).toFixed(1)}%
                    </span>
                  </>
                )}
                {p.diversity_score !== undefined && (
                  <>
                    <span className="path-chip__dot">·</span>
                    <span className="path-chip__weight" style={{color: '#58a6ff'}}>
                      Diversity: {(p.diversity_score * 100).toFixed(0)}%
                    </span>
                  </>
                )}
              </div>

              {/* Hop weight chain — only show for selected path or on hover */}
              {p.hop_weights && p.hop_weights.length > 0 && (
                <div className="path-chip__hop-chain">
                  {p.hop_weights.map((hw, idx) => (
                    <span key={idx} className="path-chip__hop-item">
                      <span className="path-chip__hop-node" title={`CVSS: ${hw.cvss}`}>
                        {hw.from_node.replace(/_/g, ' ')}
                      </span>
                      <span className="path-chip__hop-weight">[{hw.weight}]</span>
                      <span className="path-chip__hop-arrow">→</span>
                    </span>
                  ))}
                  <span className="path-chip__hop-node">{p.hop_weights[p.hop_weights.length - 1]?.to_node?.replace(/_/g, ' ')}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

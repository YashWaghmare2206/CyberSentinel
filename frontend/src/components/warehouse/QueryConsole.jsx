import { useState } from "react";
import { executeWarehouseQuery } from "../../api/warehouse";

export default function QueryConsole() {
  const [sql, setSql] = useState(
    "SELECT simulation_id, entry_node_id, target_node_id, total_weight\nFROM `{dataset}.fact_cyber_risk`\nWHERE observation_type = 'ATTACK_PATH' AND path_rank = 1\nLIMIT 10"
  );
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleRun() {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const data = await executeWarehouseQuery(sql);
      if (data.success) {
        setResults(data.results);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="warehouse-panel query-console">
      <h3>SQL Query Console (Read-Only)</h3>
      <textarea
        className="sql-editor"
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        rows={6}
      />
      <div className="query-actions">
        <button className="btn-run-sql" onClick={handleRun} disabled={loading}>
          {loading ? "Running..." : "Run Query"}
        </button>
      </div>
      
      {error && <div className="query-error">{error}</div>}
      
      {results && results.length > 0 && (
        <div className="query-results-wrapper">
          <table className="warehouse-table">
            <thead>
              <tr>
                {Object.keys(results[0]).map(key => <th key={key}>{key}</th>)}
              </tr>
            </thead>
            <tbody>
              {results.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => <td key={j}>{String(val)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {results && results.length === 0 && <div>Query returned 0 rows.</div>}
    </div>
  );
}

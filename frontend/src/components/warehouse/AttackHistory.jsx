import { useEffect, useState } from "react";
import { fetchAttackHistory } from "../../api/warehouse";

export default function AttackHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchAttackHistory().then(setHistory).catch(console.error);
  }, []);

  return (
    <div className="warehouse-panel">
      <h3>Historical Simulations</h3>
      <table className="warehouse-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Simulation ID</th>
            <th>Entry</th>
            <th>Target</th>
            <th>Optimal Hops</th>
            <th>Total Risk Weight</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 && <tr><td colSpan="6">No historical data found.</td></tr>}
          {history.map((h, i) => (
            <tr key={i}>
              <td>{new Date(h.event_timestamp).toLocaleString()}</td>
              <td>{h.simulation_id}</td>
              <td>{h.entry_node_id}</td>
              <td>{h.target_node_id}</td>
              <td>{h.total_hops}</td>
              <td>{h.total_weight ? h.total_weight.toFixed(2) : 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

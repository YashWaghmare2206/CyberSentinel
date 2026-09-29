import { useEffect, useState } from "react";
import { fetchAttackPatterns } from "../../api/warehouse";

export default function AttackPatterns() {
  const [patterns, setPatterns] = useState([]);

  useEffect(() => {
    fetchAttackPatterns().then(setPatterns).catch(console.error);
  }, []);

  return (
    <div className="warehouse-panel">
      <h3>Frequent Pivot Infrastructure</h3>
      <p>These nodes frequently appear in the middle of successful attack paths.</p>
      <table className="warehouse-table">
        <thead>
          <tr>
            <th>Node Name</th>
            <th>Occurrences (Top Paths)</th>
          </tr>
        </thead>
        <tbody>
          {patterns.length === 0 && <tr><td colSpan="2">No pattern data found.</td></tr>}
          {patterns.map((p, i) => (
            <tr key={i}>
              <td>{p.node_name}</td>
              <td>{p.frequency}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

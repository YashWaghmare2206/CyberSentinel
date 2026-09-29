import { useEffect, useState } from "react";
import { fetchWarehouseSummary } from "../../api/warehouse";

export default function WarehouseSummary() {
  const [data, setData] = useState({ total_cves: 0, total_simulations: 0, high_risk_nodes: 0 });

  useEffect(() => {
    fetchWarehouseSummary().then(setData).catch(console.error);
  }, []);

  return (
    <div className="warehouse-summary">
      <div className="kpi-card">
        <h4>Tracked Vulnerabilities (CVEs)</h4>
        <div className="kpi-value">{data.total_cves}</div>
      </div>
      <div className="kpi-card">
        <h4>Attack Simulations Logged</h4>
        <div className="kpi-value">{data.total_simulations}</div>
      </div>
      <div className="kpi-card">
        <h4>High Risk Nodes (Risk &gt;= 9.0)</h4>
        <div className="kpi-value">{data.high_risk_nodes}</div>
      </div>
    </div>
  );
}

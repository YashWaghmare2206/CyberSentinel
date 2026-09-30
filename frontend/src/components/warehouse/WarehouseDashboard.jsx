import "./WarehouseDashboard.css";
import WarehouseSummary from "./WarehouseSummary";
import InteractiveSchemaVisualizer from "./InteractiveSchemaVisualizer";
import AttackPatterns from "./AttackPatterns";
import AttackHistory from "./AttackHistory";
import QueryConsole from "./QueryConsole";

export default function WarehouseDashboard() {
  return (
    <div className="warehouse-dashboard">
      <div className="warehouse-header">
        <h2>Security Intelligence Workspace</h2>
        <p>Data Mining & Analytics Powered by Google BigQuery</p>
      </div>
      
      <WarehouseSummary />
      
      <InteractiveSchemaVisualizer />
      
      <div className="warehouse-grid">
        <AttackPatterns />
        <QueryConsole />
      </div>
      
      <AttackHistory />
    </div>
  );
}

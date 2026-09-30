import { useState } from "react";
import "./InteractiveSchemaVisualizer.css";

const SCHEMA_DATA = {
  fact_cyber_risk: {
    name: "fact_cyber_risk",
    label: "Central Fact Table",
    type: "fact",
    accentColor: "#58a6ff",
    badge: "844 LIVE TUPLES",
    columns: [
      { name: "risk_fact_key", type: "INT64", key: "PK" },
      { name: "time_key", type: "INT64", key: "FK", target: "dim_time" },
      { name: "network_key", type: "INT64", key: "FK", target: "dim_network" },
      { name: "node_key", type: "INT64", key: "FK", target: "dim_node" },
      { name: "cve_key", type: "INT64", key: "FK", target: "dim_cve" },
      { name: "algorithm_key", type: "INT64", key: "FK", target: "dim_algorithm" },
      { name: "simulation_key", type: "INT64", key: "FK", target: "dim_simulation" },
      { name: "observation_type", type: "STRING" },
      { name: "simulation_id", type: "STRING" },
      { name: "hop_number", type: "INT64" },
      { name: "total_hops", type: "INT64" },
      { name: "base_cvss", type: "FLOAT64" },
      { name: "contextual_risk_score", type: "FLOAT64" },
      { name: "edge_weight", type: "FLOAT64" },
      { name: "kev_listed", type: "BOOL" },
      { name: "is_optimal", type: "BOOL" },
    ],
    sampleTuples: [
      { risk_fact_key: 8271049, time_key: 20260929, node_key: 84729103, cve_key: 98214130, hop_number: 1, base_cvss: 9.8, edge_weight: 0.2, is_optimal: true },
      { risk_fact_key: 8271050, time_key: 20260929, node_key: 19384720, cve_key: 71829401, hop_number: 2, base_cvss: 7.8, edge_weight: 1.5, is_optimal: true },
      { risk_fact_key: 8271051, time_key: 20260929, node_key: 92837411, cve_key: 10293847, hop_number: 4, base_cvss: 10.0, edge_weight: 0.1, is_optimal: true },
    ]
  },
  dim_time: {
    name: "dim_time",
    label: "Temporal Dimension",
    type: "dimension",
    accentColor: "#3fb950",
    badge: "TIME HIERARCHY",
    columns: [
      { name: "time_key", type: "INT64", key: "PK" },
      { name: "full_date", type: "DATE" },
      { name: "day", type: "INT64" },
      { name: "month", type: "INT64" },
      { name: "quarter", type: "INT64" },
      { name: "year", type: "INT64" },
    ],
    sampleTuples: [
      { time_key: 20260929, full_date: "2026-09-29", month: 9, quarter: 3, year: 2026 },
      { time_key: 20260928, full_date: "2026-09-28", month: 9, quarter: 3, year: 2026 },
    ]
  },
  dim_node: {
    name: "dim_node",
    label: "Assets & Servers",
    type: "dimension",
    accentColor: "#bc8cff",
    badge: "58 ASSETS",
    columns: [
      { name: "node_key", type: "INT64", key: "PK" },
      { name: "network_key", type: "INT64", key: "FK", target: "dim_network" },
      { name: "node_id", type: "STRING" },
      { name: "name", type: "STRING" },
      { name: "type", type: "STRING" },
      { name: "exposure", type: "STRING" },
      { name: "software", type: "STRING" },
    ],
    sampleTuples: [
      { node_key: 84729103, node_id: "api_gw_1", name: "Public API Gateway 1", exposure: "public", software: "Apache 2.4.49" },
      { node_key: 19384720, node_id: "jump_host_dmz", name: "DMZ Bastion Host", exposure: "internal", software: "OpenSSH 8.2p1" },
      { node_key: 92837411, node_id: "swift_term_01", name: "SWIFT Wire Terminal", exposure: "restricted", software: "SWIFT 7.4" },
    ]
  },
  dim_cve: {
    name: "dim_cve",
    label: "Vulnerability Catalog",
    type: "dimension",
    accentColor: "#f85149",
    badge: "NVD & CISA KEV",
    columns: [
      { name: "cve_key", type: "INT64", key: "PK" },
      { name: "cve_id", type: "STRING" },
      { name: "description", type: "STRING" },
      { name: "severity", type: "STRING" },
      { name: "published_date", type: "TIMESTAMP" },
      { name: "cvss_base", type: "FLOAT64" },
    ],
    sampleTuples: [
      { cve_key: 98214130, cve_id: "CVE-2021-41773", severity: "CRITICAL", cvss_base: 9.8 },
      { cve_key: 71829401, cve_id: "CVE-2023-38606", severity: "HIGH", cvss_base: 7.8 },
      { cve_key: 10293847, cve_id: "CVE-2020-1472", severity: "CRITICAL", cvss_base: 10.0 },
    ]
  },
  dim_algorithm: {
    name: "dim_algorithm",
    label: "Pathfinding Engines",
    type: "dimension",
    accentColor: "#d29922",
    badge: "AI & GRAPH",
    columns: [
      { name: "algorithm_key", type: "INT64", key: "PK" },
      { name: "algorithm_name", type: "STRING" },
      { name: "implementation_version", type: "STRING" },
    ],
    sampleTuples: [
      { algorithm_key: 1003, algorithm_name: "PIGNN PyTorch", implementation_version: "v2.0" },
      { algorithm_key: 1001, algorithm_name: "Top-K Dijkstra", implementation_version: "NetworkX 3.2" },
      { algorithm_key: 1002, algorithm_name: "A* Search", implementation_version: "v1.2" },
    ]
  },
  dim_simulation: {
    name: "dim_simulation",
    label: "Simulation Runs",
    type: "dimension",
    accentColor: "#58a6ff",
    badge: "RUN AUDIT",
    columns: [
      { name: "simulation_key", type: "INT64", key: "PK" },
      { name: "simulation_id", type: "STRING" },
      { name: "started_at", type: "TIMESTAMP" },
      { name: "network", type: "STRING" },
      { name: "entry", type: "STRING" },
      { name: "target", type: "STRING" },
      { name: "status", type: "STRING" },
    ],
    sampleTuples: [
      { simulation_key: 7482910, simulation_id: "SIM-20260929121500", entry: "api_gw_1", target: "swift_term_01", status: "SUCCESS" },
      { simulation_key: 7482911, simulation_id: "SIM-20260929122045", entry: "api_gw_1", target: "swift_term_01", status: "SUCCESS" },
    ]
  },
  dim_network: {
    name: "dim_network",
    label: "Network Topologies",
    type: "dimension",
    accentColor: "#3fb950",
    badge: "TOPOLOGIES",
    columns: [
      { name: "network_key", type: "INT64", key: "PK" },
      { name: "network_id", type: "STRING" },
      { name: "name", type: "STRING" },
      { name: "node_count", type: "INT64" },
    ],
    sampleTuples: [
      { network_key: 48291044, network_id: "enterprise-bank", name: "Global Retail Core", node_count: 47 },
      { network_key: 71920431, network_id: "small-branch-bank", name: "Branch Office", node_count: 10 },
    ]
  }
};

export default function InteractiveSchemaVisualizer() {
  const [activeTable, setActiveTable] = useState("fact_cyber_risk");
  const [hoveredTarget, setHoveredTarget] = useState(null);
  const [viewMode, setViewMode] = useState("schema"); // "schema" | "tuples"

  const selectedData = SCHEMA_DATA[activeTable] || SCHEMA_DATA.fact_cyber_risk;

  return (
    <div className="schema-viz-container">
      {/* Visual Control Header */}
      <div className="schema-viz-header">
        <div className="schema-viz-title-box">
          <span className="schema-pill">Interactive Star Schema Diagram</span>
          <h2>Google BigQuery Dimensional ERD</h2>
        </div>

        {/* View Mode Switcher: Schema Keys vs Live Tuples */}
        <div className="schema-mode-toggle">
          <button
            type="button"
            className={`mode-btn ${viewMode === "schema" ? "active" : ""}`}
            onClick={() => setViewMode("schema")}
          >
            📐 Column & Key Types
          </button>
          <button
            type="button"
            className={`mode-btn ${viewMode === "tuples" ? "active" : ""}`}
            onClick={() => setViewMode("tuples")}
          >
            📊 Live Database Tuples
          </button>
        </div>
      </div>

      {/* Main Interactive Diagram Canvas */}
      <div className="schema-viz-stage">
        {/* SVG Relationship Connector Lines */}
        <svg className="schema-svg-overlay">
          <defs>
            <linearGradient id="wire-glow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#58a6ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#bc8cff" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Central Fact Lines connecting to Outer Dimensions */}
          <line
            x1="50%" y1="50%" x2="15%" y2="18%"
            className={`schema-wire ${hoveredTarget === "dim_time" || activeTable === "dim_time" ? "active" : ""}`}
          />
          <line
            x1="50%" y1="50%" x2="50%" y2="12%"
            className={`schema-wire ${hoveredTarget === "dim_network" || activeTable === "dim_network" ? "active" : ""}`}
          />
          <line
            x1="50%" y1="50%" x2="85%" y2="18%"
            className={`schema-wire ${hoveredTarget === "dim_node" || activeTable === "dim_node" ? "active" : ""}`}
          />
          <line
            x1="50%" y1="50%" x2="15%" y2="82%"
            className={`schema-wire ${hoveredTarget === "dim_cve" || activeTable === "dim_cve" ? "active" : ""}`}
          />
          <line
            x1="50%" y1="50%" x2="50%" y2="88%"
            className={`schema-wire ${hoveredTarget === "dim_algorithm" || activeTable === "dim_algorithm" ? "active" : ""}`}
          />
          <line
            x1="50%" y1="50%" x2="85%" y2="82%"
            className={`schema-wire ${hoveredTarget === "dim_simulation" || activeTable === "dim_simulation" ? "active" : ""}`}
          />
        </svg>

        {/* TOP ROW DIMENSIONS */}
        <div className="schema-row schema-row--top">
          {/* dim_time */}
          <div
            className={`schema-node-card dim ${activeTable === "dim_time" ? "active" : ""}`}
            onClick={() => setActiveTable("dim_time")}
          >
            <div className="node-card-header green">
              <span className="node-icon">⏰</span>
              <div>
                <strong>dim_time</strong>
                <span className="node-sub">Temporal</span>
              </div>
            </div>
            {viewMode === "schema" ? (
              <div className="node-cols-mini">
                <div className="col-pill pk">time_key [PK]</div>
                <div className="col-pill">full_date</div>
                <div className="col-pill">quarter, year</div>
              </div>
            ) : (
              <div className="node-tuples-mini">
                <div>2026-09-29 | Q3 2026</div>
                <div>2026-09-28 | Q3 2026</div>
              </div>
            )}
          </div>

          {/* dim_network */}
          <div
            className={`schema-node-card dim ${activeTable === "dim_network" ? "active" : ""}`}
            onClick={() => setActiveTable("dim_network")}
          >
            <div className="node-card-header green">
              <span className="node-icon">🌐</span>
              <div>
                <strong>dim_network</strong>
                <span className="node-sub">Topologies</span>
              </div>
            </div>
            {viewMode === "schema" ? (
              <div className="node-cols-mini">
                <div className="col-pill pk">network_key [PK]</div>
                <div className="col-pill">network_id</div>
                <div className="col-pill">node_count (47)</div>
              </div>
            ) : (
              <div className="node-tuples-mini">
                <div>enterprise-bank (47)</div>
                <div>small-branch (10)</div>
              </div>
            )}
          </div>

          {/* dim_node */}
          <div
            className={`schema-node-card dim ${activeTable === "dim_node" ? "active" : ""}`}
            onClick={() => setActiveTable("dim_node")}
          >
            <div className="node-card-header purple">
              <span className="node-icon">🖥️</span>
              <div>
                <strong>dim_node</strong>
                <span className="node-sub">58 Assets</span>
              </div>
            </div>
            {viewMode === "schema" ? (
              <div className="node-cols-mini">
                <div className="col-pill pk">node_key [PK]</div>
                <div className="col-pill fk">network_key [FK]</div>
                <div className="col-pill">exposure, software</div>
              </div>
            ) : (
              <div className="node-tuples-mini">
                <div>api_gw_1 | Apache 2.4</div>
                <div>jump_host | OpenSSH</div>
                <div>swift_term | Port 9000</div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER ROW: CENTRAL FACT TABLE */}
        <div className="schema-row schema-row--center">
          <div
            className={`schema-node-card fact ${activeTable === "fact_cyber_risk" ? "active" : ""}`}
            onClick={() => setActiveTable("fact_cyber_risk")}
          >
            <div className="node-card-header blue">
              <span className="node-icon">⭐</span>
              <div>
                <strong className="fact-title">fact_cyber_risk</strong>
                <span className="fact-badge">CENTRAL FACT TABLE • 844 ROWS</span>
              </div>
            </div>

            {viewMode === "schema" ? (
              <div className="fact-cols-grid">
                <div className="fact-col-section">
                  <span className="fact-sec-title">Foreign Key Links</span>
                  <div
                    className="col-pill fk"
                    onMouseEnter={() => setHoveredTarget("dim_time")}
                    onMouseLeave={() => setHoveredTarget(null)}
                  >
                    time_key [FK ➔ dim_time]
                  </div>
                  <div
                    className="col-pill fk"
                    onMouseEnter={() => setHoveredTarget("dim_network")}
                    onMouseLeave={() => setHoveredTarget(null)}
                  >
                    network_key [FK ➔ dim_network]
                  </div>
                  <div
                    className="col-pill fk"
                    onMouseEnter={() => setHoveredTarget("dim_node")}
                    onMouseLeave={() => setHoveredTarget(null)}
                  >
                    node_key [FK ➔ dim_node]
                  </div>
                  <div
                    className="col-pill fk"
                    onMouseEnter={() => setHoveredTarget("dim_cve")}
                    onMouseLeave={() => setHoveredTarget(null)}
                  >
                    cve_key [FK ➔ dim_cve]
                  </div>
                  <div
                    className="col-pill fk"
                    onMouseEnter={() => setHoveredTarget("dim_algorithm")}
                    onMouseLeave={() => setHoveredTarget(null)}
                  >
                    algorithm_key [FK ➔ dim_algorithm]
                  </div>
                </div>

                <div className="fact-col-section">
                  <span className="fact-sec-title">Facts & Measures</span>
                  <div className="col-pill measure">base_cvss (0.0 - 10.0)</div>
                  <div className="col-pill measure">contextual_risk_score</div>
                  <div className="col-pill measure">edge_weight (Resistance)</div>
                  <div className="col-pill measure">hop_number / total_hops</div>
                  <div className="col-pill measure">is_optimal [BOOL]</div>
                </div>
              </div>
            ) : (
              <div className="fact-tuples-grid">
                <table className="mini-tuple-table">
                  <thead>
                    <tr>
                      <th>hop#</th>
                      <th>node_key</th>
                      <th>CVSS</th>
                      <th>Weight</th>
                      <th>Optimal?</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>84729103 (api_gw)</td>
                      <td className="text-red">9.8</td>
                      <td>0.20</td>
                      <td>TRUE</td>
                    </tr>
                    <tr>
                      <td>2</td>
                      <td>19384720 (jump_host)</td>
                      <td className="text-amber">7.8</td>
                      <td>1.50</td>
                      <td>TRUE</td>
                    </tr>
                    <tr>
                      <td>3</td>
                      <td>67192843 (db_proxy)</td>
                      <td className="text-red">9.8</td>
                      <td>0.80</td>
                      <td>TRUE</td>
                    </tr>
                    <tr>
                      <td>4</td>
                      <td>92837411 (swift_term)</td>
                      <td className="text-red">10.0</td>
                      <td>0.10</td>
                      <td>TRUE</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ROW DIMENSIONS */}
        <div className="schema-row schema-row--bottom">
          {/* dim_cve */}
          <div
            className={`schema-node-card dim ${activeTable === "dim_cve" ? "active" : ""}`}
            onClick={() => setActiveTable("dim_cve")}
          >
            <div className="node-card-header red">
              <span className="node-icon">🐛</span>
              <div>
                <strong>dim_cve</strong>
                <span className="node-sub">CVE Catalog</span>
              </div>
            </div>
            {viewMode === "schema" ? (
              <div className="node-cols-mini">
                <div className="col-pill pk">cve_key [PK]</div>
                <div className="col-pill">cve_id, severity</div>
                <div className="col-pill">cvss_base (FLOAT)</div>
              </div>
            ) : (
              <div className="node-tuples-mini">
                <div>CVE-2021-41773 | 9.8</div>
                <div>CVE-2023-38606 | 7.8</div>
                <div>CVE-2020-1472  | 10.0</div>
              </div>
            )}
          </div>

          {/* dim_algorithm */}
          <div
            className={`schema-node-card dim ${activeTable === "dim_algorithm" ? "active" : ""}`}
            onClick={() => setActiveTable("dim_algorithm")}
          >
            <div className="node-card-header amber">
              <span className="node-icon">🧠</span>
              <div>
                <strong>dim_algorithm</strong>
                <span className="node-sub">Solvers</span>
              </div>
            </div>
            {viewMode === "schema" ? (
              <div className="node-cols-mini">
                <div className="col-pill pk">algorithm_key [PK]</div>
                <div className="col-pill">algorithm_name</div>
                <div className="col-pill">version (v2.0)</div>
              </div>
            ) : (
              <div className="node-tuples-mini">
                <div>PIGNN PyTorch (v2.0)</div>
                <div>Top-K Dijkstra (3.2)</div>
                <div>A* Search (v1.2)</div>
              </div>
            )}
          </div>

          {/* dim_simulation */}
          <div
            className={`schema-node-card dim ${activeTable === "dim_simulation" ? "active" : ""}`}
            onClick={() => setActiveTable("dim_simulation")}
          >
            <div className="node-card-header blue">
              <span className="node-icon">🏃</span>
              <div>
                <strong>dim_simulation</strong>
                <span className="node-sub">Run Context</span>
              </div>
            </div>
            {viewMode === "schema" ? (
              <div className="node-cols-mini">
                <div className="col-pill pk">simulation_key [PK]</div>
                <div className="col-pill">simulation_id</div>
                <div className="col-pill">entry, target, status</div>
              </div>
            ) : (
              <div className="node-tuples-mini">
                <div>SIM-20260929121500</div>
                <div>api_gw ➔ swift_term</div>
                <div>Status: SUCCESS</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Inspector Drawer (Click any table to inspect all columns & types) */}
      <div className="schema-inspector">
        <div className="inspector-badge" style={{ color: selectedData.accentColor }}>
          SELECTED TABLE INSPECTION
        </div>
        <div className="inspector-header">
          <h3>
            <code>{selectedData.name}</code> ({selectedData.label})
          </h3>
          <span className="inspector-tag">{selectedData.badge}</span>
        </div>

        <div className="inspector-columns-grid">
          {selectedData.columns.map((col) => (
            <div key={col.name} className="inspector-col-item">
              <div className="inspector-col-name">
                {col.key && <span className={`key-tag ${col.key.toLowerCase()}`}>{col.key}</span>}
                <strong>{col.name}</strong>
              </div>
              <div className="inspector-col-meta">
                <span className="col-type">{col.type}</span>
                {col.target && <span className="col-target">➔ {col.target}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

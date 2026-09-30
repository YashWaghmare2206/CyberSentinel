import { useState } from "react";
import "./InteractiveSchemaVisualizer.css";

const SCHEMA_DATA = {
  fact_cyber_risk: {
    name: "fact_cyber_risk",
    label: "Central Fact Table",
    type: "fact",
    accentColor: "#58a6ff",
    badge: "844 OBSERVATIONS • 23 ATTRIBUTES",
    columns: [
      { name: "risk_fact_key", type: "INT64", key: "PK", desc: "Surrogate key for observation" },
      { name: "time_key", type: "INT64", key: "FK", target: "dim_time", desc: "FK to temporal dimension" },
      { name: "network_key", type: "INT64", key: "FK", target: "dim_network", desc: "FK to network environment" },
      { name: "node_key", type: "INT64", key: "FK", target: "dim_node", desc: "FK to infrastructure asset" },
      { name: "cve_key", type: "INT64", key: "FK", target: "dim_cve", desc: "FK to vulnerability catalog" },
      { name: "algorithm_key", type: "INT64", key: "FK", target: "dim_algorithm", desc: "FK to pathfinding algorithm" },
      { name: "weighting_key", type: "INT64", key: "FK", target: "dim_weighting", desc: "FK to DWM risk model" },
      { name: "simulation_key", type: "INT64", key: "FK", target: "dim_simulation", desc: "FK to simulation run context" },
      { name: "observation_type", type: "STRING", desc: "BASELINE_VULNERABILITY or ATTACK_PATH" },
      { name: "simulation_id", type: "STRING", desc: "Unique simulation run string ID" },
      { name: "path_id", type: "STRING", desc: "Identifier for ranked path" },
      { name: "entry_node_id", type: "STRING", desc: "Starting entry point node ID" },
      { name: "target_node_id", type: "STRING", desc: "Target high-value node ID" },
      { name: "path_rank", type: "INT64", desc: "Ordinal rank of path (1 = top path)" },
      { name: "is_optimal", type: "BOOL", desc: "TRUE if lowest resistance path" },
      { name: "hop_number", type: "INT64", desc: "Step number along attack chain" },
      { name: "total_hops", type: "INT64", desc: "Total nodes traversed in path" },
      { name: "total_weight", type: "FLOAT64", desc: "Cumulative resistance of path" },
      { name: "base_cvss", type: "FLOAT64", desc: "Baseline CVSS 0.0 - 10.0 score" },
      { name: "contextual_risk_score", type: "FLOAT64", desc: "Calculated DWM risk score" },
      { name: "edge_weight", type: "FLOAT64", desc: "Hop traversal resistance" },
      { name: "kev_listed", type: "BOOL", desc: "CISA Known Exploited flag" },
      { name: "patch_available", type: "BOOL", desc: "Software fix available flag" },
      { name: "days_since_published", type: "INT64", desc: "Vulnerability age in days" },
      { name: "remediation_status", type: "STRING", desc: "OPEN, IN_PROGRESS, RESOLVED" },
      { name: "remediation_priority", type: "STRING", desc: "CRITICAL, HIGH, MEDIUM" },
      { name: "event_timestamp", type: "TIMESTAMP", desc: "Exact recording timestamp" },
    ],
    sampleTuples: [
      { risk_fact_key: 8271049, time_key: 20260929, node_key: 84729103, cve_key: 98214130, weighting_key: 2002, hop_number: 1, base_cvss: 9.8, edge_weight: 0.20, kev_listed: true, is_optimal: true },
      { risk_fact_key: 8271050, time_key: 20260929, node_key: 19384720, cve_key: 71829401, weighting_key: 2002, hop_number: 2, base_cvss: 7.8, edge_weight: 1.50, kev_listed: true, is_optimal: true },
      { risk_fact_key: 8271051, time_key: 20260929, node_key: 67192843, cve_key: 44910294, weighting_key: 2002, hop_number: 3, base_cvss: 9.8, edge_weight: 0.80, kev_listed: false, is_optimal: true },
      { risk_fact_key: 8271052, time_key: 20260929, node_key: 92837411, cve_key: 10293847, weighting_key: 2002, hop_number: 4, base_cvss: 10.0, edge_weight: 0.10, kev_listed: true, is_optimal: true },
    ]
  },
  dim_time: {
    name: "dim_time",
    label: "Temporal Dimension",
    type: "dimension",
    accentColor: "#3fb950",
    badge: "7 ATTRIBUTES",
    columns: [
      { name: "time_key", type: "INT64", key: "PK", desc: "Surrogate key (YYYYMMDD)" },
      { name: "full_date", type: "DATE", desc: "Calendar date (YYYY-MM-DD)" },
      { name: "day", type: "INT64", desc: "Day of month (1-31)" },
      { name: "month", type: "INT64", desc: "Month number (1-12)" },
      { name: "quarter", type: "INT64", desc: "Calendar quarter (1-4)" },
      { name: "year", type: "INT64", desc: "Calendar year (e.g. 2026)" },
      { name: "week", type: "INT64", desc: "Week of year (1-52)" },
    ],
    sampleTuples: [
      { time_key: 20260929, full_date: "2026-09-29", day: 29, month: 9, quarter: 3, year: 2026, week: 40 },
      { time_key: 20260928, full_date: "2026-09-28", day: 28, month: 9, quarter: 3, year: 2026, week: 40 },
    ]
  },
  dim_network: {
    name: "dim_network",
    label: "Network Topologies",
    type: "dimension",
    accentColor: "#3fb950",
    badge: "5 ATTRIBUTES",
    columns: [
      { name: "network_key", type: "INT64", key: "PK", desc: "Surrogate key for topology" },
      { name: "network_id", type: "STRING", desc: "Unique slug identifier (enterprise-bank)" },
      { name: "name", type: "STRING", desc: "Descriptive enterprise name" },
      { name: "description", type: "STRING", desc: "Infrastructure architectural summary" },
      { name: "node_count", type: "INT64", desc: "Total asset count in network" },
    ],
    sampleTuples: [
      { network_key: 48291044, network_id: "enterprise-bank", name: "Global Retail Core", description: "47-node banking topology with DMZ & SWIFT", node_count: 47 },
      { network_key: 71920431, network_id: "small-branch-bank", name: "Regional Branch Office", description: "10-node teller branch network", node_count: 10 },
      { network_key: 38104829, network_id: "legacy-iot-bank", name: "Legacy ATM & IoT Network", description: "18-node ATM controller network", node_count: 18 },
    ]
  },
  dim_node: {
    name: "dim_node",
    label: "Infrastructure Assets",
    type: "dimension",
    accentColor: "#bc8cff",
    badge: "58 ASSETS • 7 ATTRIBUTES",
    columns: [
      { name: "node_key", type: "INT64", key: "PK", desc: "Surrogate key for machine" },
      { name: "network_key", type: "INT64", key: "FK", target: "dim_network", desc: "Parent network FK" },
      { name: "node_id", type: "STRING", desc: "Operational asset ID (api_gw_1)" },
      { name: "name", type: "STRING", desc: "Display label (Public API Gateway 1)" },
      { name: "type", type: "STRING", desc: "Server role (public, internal, target)" },
      { name: "exposure", type: "STRING", desc: "Perimeter level (public, internal, isolated)" },
      { name: "software", type: "STRING", desc: "OS or application package installed" },
    ],
    sampleTuples: [
      { node_key: 84729103, network_key: 48291044, node_id: "api_gw_1", name: "Public API Gateway 1", type: "public", exposure: "public", software: "Apache 2.4.49" },
      { node_key: 19384720, network_key: 48291044, node_id: "jump_host_dmz", name: "DMZ Bastion Host", type: "internal", exposure: "internal", software: "OpenSSH 8.2p1" },
      { node_key: 67192843, network_key: 48291044, node_id: "db_primary", name: "Core Transaction DB", type: "internal", exposure: "internal", software: "PostgreSQL 13.4" },
      { node_key: 92837411, network_key: 48291044, node_id: "swift_term_01", name: "SWIFT Wire Terminal", type: "target", exposure: "restricted", software: "SWIFT Alliance 7.4" },
    ]
  },
  dim_cve: {
    name: "dim_cve",
    label: "Vulnerability Catalog",
    type: "dimension",
    accentColor: "#f85149",
    badge: "NVD/CISA • 6 ATTRIBUTES",
    columns: [
      { name: "cve_key", type: "INT64", key: "PK", desc: "Surrogate key for vulnerability" },
      { name: "cve_id", type: "STRING", desc: "Standard CVE identifier" },
      { name: "description", type: "STRING", desc: "Detailed technical bug summary" },
      { name: "severity", type: "STRING", desc: "CRITICAL, HIGH, MEDIUM, LOW" },
      { name: "published_date", type: "TIMESTAMP", desc: "Public disclosure date" },
      { name: "cvss_base", type: "FLOAT64", desc: "Base vulnerability score (0.0 - 10.0)" },
    ],
    sampleTuples: [
      { cve_key: 98214130, cve_id: "CVE-2021-41773", description: "Path normalization flaw in Apache 2.4.49 allowing RCE", severity: "CRITICAL", published_date: "2021-10-05", cvss_base: 9.8 },
      { cve_key: 71829401, cve_id: "CVE-2023-38606", description: "Zero-day kernel privilege escalation in wild", severity: "HIGH", published_date: "2023-07-24", cvss_base: 7.8 },
      { cve_key: 44910294, cve_id: "CVE-2022-22965", description: "Spring4Shell RCE in Spring Framework", severity: "CRITICAL", published_date: "2022-04-01", cvss_base: 9.8 },
      { cve_key: 10293847, cve_id: "CVE-2020-1472", description: "Zerologon Netlogon elevation of privilege", severity: "CRITICAL", published_date: "2020-08-17", cvss_base: 10.0 },
    ]
  },
  dim_algorithm: {
    name: "dim_algorithm",
    label: "Pathfinding Engines",
    type: "dimension",
    accentColor: "#d29922",
    badge: "3 ATTRIBUTES",
    columns: [
      { name: "algorithm_key", type: "INT64", key: "PK", desc: "Surrogate key for algorithm" },
      { name: "algorithm_name", type: "STRING", desc: "Dijkstra, A*, or PIGNN PyTorch" },
      { name: "implementation_version", type: "STRING", desc: "Model architecture or code release" },
    ],
    sampleTuples: [
      { algorithm_key: 1003, algorithm_name: "PIGNN PyTorch", implementation_version: "Physics-Informed GNN v2.0" },
      { algorithm_key: 1001, algorithm_name: "Top-K Dijkstra", implementation_version: "NetworkX Yen Top-K v3.2" },
      { algorithm_key: 1002, algorithm_name: "A* Search", implementation_version: "Euclidean Risk Heuristic v1.2" },
    ]
  },
  dim_weighting: {
    name: "dim_weighting",
    label: "Risk Weighting Model",
    type: "dimension",
    accentColor: "#d29922",
    badge: "3 ATTRIBUTES",
    columns: [
      { name: "weighting_key", type: "INT64", key: "PK", desc: "Surrogate key for weighting strategy" },
      { name: "weighting_mode", type: "STRING", desc: "CVSS_ONLY, DYNAMIC_DWM, NEURAL_TENSOR" },
      { name: "description", type: "STRING", desc: "Mathematical threat formula definition" },
    ],
    sampleTuples: [
      { weighting_key: 2001, weighting_mode: "CVSS_ONLY", description: "Static unweighted CVSS base cost" },
      { weighting_key: 2002, weighting_mode: "DYNAMIC_DWM", description: "Dynamic Weight Management factoring CISA KEV & perimeter exposure" },
      { weighting_key: 2003, weighting_mode: "NEURAL_TENSOR", description: "Physics-based lateral movement flow tensor weights" },
    ]
  },
  dim_simulation: {
    name: "dim_simulation",
    label: "Simulation Context",
    type: "dimension",
    accentColor: "#58a6ff",
    badge: "12 ATTRIBUTES",
    columns: [
      { name: "simulation_key", type: "INT64", key: "PK", desc: "Surrogate key for run" },
      { name: "simulation_id", type: "STRING", desc: "Run string ID (SIM-YYYYMMDDHHMMSS)" },
      { name: "started_at", type: "TIMESTAMP", desc: "Execution start timestamp" },
      { name: "network", type: "STRING", desc: "Selected target network" },
      { name: "entry", type: "STRING", desc: "Selected entry node ID" },
      { name: "target", type: "STRING", desc: "Selected target node ID" },
      { name: "algorithm", type: "STRING", desc: "Selected pathfinding engine" },
      { name: "weighting", type: "STRING", desc: "Selected risk weighting strategy" },
      { name: "data_source", type: "STRING", desc: "NVD_LIVE, CISA_KEV, or MOCK" },
      { name: "llm_provider", type: "STRING", desc: "Groq, Gemini, or Claude" },
      { name: "llm_model", type: "STRING", desc: "e.g. llama3-70b-8192" },
      { name: "status", type: "STRING", desc: "SUCCESS, FAILED, RUNNING" },
    ],
    sampleTuples: [
      { simulation_key: 7482910, simulation_id: "SIM-20260929121500", started_at: "2026-09-29 12:15:00", network: "enterprise-bank", entry: "api_gw_1", target: "swift_term_01", algorithm: "pignn", weighting: "dwm", data_source: "NVD_LIVE", llm_provider: "groq", llm_model: "llama3-70b", status: "SUCCESS" },
      { simulation_key: 7482911, simulation_id: "SIM-20260929122045", started_at: "2026-09-29 12:20:45", network: "enterprise-bank", entry: "api_gw_1", target: "swift_term_01", algorithm: "dijkstra", weighting: "dwm", data_source: "NVD_LIVE", llm_provider: "groq", llm_model: "llama3-70b", status: "SUCCESS" },
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
      {/* Header */}
      <div className="schema-viz-header">
        <div className="schema-viz-title-box">
          <span className="schema-pill">Enterprise Data Warehouse • BigQuery Star Schema</span>
          <h2>Full Dimensional Architecture & Attribute Dictionary</h2>
          <p className="schema-subtitle">
            Hover over any foreign key to trace relationships. Click any table card to inspect all attributes and types.
          </p>
        </div>

        {/* View Switcher */}
        <div className="schema-mode-toggle">
          <button
            type="button"
            className={`mode-btn ${viewMode === "schema" ? "active" : ""}`}
            onClick={() => setViewMode("schema")}
          >
            📐 All Column Attributes & Types
          </button>
          <button
            type="button"
            className={`mode-btn ${viewMode === "tuples" ? "active" : ""}`}
            onClick={() => setViewMode("tuples")}
          >
            📊 Live Data Tuples
          </button>
        </div>
      </div>

      {/* Visual Canvas Stage */}
      <div className="schema-viz-stage">
        {/* SVG Relationship Connector Overlay */}
        <svg className="schema-svg-overlay">
          <line
            x1="50%" y1="48%" x2="16%" y2="15%"
            className={`schema-wire ${hoveredTarget === "dim_time" || activeTable === "dim_time" ? "active" : ""}`}
          />
          <line
            x1="50%" y1="48%" x2="50%" y2="15%"
            className={`schema-wire ${hoveredTarget === "dim_network" || activeTable === "dim_network" ? "active" : ""}`}
          />
          <line
            x1="50%" y1="48%" x2="84%" y2="15%"
            className={`schema-wire ${hoveredTarget === "dim_node" || activeTable === "dim_node" ? "active" : ""}`}
          />
          <line
            x1="50%" y1="52%" x2="14%" y2="85%"
            className={`schema-wire ${hoveredTarget === "dim_cve" || activeTable === "dim_cve" ? "active" : ""}`}
          />
          <line
            x1="50%" y1="52%" x2="38%" y2="85%"
            className={`schema-wire ${hoveredTarget === "dim_algorithm" || activeTable === "dim_algorithm" ? "active" : ""}`}
          />
          <line
            x1="50%" y1="52%" x2="62%" y2="85%"
            className={`schema-wire ${hoveredTarget === "dim_weighting" || activeTable === "dim_weighting" ? "active" : ""}`}
          />
          <line
            x1="50%" y1="52%" x2="86%" y2="85%"
            className={`schema-wire ${hoveredTarget === "dim_simulation" || activeTable === "dim_simulation" ? "active" : ""}`}
          />
        </svg>

        {/* TOP ROW: 3 DIMENSIONS */}
        <div className="schema-row schema-row--top">
          {/* dim_time */}
          <div
            className={`schema-card dim-card ${activeTable === "dim_time" ? "active" : ""}`}
            onClick={() => setActiveTable("dim_time")}
          >
            <div className="card-top-bar border-green">
              <span className="card-emoji">⏰</span>
              <div className="card-title-group">
                <span className="table-name">dim_time</span>
                <span className="table-badge">7 ATTRIBUTES</span>
              </div>
            </div>
            {viewMode === "schema" ? (
              <div className="card-attr-list">
                <div className="attr-row pk"><span className="tag pk">PK</span> time_key <span className="type">INT64</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> full_date <span className="type">DATE</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> day <span className="type">INT64</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> month <span className="type">INT64</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> quarter <span className="type">INT64</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> year <span className="type">INT64</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> week <span className="type">INT64</span></div>
              </div>
            ) : (
              <div className="card-tuples-preview">
                <div className="tuple-item">2026-09-29 • Q3 2026 • Week 40</div>
                <div className="tuple-item">2026-09-28 • Q3 2026 • Week 40</div>
              </div>
            )}
          </div>

          {/* dim_network */}
          <div
            className={`schema-card dim-card ${activeTable === "dim_network" ? "active" : ""}`}
            onClick={() => setActiveTable("dim_network")}
          >
            <div className="card-top-bar border-green">
              <span className="card-emoji">🌐</span>
              <div className="card-title-group">
                <span className="table-name">dim_network</span>
                <span className="table-badge">5 ATTRIBUTES</span>
              </div>
            </div>
            {viewMode === "schema" ? (
              <div className="card-attr-list">
                <div className="attr-row pk"><span className="tag pk">PK</span> network_key <span className="type">INT64</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> network_id <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> name <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> description <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> node_count <span className="type">INT64</span></div>
              </div>
            ) : (
              <div className="card-tuples-preview">
                <div className="tuple-item">enterprise-bank (47 nodes)</div>
                <div className="tuple-item">small-branch-bank (10 nodes)</div>
              </div>
            )}
          </div>

          {/* dim_node */}
          <div
            className={`schema-card dim-card ${activeTable === "dim_node" ? "active" : ""}`}
            onClick={() => setActiveTable("dim_node")}
          >
            <div className="card-top-bar border-purple">
              <span className="card-emoji">🖥️</span>
              <div className="card-title-group">
                <span className="table-name">dim_node</span>
                <span className="table-badge">58 ASSETS • 7 ATTRIBUTES</span>
              </div>
            </div>
            {viewMode === "schema" ? (
              <div className="card-attr-list">
                <div className="attr-row pk"><span className="tag pk">PK</span> node_key <span className="type">INT64</span></div>
                <div className="attr-row fk"><span className="tag fk">FK</span> network_key <span className="type">INT64</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> node_id <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> name <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> type <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> exposure <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> software <span className="type">STRING</span></div>
              </div>
            ) : (
              <div className="card-tuples-preview">
                <div className="tuple-item">api_gw_1 | Apache 2.4.49 | public</div>
                <div className="tuple-item">jump_host | OpenSSH 8.2 | internal</div>
                <div className="tuple-item">swift_term | SWIFT 7.4 | restricted</div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER: CENTRAL FACT TABLE */}
        <div className="schema-row schema-row--center">
          <div
            className={`schema-card fact-card ${activeTable === "fact_cyber_risk" ? "active" : ""}`}
            onClick={() => setActiveTable("fact_cyber_risk")}
          >
            <div className="card-top-bar border-blue">
              <span className="card-emoji">⭐</span>
              <div className="card-title-group">
                <span className="table-name fact-name">fact_cyber_risk</span>
                <span className="table-badge fact-badge">CENTRAL FACT TABLE • 844 ROWS • 27 ATTRIBUTES</span>
              </div>
            </div>

            {viewMode === "schema" ? (
              <div className="fact-sections-grid">
                {/* Section 1: Keys */}
                <div className="fact-section">
                  <div className="fact-sec-header">Primary & Foreign Keys</div>
                  <div className="attr-row pk"><span className="tag pk">PK</span> risk_fact_key <span className="type">INT64</span></div>
                  <div
                    className="attr-row fk"
                    onMouseEnter={() => setHoveredTarget("dim_time")}
                    onMouseLeave={() => setHoveredTarget(null)}
                  >
                    <span className="tag fk">FK</span> time_key ➔ dim_time <span className="type">INT64</span>
                  </div>
                  <div
                    className="attr-row fk"
                    onMouseEnter={() => setHoveredTarget("dim_network")}
                    onMouseLeave={() => setHoveredTarget(null)}
                  >
                    <span className="tag fk">FK</span> network_key ➔ dim_network <span className="type">INT64</span>
                  </div>
                  <div
                    className="attr-row fk"
                    onMouseEnter={() => setHoveredTarget("dim_node")}
                    onMouseLeave={() => setHoveredTarget(null)}
                  >
                    <span className="tag fk">FK</span> node_key ➔ dim_node <span className="type">INT64</span>
                  </div>
                  <div
                    className="attr-row fk"
                    onMouseEnter={() => setHoveredTarget("dim_cve")}
                    onMouseLeave={() => setHoveredTarget(null)}
                  >
                    <span className="tag fk">FK</span> cve_key ➔ dim_cve <span className="type">INT64</span>
                  </div>
                  <div
                    className="attr-row fk"
                    onMouseEnter={() => setHoveredTarget("dim_algorithm")}
                    onMouseLeave={() => setHoveredTarget(null)}
                  >
                    <span className="tag fk">FK</span> algorithm_key ➔ dim_algorithm <span className="type">INT64</span>
                  </div>
                  <div
                    className="attr-row fk"
                    onMouseEnter={() => setHoveredTarget("dim_weighting")}
                    onMouseLeave={() => setHoveredTarget(null)}
                  >
                    <span className="tag fk">FK</span> weighting_key ➔ dim_weighting <span className="type">INT64</span>
                  </div>
                  <div
                    className="attr-row fk"
                    onMouseEnter={() => setHoveredTarget("dim_simulation")}
                    onMouseLeave={() => setHoveredTarget(null)}
                  >
                    <span className="tag fk">FK</span> simulation_key ➔ dim_simulation <span className="type">INT64</span>
                  </div>
                </div>

                {/* Section 2: Degenerate / Context */}
                <div className="fact-section">
                  <div className="fact-sec-header">Degenerate Dimensions</div>
                  <div className="attr-row"><span className="tag degen">DEG</span> observation_type <span className="type">STRING</span></div>
                  <div className="attr-row"><span className="tag degen">DEG</span> simulation_id <span className="type">STRING</span></div>
                  <div className="attr-row"><span className="tag degen">DEG</span> path_id <span className="type">STRING</span></div>
                  <div className="attr-row"><span className="tag degen">DEG</span> entry_node_id <span className="type">STRING</span></div>
                  <div className="attr-row"><span className="tag degen">DEG</span> target_node_id <span className="type">STRING</span></div>
                  <div className="attr-row"><span className="tag degen">DEG</span> path_rank <span className="type">INT64</span></div>
                  <div className="attr-row"><span className="tag degen">DEG</span> is_optimal <span className="type">BOOL</span></div>
                  <div className="attr-row"><span className="tag degen">DEG</span> event_timestamp <span className="type">TIMESTAMP</span></div>
                </div>

                {/* Section 3: Measures */}
                <div className="fact-section">
                  <div className="fact-sec-header">Facts & Additive Measures</div>
                  <div className="attr-row measure"><span className="tag num">FACT</span> hop_number <span className="type">INT64</span></div>
                  <div className="attr-row measure"><span className="tag num">FACT</span> total_hops <span className="type">INT64</span></div>
                  <div className="attr-row measure"><span className="tag num">FACT</span> total_weight <span className="type">FLOAT64</span></div>
                  <div className="attr-row measure"><span className="tag num">FACT</span> base_cvss <span className="type">FLOAT64</span></div>
                  <div className="attr-row measure"><span className="tag num">FACT</span> contextual_risk_score <span className="type">FLOAT64</span></div>
                  <div className="attr-row measure"><span className="tag num">FACT</span> edge_weight <span className="type">FLOAT64</span></div>
                  <div className="attr-row measure"><span className="tag num">FACT</span> kev_listed <span className="type">BOOL</span></div>
                  <div className="attr-row measure"><span className="tag num">FACT</span> patch_available <span className="type">BOOL</span></div>
                </div>
              </div>
            ) : (
              <div className="fact-tuples-view">
                <table className="full-fact-table">
                  <thead>
                    <tr>
                      <th>hop#</th>
                      <th>node_key</th>
                      <th>cve_key</th>
                      <th>base_cvss</th>
                      <th>context_risk</th>
                      <th>edge_weight</th>
                      <th>kev_listed</th>
                      <th>is_optimal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>84729103 (api_gw)</td>
                      <td>98214130</td>
                      <td className="text-red">9.8</td>
                      <td className="text-red">9.8</td>
                      <td>0.20</td>
                      <td>TRUE</td>
                      <td>TRUE</td>
                    </tr>
                    <tr>
                      <td>2</td>
                      <td>19384720 (jump_host)</td>
                      <td>71829401</td>
                      <td className="text-amber">7.8</td>
                      <td className="text-amber">8.5</td>
                      <td>1.50</td>
                      <td>TRUE</td>
                      <td>TRUE</td>
                    </tr>
                    <tr>
                      <td>3</td>
                      <td>67192843 (db_primary)</td>
                      <td>44910294</td>
                      <td className="text-red">9.8</td>
                      <td className="text-red">9.2</td>
                      <td>0.80</td>
                      <td>FALSE</td>
                      <td>TRUE</td>
                    </tr>
                    <tr>
                      <td>4</td>
                      <td>92837411 (swift_term)</td>
                      <td>10293847</td>
                      <td className="text-red">10.0</td>
                      <td className="text-red">9.9</td>
                      <td>0.10</td>
                      <td>TRUE</td>
                      <td>TRUE</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ROW: 4 DIMENSIONS */}
        <div className="schema-row schema-row--bottom">
          {/* dim_cve */}
          <div
            className={`schema-card dim-card ${activeTable === "dim_cve" ? "active" : ""}`}
            onClick={() => setActiveTable("dim_cve")}
          >
            <div className="card-top-bar border-red">
              <span className="card-emoji">🐛</span>
              <div className="card-title-group">
                <span className="table-name">dim_cve</span>
                <span className="table-badge">6 ATTRIBUTES</span>
              </div>
            </div>
            {viewMode === "schema" ? (
              <div className="card-attr-list">
                <div className="attr-row pk"><span className="tag pk">PK</span> cve_key <span className="type">INT64</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> cve_id <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> description <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> severity <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> published_date <span className="type">TIMESTAMP</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> cvss_base <span className="type">FLOAT64</span></div>
              </div>
            ) : (
              <div className="card-tuples-preview">
                <div className="tuple-item">CVE-2021-41773 | CRITICAL | 9.8</div>
                <div className="tuple-item">CVE-2023-38606 | HIGH | 7.8</div>
              </div>
            )}
          </div>

          {/* dim_algorithm */}
          <div
            className={`schema-card dim-card ${activeTable === "dim_algorithm" ? "active" : ""}`}
            onClick={() => setActiveTable("dim_algorithm")}
          >
            <div className="card-top-bar border-amber">
              <span className="card-emoji">🧠</span>
              <div className="card-title-group">
                <span className="table-name">dim_algorithm</span>
                <span className="table-badge">3 ATTRIBUTES</span>
              </div>
            </div>
            {viewMode === "schema" ? (
              <div className="card-attr-list">
                <div className="attr-row pk"><span className="tag pk">PK</span> algorithm_key <span className="type">INT64</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> algorithm_name <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> implementation_version <span className="type">STRING</span></div>
              </div>
            ) : (
              <div className="card-tuples-preview">
                <div className="tuple-item">PIGNN PyTorch (v2.0 GNN)</div>
                <div className="tuple-item">Top-K Dijkstra (Yen Top-K 3.2)</div>
              </div>
            )}
          </div>

          {/* dim_weighting */}
          <div
            className={`schema-card dim-card ${activeTable === "dim_weighting" ? "active" : ""}`}
            onClick={() => setActiveTable("dim_weighting")}
          >
            <div className="card-top-bar border-amber">
              <span className="card-emoji">🔐</span>
              <div className="card-title-group">
                <span className="table-name">dim_weighting</span>
                <span className="table-badge">3 ATTRIBUTES</span>
              </div>
            </div>
            {viewMode === "schema" ? (
              <div className="card-attr-list">
                <div className="attr-row pk"><span className="tag pk">PK</span> weighting_key <span className="type">INT64</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> weighting_mode <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> description <span className="type">STRING</span></div>
              </div>
            ) : (
              <div className="card-tuples-preview">
                <div className="tuple-item">DYNAMIC_DWM (KEV & Exposure)</div>
                <div className="tuple-item">CVSS_ONLY (Static Base)</div>
              </div>
            )}
          </div>

          {/* dim_simulation */}
          <div
            className={`schema-card dim-card ${activeTable === "dim_simulation" ? "active" : ""}`}
            onClick={() => setActiveTable("dim_simulation")}
          >
            <div className="card-top-bar border-blue">
              <span className="card-emoji">🏃</span>
              <div className="card-title-group">
                <span className="table-name">dim_simulation</span>
                <span className="table-badge">12 ATTRIBUTES</span>
              </div>
            </div>
            {viewMode === "schema" ? (
              <div className="card-attr-list">
                <div className="attr-row pk"><span className="tag pk">PK</span> simulation_key <span className="type">INT64</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> simulation_id <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> started_at <span className="type">TIMESTAMP</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> network <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> entry <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> target <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> algorithm <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> weighting <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> data_source <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> llm_provider <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> llm_model <span className="type">STRING</span></div>
                <div className="attr-row"><span className="tag attr">COL</span> status <span className="type">STRING</span></div>
              </div>
            ) : (
              <div className="card-tuples-preview">
                <div className="tuple-item">SIM-20260929121500 • api_gw ➔ swift</div>
                <div className="tuple-item">pignn • groq • SUCCESS</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Table Attribute Inspector */}
      <div className="schema-full-inspector">
        <div className="inspector-head">
          <div className="inspector-title-wrap">
            <span className="inspector-chip" style={{ background: selectedData.accentColor }}>
              {selectedData.type.toUpperCase()}
            </span>
            <h3>
              <code>{selectedData.name}</code> — {selectedData.label}
            </h3>
          </div>
          <span className="inspector-count">{selectedData.columns.length} Total Columns Defined</span>
        </div>

        <div className="inspector-table-wrap">
          <table className="inspector-attr-table">
            <thead>
              <tr>
                <th style={{ width: "80px" }}>Key</th>
                <th style={{ width: "220px" }}>Attribute Name</th>
                <th style={{ width: "120px" }}>Data Type</th>
                <th>Relationship / Target</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {selectedData.columns.map((col) => (
                <tr key={col.name}>
                  <td>
                    {col.key === "PK" && <span className="key-badge pk">PK</span>}
                    {col.key === "FK" && <span className="key-badge fk">FK</span>}
                    {!col.key && <span className="key-badge col">-</span>}
                  </td>
                  <td>
                    <code className="attr-code-name">{col.name}</code>
                  </td>
                  <td>
                    <span className="type-badge">{col.type}</span>
                  </td>
                  <td>
                    {col.target ? (
                      <span className="target-badge">➔ {col.target}</span>
                    ) : (
                      <span className="text-muted">None (Local Fact/Attr)</span>
                    )}
                  </td>
                  <td className="desc-text">{col.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

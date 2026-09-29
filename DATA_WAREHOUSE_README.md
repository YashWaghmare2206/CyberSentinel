# CyberSentinel: Enterprise Data Warehouse & Analytics Engine (DWM)
**Architecture, Kimball Star Schema, ETL Pipeline, and OLAP Query Intelligence**

---

## 1. Executive Summary & Purpose

### Why a Data Warehouse in CyberSentinel?
In cybersecurity, runtime pathfinding engines (such as Dijkstra or PyTorch Graph Neural Networks) are **OLTP-like (Online Transaction Processing)**: they calculate the fastest or most probable lateral movement paths across a live graph in milliseconds. 

However, operational graph calculations cannot answer strategic, multidimensional enterprise questions such as:
* *Which intermediate internal servers consistently act as chokepoints across hundreds of simulated attack vectors?*
* *How has the exposure of zero-day vulnerabilities (CISA KEV) shifted our systemic risk profile over the last quarter?*
* *How do different pathfinding algorithms (Heuristic vs. Neural) compare in path length, hop depth, and traversal resistance?*

To answer these questions, **CyberSentinel incorporates an Enterprise Data Warehouse (EDW) hosted on Google BigQuery**, modeled strictly using **Ralph Kimball’s Dimensional Modeling methodology (Star Schema)**.

```
+-----------------------------------------------------------------------------------+
|                            CYBERSENTINEL DUAL-ENGINE ARCHITECTURE                 |
+-----------------------------------------------------------------------------------+
|  [ Operational / OLTP Layer ]                     [ Analytical / OLAP Layer ]    |
|  - Real-time Graph Pathfinding                     - Google BigQuery Warehouse    |
|  - Dijkstra / A* / PyTorch PIGNN                  - Ralph Kimball Star Schema     |
|  - In-Memory Topology Routing                     - Historical Simulation Logs    |
|  - Instant Threat Response                        - Multidimensional Chokepoints  |
+-----------------------------------------+-----------------------------------------+
                                          |
                        Streams Simulation Observations
                                          v
+-----------------------------------------------------------------------------------+
|                        FASTAPI BACKEND WAREHOUSE ADAPTER                          |
|         (/warehouse/summary, /warehouse/attack-history, /warehouse/query)         |
+-----------------------------------------+-----------------------------------------+
                                          |
                              Hydrates & Visualizes
                                          v
+-----------------------------------------------------------------------------------+
|                       FRONTEND: WAREHOUSE DASHBOARD UI                            |
|       (KPI Cards, Attack Pattern Rankings, Simulation Logs, Live SQL Console)     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Dimensional Model: Ralph Kimball Star Schema

CyberSentinel uses a pure **Star Schema** centered around the `fact_cyber_risk` table, surrounded by 7 conformed and descriptive dimension tables.

### 2.1 Visual Star Schema Diagram

```
                 +----------------------+         +-----------------------+
                 |       dim_time       |         |      dim_network      |
                 +----------------------+         +-----------------------+
                 | PK  time_key         |         | PK  network_key       |
                 |     full_date        |         |     network_id        |
                 |     day, month, year |         |     name, node_count  |
                 +----------+-----------+         +-----------+-----------+
                            |                                 |
                            +----------------+----------------+
                                             |
   +----------------------+                  v                  +-----------------------+
   |       dim_cve        |        +-------------------+        |       dim_node        |
   +----------------------+        |  fact_cyber_risk  |        +-----------------------+
   | PK  cve_key          |------->|   (CENTRAL FACT)  |<-------| PK  node_key          |
   |     cve_id           |        +-------------------+        |     network_key (FK)  |
   |     severity         |        | PK  risk_fact_key |        |     node_id           |
   |     cvss_base        |        | FK  time_key      |        |     type, exposure    |
   +----------------------+        | FK  network_key   |        +-----------------------+
                                   | FK  node_key      |
   +----------------------+        | FK  cve_key       |        +-----------------------+
   |    dim_algorithm     |------->| FK  algorithm_key |<-------|    dim_simulation     |
   +----------------------+        | FK  weighting_key |        +-----------------------+
   | PK  algorithm_key    |        | FK  simulation_key|        | PK  simulation_key    |
   |     algorithm_name   |        |                   |        |     simulation_id     |
   +----------------------+        |   [Measures]      |        |     started_at, entry |
                                   |   base_cvss       |        |     target, status    |
   +----------------------+        |   contextual_risk |        +-----------------------+
   |    dim_weighting     |------->|   edge_weight     |
   +----------------------+        |   hop_number      |
   | PK  weighting_key    |        |   total_hops      |
   |     weighting_mode   |        |   total_weight    |
   +----------------------+        +-------------------+
```

---

### 2.2 Table Specifications & Attribute Dictionary

#### Central Fact Table: `fact_cyber_risk`
* **Grain (Atomic Detail)**: Exactly **one individual hop / node observation within an attack path simulation or a baseline vulnerability scan**.
* **Primary Key**: `risk_fact_key` (64-bit integer surrogate key generated via deterministic hashing).
* **Foreign Keys**:
  * `time_key` -> `dim_time.time_key`
  * `network_key` -> `dim_network.network_key`
  * `node_key` -> `dim_node.node_key`
  * `cve_key` -> `dim_cve.cve_key`
  * `algorithm_key` -> `dim_algorithm.algorithm_key`
  * `weighting_key` -> `dim_weighting.weighting_key`
  * `simulation_key` -> `dim_simulation.simulation_key`

* **Facts & Measures**:
  | Column Name | Metric Type | Description |
  | :--- | :--- | :--- |
  | `base_cvss` | Non-Additive | Baseline Common Vulnerability Scoring System score (0.0 to 10.0) |
  | `contextual_risk_score` | Non-Additive | Computed DWM risk score factoring zero-day status & exposure |
  | `edge_weight` | Non-Additive | Traversal resistance value between the previous node and this node |
  | `hop_number` | Additive / Ordinal | Sequence position of this node along the attack trajectory (e.g. 1st hop, 2nd hop) |
  | `total_hops` | Semi-Additive | Total number of nodes traversed in this complete path |
  | `total_weight` | Semi-Additive | Cumulative resistance / cost of the attack path |

* **Degenerate Dimensions / Operational Flags**:
  * `observation_type`: `'BASELINE_VULNERABILITY'` vs. `'ATTACK_PATH'` vs. `'REMEDIATION'`.
  * `simulation_id`: e.g. `SIM-20260929120000`.
  * `path_id`: e.g. `SIM-20260929120000-P01`.
  * `path_rank`: Integer rank of the discovered path (1 = optimal path).
  * `is_optimal`: Boolean (`TRUE` if lowest total traversal resistance).
  * `kev_listed`: Boolean flag indicating CISA Known Exploited Vulnerability presence.
  * `patch_available`: Boolean flag indicating available software mitigation.

---

#### Dimension Tables (Descriptive Context)

1. **`dim_time` (Temporal Dimension)**:
   * Attributes: `time_key` (e.g., `20260929`), `full_date`, `day`, `week`, `month`, `quarter`, `year`.
   * Purpose: Enables temporal trend slicing (e.g., vulnerabilities discovered in Q3 vs Q4).

2. **`dim_network` (Topology Dimension)**:
   * Attributes: `network_key`, `network_id`, `name`, `description`, `node_count`.
   * Purpose: Segregates multi-tenant environments (e.g., Corporate DMZ vs ICS/SCADA Network).

3. **`dim_node` (Infrastructure Asset Dimension)**:
   * Attributes: `node_key`, `network_key`, `node_id`, `name`, `type` (server, router, workstation), `exposure` (perimeter, internal, isolated), `software`.
   * Purpose: Normalizes physical/virtual asset metadata.

4. **`dim_cve` (Vulnerability Catalog Dimension)**:
   * Attributes: `cve_key`, `cve_id` (e.g., `CVE-2024-21413`), `description`, `severity` (CRITICAL, HIGH, MEDIUM), `published_date`, `cvss_base`.
   * Purpose: Reusable catalog tracking standard CVE definitions.

5. **`dim_algorithm` (Pathfinding Engine Dimension)**:
   * Attributes: `algorithm_key`, `algorithm_name` (`Dijkstra`, `A*`, `PIGNN PyTorch`), `implementation_version`.
   * Purpose: Compares performance and path predictability across heuristic and neural models.

6. **`dim_weighting` (Dynamic Weight Management Dimension)**:
   * Attributes: `weighting_key`, `weighting_mode` (`CVSS_ONLY`, `PERIMETER_WEIGHTED`, `TEMPORAL_DWM`), `description`.
   * Purpose: Tracks which risk model governed the traversal physics.

7. **`dim_simulation` (Execution Context Dimension)**:
   * Attributes: `simulation_key`, `simulation_id`, `started_at`, `network`, `entry`, `target`, `algorithm`, `status`.
   * Purpose: Run-level auditing and repeatability metadata.

---

## 3. Data Extraction, Transformation, and Loading (ETL)

The warehouse ingestion pipeline combines **Batch Catalog Extraction** with **Real-Time Simulation Event Streaming**:

```
[ JSON Topologies & CVE Catalogs ]          [ React Web UI: "Simulate Attack" ]
               |                                            |
               v                                            v
    etl.py: extract_and_load_data()              logger.py: build_simulation_rows()
               |                                            |
               +--------------------+-----------------------+
                                    |
                    [ Transformation Phase (Python) ]
                    - Generate Hash-Based Surrogate Keys
                    - Map Hop Sequences (1..N) & Hops Count
                    - Deduplicate & Conjoin CVE Metrics
                    - Calculate Non-Additive Weight Metrics
                                    |
                                    v
                    [ Google BigQuery Load Jobs ]
               INSERT INTO cybersentinel_dw.fact_cyber_risk
```

1. **Extraction (E)**:
   * **Catalog Ingestion**: [`etl.py`](file:///c:/Users/Rupali%20Waghmare/Downloads/CyberSentinel-merged-3D/CyberSentinel/backend/warehouse/etl.py) parses network JSON definitions (`network.json`) and vulnerability records (`cves.json`).
   * **Simulation Stream Ingestion**: [`logger.py`](file:///c:/Users/Rupali%20Waghmare/Downloads/CyberSentinel-merged-3D/CyberSentinel/backend/warehouse/logger.py) intercepts the output of the pathfinding solver asynchronously after each attack simulation run.

2. **Transformation (T)**:
   * **Surrogate Key Generation**: Uses deterministic hashing:
     ```python
     def generate_key(identifier: str) -> int:
         return abs(hash(identifier)) % (10 ** 8)
     ```
     This decouples the warehouse keys from volatile strings, making BigQuery joins significantly faster.
   * **Hop Decomposition**: Unrolls multi-hop paths into distinct atomic fact rows, attaching sequence numbers, optimal flags, and contextual threat scores.

3. **Loading (L)**:
   * Data is streamed into Google BigQuery using the `google-cloud-bigquery` Python SDK.
   * In local/offline or hackathon demo environments, the pipeline fails gracefully with structured fallback logging without interrupting the user's simulation.

---

## 4. How Queries Are Answered & Executed (OLAP SQL)

All warehouse analytics are implemented in [`queries.py`](file:///c:/Users/Rupali%20Waghmare/Downloads/CyberSentinel-merged-3D/CyberSentinel/backend/warehouse/queries.py) using read-only SQL queries executed against Google BigQuery.

### Query 1: Executive KPI & Multidimensional Rollup
* **Backend Function**: `get_warehouse_summary()`
* **SQL Query**:
  ```sql
  SELECT 
      (SELECT COUNT(*) FROM `{dataset}.dim_cve`) AS total_cves,
      (SELECT COUNT(DISTINCT simulation_id) 
       FROM `{dataset}.fact_cyber_risk` 
       WHERE observation_type = 'ATTACK_PATH') AS total_simulations,
      (SELECT COUNT(DISTINCT node_key) 
       FROM `{dataset}.fact_cyber_risk` 
       WHERE contextual_risk_score >= 9.0) AS high_risk_nodes;
  ```
* **DW Concept**: Aggregation over dimension and fact tables, slicing by severity score (`contextual_risk_score >= 9.0`).
* **Security Intelligence**: Provides immediate situational awareness: how many total vulnerabilities exist, how many attacks were analyzed, and how many mission-critical assets are dangerously exposed.

---

### Query 2: Simulation Audit & Traversal History
* **Backend Function**: `get_attack_history()`
* **SQL Query**:
  ```sql
  SELECT 
      simulation_id, 
      entry_node_id, 
      target_node_id, 
      path_rank, 
      total_hops, 
      total_weight, 
      event_timestamp
  FROM `{dataset}.fact_cyber_risk`
  WHERE observation_type = 'ATTACK_PATH' AND hop_number = 1
  ORDER BY event_timestamp DESC
  LIMIT 50;
  ```
* **DW Concept**: Filtering on degenerate dimensions (`hop_number = 1` filters to path headers) and time-series ordering.
* **Security Intelligence**: Enables compliance auditing, tracking how lateral movement resistance (`total_weight`) and path lengths (`total_hops`) change as defenders apply security patches.

---

### Query 3: Pivot Chokepoint & Bottleneck Mining (Star Join)
* **Backend Function**: `get_attack_patterns()`
* **SQL Query**:
  ```sql
  SELECT 
      n.name AS node_name, 
      COUNT(*) AS frequency
  FROM `{dataset}.fact_cyber_risk` f
  JOIN `{dataset}.dim_node` n ON f.node_key = n.node_key
  WHERE f.observation_type = 'ATTACK_PATH' 
    AND f.hop_number > 1 
    AND n.node_id != f.target_node_id
  GROUP BY n.name
  ORDER BY frequency DESC
  LIMIT 10;
  ```
* **DW Concept**: **Star Join** (Fact Table joined to Dimension Table) + Slicing (`hop_number > 1` excludes entry points, `n.node_id != f.target_node_id` excludes destinations) + Grouping & Ordering.
* **Security Intelligence**: **Discovers the enterprise chokepoints**. If an intermediate jump-box or database server appears in 85% of attack paths, patching that single server breaks the majority of adversarial routes.

---

### Query 4: Interactive Ad-Hoc SQL Querying
* **Backend Endpoint**: `POST /warehouse/query` -> `execute_query(sql)`
* **SQL Injection & Mutation Guard**:
  ```python
  forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", "GRANT"]
  for word in forbidden:
      if f" {word} " in f" {sql_upper} ":
          raise ValueError(f"Query contains forbidden keyword: {word}. Only SELECT/WITH allowed.")
  ```
* **DW Concept**: Self-service OLAP query console for threat intelligence analysts to write arbitrary SQL joins.

---

## 5. How Queries Are Displayed in the User Interface

The results from the BigQuery Data Warehouse flow through the FastAPI REST layer to a dedicated **Warehouse Dashboard** in the React frontend:

```
+---------------------------------------------------------------------------------------------------+
|                                  SECURITY INTELLIGENCE WORKSPACE                                  |
|                            Data Mining & Analytics Powered by Google BigQuery                     |
+---------------------------------------------------------------------------------------------------+
|  [ KPI SUMMARY CARDS ]                                                                            |
|  +---------------------------+  +---------------------------+  +-------------------------------+  |
|  | Total Vulnerabilities: 48 |  | Simulations Analyzed: 142 |  | Critical Chokepoint Nodes: 7  |  |
|  +---------------------------+  +---------------------------+  +-------------------------------+  |
+---------------------------------------------------------------------------------------------------+
|  [ ATTACK PATTERNS (CHOKEPOINTS) ]             |  [ LIVE SQL CONSOLE ]                            |
|  Identifies intermediate pivot nodes:          |  Custom SELECT / Star Join queries:              |
|  1. Internal Database Proxy  [Freq: 38]        |  SELECT simulation_id, total_weight ...          |
|  2. Jump-Host Bastion        [Freq: 29]        |  [ Run Query Button ]                            |
|  3. Active Directory Server  [Freq: 24]        |  +--------------------------------------------+  |
|                                                |  | Results rendered as dynamic HTML table    |  |
|                                                |  +--------------------------------------------+  |
+------------------------------------------------+--------------------------------------------------+
|  [ ATTACK AUDIT LOG ] (Historical simulation runs with entry, target, hops, and risk weights)     |
+---------------------------------------------------------------------------------------------------+
```

### Component Breakdown
1. **[`WarehouseSummary.jsx`](file:///c:/Users/Rupali%20Waghmare/Downloads/CyberSentinel-merged-3D/CyberSentinel/frontend/src/components/warehouse/WarehouseSummary.jsx)**:
   * Consumes `/warehouse/summary`.
   * Renders metric cards displaying high-level facts (`total_cves`, `total_simulations`, `high_risk_nodes`).
2. **[`AttackPatterns.jsx`](file:///c:/Users/Rupali%20Waghmare/Downloads/CyberSentinel-merged-3D/CyberSentinel/frontend/src/components/warehouse/AttackPatterns.jsx)**:
   * Consumes `/warehouse/attack-patterns`.
   * Renders a ranked frequency list of high-risk pivot assets discovered via Star Schema joins.
3. **[`AttackHistory.jsx`](file:///c:/Users/Rupali%20Waghmare/Downloads/CyberSentinel-merged-3D/CyberSentinel/frontend/src/components/warehouse/AttackHistory.jsx)**:
   * Consumes `/warehouse/attack-history`.
   * Renders a paginated/scrollable audit table showing historical attack simulations with timestamps, entry/target pairs, and total weights.
4. **[`QueryConsole.jsx`](file:///c:/Users/Rupali%20Waghmare/Downloads/CyberSentinel-merged-3D/CyberSentinel/frontend/src/components/warehouse/QueryConsole.jsx)**:
   * Consumes `/warehouse/query`.
   * Provides an interactive SQL editor where security analysts can type queries against `{dataset}.fact_cyber_risk` and inspect dynamic tabular results in real time.

---

## 6. Section-Wise Viva & Evaluation Questions (For "DW Mam")

### Section A: Dimensional Modeling & Schema Design

#### Q1: "Why did you choose a Star Schema instead of a Snowflake Schema or 3NF?"
* **Answer**: *"We chose Ralph Kimball’s **Star Schema** because it prioritizes query performance and simplicity over write normalization. In our Data Warehouse, reads and analytical aggregations far outnumber writes. In Snowflake or 3NF, querying an attack path would require joining 6 or 7 normalized tables (e.g. node -> operating system -> vendor -> network), which causes expensive join penalties in distributed engines like BigQuery. In our Star Schema, `dim_node` directly contains exposure and software attributes, allowing queries to resolve in a single join against `fact_cyber_risk`."*

#### Q2: "What is the Grain of your Fact Table?"
* **Answer**: *"The grain of `fact_cyber_risk` is **one record per node observation per hop within a specific simulation or vulnerability audit run**. Defining the grain at the individual hop level gives us atomic granularity. We can roll up (aggregate) from hop to path, from path to simulation, and from simulation to enterprise network, without losing the ability to drill down to specific node-level CVE vulnerabilities."*

#### Q3: "What types of measures are stored in your Fact Table?"
* **Answer**: 
  * **Fully Additive Measures**: `hop_number` and `total_hops` (can be summed across any dimension).
  * **Semi-Additive / Non-Additive Measures**: `base_cvss`, `contextual_risk_score`, and `edge_weight`. Risk scores cannot be summed across nodes (summing two CVSS 7.0 vulnerabilities does not make a CVSS 14.0 risk); instead, they are aggregated using `MAX()`, `MIN()`, or `AVG()`."*

#### Q4: "What is a Degenerate Dimension and do you have one in your schema?"
* **Answer**: *"Yes. A degenerate dimension is a dimension key or attribute stored directly in the fact table without a corresponding dimension table. In `fact_cyber_risk`, `simulation_id`, `path_id`, and `observation_type` are **degenerate dimensions**. They provide grouping context (such as identifying all hops that belong to Path 1 of Simulation 14) without needing a dedicated join table."*

---

### Section B: Surrogate Keys & Data Engineering

#### Q5: "Why did you use Surrogate Keys instead of Natural / Business Keys?"
* **Answer**: *"In our operational network, nodes and CVEs have natural string keys like `web-server-01` or `CVE-2024-21413`. If we used natural keys in our Fact table, BigQuery joins would compare long strings across millions of rows, which is slow and memory-intensive. By generating integer surrogate keys via deterministic hashing (`risk_fact_key`, `node_key`, `cve_key`), we ensure:
  1. Fast, highly efficient 64-bit integer joins.
  2. Complete independence from changes in operational source systems (surrogate key insulation)."*

#### Q6: "How do you handle Slowly Changing Dimensions (SCD)?"
* **Answer**: *"For asset exposure and software changes in `dim_node`, we follow an **SCD Type 1 (overwrite)** for static network topology definitions, and an **SCD Type 2 approach** for risk snapshots by linking `dim_time` to each simulation run in `fact_cyber_risk`. Each new simulation captures the asset's risk state at that exact timestamp without overwriting past simulation observations."*

---

### Section C: Storage, BigQuery, and OLAP Architecture

#### Q7: "Why did you select Google BigQuery as your Data Warehouse technology?"
* **Answer**: 
  1. **Columnar Storage (Capacitor format)**: BigQuery stores data column-by-column rather than row-by-row. When computing average risk scores across 100,000 hops, it only reads the `contextual_risk_score` column, reducing I/O and query costs.
  2. **Serverless Scalability**: Requires zero cluster provisioning or sharding.
  3. **Separation of Compute and Storage**: The storage persists in BigQuery, while serverless Dremel query engines spin up dynamically on demand to execute analytical queries.

#### Q8: "How does OLAP differ from OLTP in CyberSentinel?"
* **Answer**: 
  * **OLTP (Operational Layer)**: Graph traversal algorithms (Dijkstra, PIGNN) operating in memory to find the shortest path for a single user query.
  * **OLAP (Warehouse Layer)**: Multidimensional queries executing across the entire historical corpus of attack paths to discover organizational patterns, chokepoint trends, and risk distributions.

#### Q9: "What OLAP operations does your system demonstrate?"
* **Answer**:
  * **Roll-up**: Aggregating node-level risk up to network-level totals in `get_warehouse_summary()`.
  * **Slice & Dice**: Slicing the fact table for `observation_type = 'ATTACK_PATH'` and dicing on intermediate hops (`hop_number > 1`).
  * **Drill-Down**: Moving from the executive summary down to specific simulation paths in `AttackHistory.jsx` and individual node CVEs in `dim_cve`.

---

### Section D: Real-World Business & Security Value

#### Q10: "How does the Data Warehouse help a Chief Information Security Officer (CISO)?"
* **Answer**: *"A CISO cannot manually inspect every Dijkstra path or graph visualization. The Data Warehouse provides actionable intelligence through SQL mining:
  1. **ROI on Security Spending**: By querying chokepoints (`get_attack_patterns()`), the CISO knows that investing in a patch for one specific proxy server mitigates 70% of attack routes.
  2. **Audit Compliance**: Historical simulation logs in `fact_cyber_risk` prove to compliance auditors that attack simulations were continuously tested and verified over time."*

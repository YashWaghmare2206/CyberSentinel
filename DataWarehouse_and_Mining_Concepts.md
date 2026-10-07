# Data Warehousing and Mining (DWM) Concepts in CyberSentinel

While CyberSentinel is primarily an attack path simulation engine, the underlying data architecture built during Phase 2 (Data & Graph Engine) maps perfectly to traditional **Data Warehousing and Data Mining** concepts. 

By designing the system this way, we essentially built the entire pre-processing, ETL, and Data Warehouse foundation required for the Gen AI agent to successfully "mine" the data for optimal attack paths.

---

## 1. The Data Warehouse Schema (Star Schema)

Instead of storing all data in a single, unnormalized JSON blob, the project is structured using a traditional **Data Warehouse Star Schema**, separating descriptive entities from measurable facts.

### Dimension Tables (The Entities)
Dimension tables store the descriptive "who, what, and where." We have two primary dimension entities:
*   **The Node Dimension (`network.json`):** This is the core Entity table representing the physical/virtual infrastructure. 
    *   **Primary Key:** `id`
    *   **Descriptive Attributes:** `name`, `type` (e.g., internal, public), `exposure`, and `software` (e.g., Windows 10, FortiOS).
*   **The Vulnerability Dimension (Raw NVD Data):** The raw CVE definitions act as the second entity. 
    *   **Primary Key:** `cve_id`
    *   **Descriptive Attributes:** `description`, `cvss_score`.

### The Fact Table (The Mapping)
Fact tables store measurable data, metrics, and foreign keys that link the dimensions together.
*   **The Vulnerability Fact Table (`cves.json`):** This file acts as a traditional Fact Table mapping the network dimensions to the vulnerability dimensions.
    *   **Foreign Keys:** `node_id` and `cve_id`.
    *   **Measurable Facts:** `kev_listed` (Boolean), `patch_available` (Boolean), and `days_since_published` (Integer metric).

### The Aggregate Fact Table (The Output)
*   **The Attack Path Output:** When the `graph.py` engine computes the Top-K routes, the resulting JSON payload acts as an Aggregate Fact Table. It stores arrays of foreign keys (the path of node IDs) alongside aggregated metrics like `total_hops`, `total_weight`, and `rank`.

---

## 2. The ETL Pipeline (Extract, Transform, Load)

The automated Python scripts (`generate_new_networks.py` and `fix_enterprise_bank.py`) serve as the project's **ETL Pipeline**:

*   **Extract:** Unstructured and semi-structured raw data is extracted from heterogeneous external sources: the NVD REST API and the CISA JSON feed.
*   **Transform:** The raw data is cleaned and derived into new variables. For example, the pipeline parses string timestamps to calculate the numerical `days_since_published` metric, scans reference array tags to deduce `patch_available`, and defaults missing CVSS scores to baseline values.
*   **Load:** The structured, transformed data is loaded into our static JSON files (`network.json` and `cves.json`), securely resting in our Data Warehouse for the simulation engine to query.

---

## 3. Data Integration

A core concept of Data Warehousing is integrating multiple disparate data sources into a single unified view. CyberSentinel successfully integrates the **CISA Known Exploited catalog** with the **NVD Vulnerability Database**, performing a programmatic join on the `cve_id` primary key to create a single, enriched dataset for every node on the network.

---

## 4. KDD (Knowledge Discovery in Databases) Pre-processing

Data mining relies heavily on the KDD process. Before the pathfinding algorithms (like Dijkstra or A*) and the LLM can "mine" the network for predictive attack paths, the data must be highly structured. 

By mapping the CVEs to specific network topologies and isolating exactly four dimensions (`kev_listed`, `patch_available`, `days_since_published`, `exposure`), the data pipeline performs **Dimensionality Reduction** and **Feature Engineering**. It strips out the useless API clutter (like raw HTML descriptions and redundant references) and leaves only the highly-correlated features necessary for the predictive mining engine to succeed.

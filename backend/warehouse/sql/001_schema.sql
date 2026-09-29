-- CyberSentinel DWM Data Warehouse Schema
-- Target: Google BigQuery

-- Dimension: Time
CREATE TABLE IF NOT EXISTS `dim_time` (
    time_key INT64 NOT NULL,
    full_date DATE NOT NULL,
    day INT64 NOT NULL,
    month INT64 NOT NULL,
    quarter INT64 NOT NULL,
    year INT64 NOT NULL,
    week INT64 NOT NULL
);

-- Dimension: Network Topology Metadata
CREATE TABLE IF NOT EXISTS `dim_network` (
    network_key INT64 NOT NULL,
    network_id STRING NOT NULL,
    name STRING,
    description STRING,
    node_count INT64
);

-- Dimension: Infrastructure Assets / Nodes
CREATE TABLE IF NOT EXISTS `dim_node` (
    node_key INT64 NOT NULL,
    network_key INT64 NOT NULL,
    node_id STRING NOT NULL,
    name STRING,
    type STRING,
    exposure STRING,
    software STRING
);

-- Dimension: Master Vulnerability Catalog (CVEs)
CREATE TABLE IF NOT EXISTS `dim_cve` (
    cve_key INT64 NOT NULL,
    cve_id STRING NOT NULL,
    description STRING,
    severity STRING,
    published_date TIMESTAMP,
    cvss_base FLOAT64
);

-- Dimension: Pathfinding Algorithm
CREATE TABLE IF NOT EXISTS `dim_algorithm` (
    algorithm_key INT64 NOT NULL,
    algorithm_name STRING NOT NULL,
    implementation_version STRING
);

-- Dimension: Risk Weighting Model
CREATE TABLE IF NOT EXISTS `dim_weighting` (
    weighting_key INT64 NOT NULL,
    weighting_mode STRING NOT NULL,
    description STRING
);

-- Dimension: Simulation Context
CREATE TABLE IF NOT EXISTS `dim_simulation` (
    simulation_key INT64 NOT NULL,
    simulation_id STRING NOT NULL,
    started_at TIMESTAMP NOT NULL,
    network STRING,
    entry STRING,
    target STRING,
    algorithm STRING,
    weighting STRING,
    data_source STRING,
    llm_provider STRING,
    llm_model STRING,
    status STRING
);

-- Central Fact Table: Cyber Risk Observations
-- Contains vulnerability, attack path, and remediation measures at the node grain
CREATE TABLE IF NOT EXISTS `fact_cyber_risk` (
    risk_fact_key INT64 NOT NULL,
    time_key INT64 NOT NULL,
    network_key INT64 NOT NULL,
    node_key INT64 NOT NULL,
    cve_key INT64,
    algorithm_key INT64,
    weighting_key INT64,
    simulation_key INT64,
    
    observation_type STRING NOT NULL, -- e.g., BASELINE_VULNERABILITY, ATTACK_PATH, REMEDIATION
    simulation_id STRING,
    path_id STRING,
    entry_node_id STRING,
    target_node_id STRING,
    
    path_rank INT64,
    is_optimal BOOL,
    hop_number INT64,
    total_hops INT64,
    total_weight FLOAT64,
    
    base_cvss FLOAT64,
    contextual_risk_score FLOAT64,
    edge_weight FLOAT64,
    
    kev_listed BOOL,
    patch_available BOOL,
    days_since_published INT64,
    
    remediation_status STRING,
    remediation_priority STRING,
    
    event_timestamp TIMESTAMP NOT NULL
);

-- Supporting Topology Table: Network Connectivity
CREATE TABLE IF NOT EXISTS `network_edge` (
    network_id STRING NOT NULL,
    from_node_id STRING NOT NULL,
    to_node_id STRING NOT NULL,
    protocol STRING
);

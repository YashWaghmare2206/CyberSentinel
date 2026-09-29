import logging
from typing import Dict, Any, List
from warehouse.client import get_bq_client, get_dataset_ref

logger = logging.getLogger(__name__)

def execute_query(sql: str, params: dict = None) -> List[Dict[str, Any]]:
    """Executes a read-only query against BigQuery."""
    # Basic SQL injection / mutation safety check
    sql_upper = sql.upper()
    forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", "GRANT"]
    for word in forbidden:
        if f" {word} " in f" {sql_upper} " or sql_upper.startswith(f"{word} "):
            raise ValueError(f"Query contains forbidden keyword: {word}. Only SELECT/WITH are allowed.")

    try:
        client = get_bq_client()
        dataset_ref = get_dataset_ref()
        
        # Replace template placeholder with actual dataset reference
        formatted_sql = sql.replace("{dataset}", dataset_ref)
        
        query_job = client.query(formatted_sql)
        results = query_job.result()
        return [dict(row) for row in results]
    except Exception as e:
        logger.warning(f"BigQuery query failed or not configured: {e}")
        return []

def get_warehouse_summary() -> Dict[str, Any]:
    sql = """
    SELECT 
        (SELECT COUNT(*) FROM `{dataset}.dim_cve`) as total_cves,
        (SELECT COUNT(DISTINCT simulation_id) FROM `{dataset}.fact_cyber_risk` WHERE observation_type='ATTACK_PATH') as total_simulations,
        (SELECT COUNT(DISTINCT node_key) FROM `{dataset}.fact_cyber_risk` WHERE contextual_risk_score >= 9.0) as high_risk_nodes
    """
    results = execute_query(sql)
    if results:
        return results[0]
    return {"total_cves": 0, "total_simulations": 0, "high_risk_nodes": 0}

def get_attack_history() -> List[Dict[str, Any]]:
    sql = """
    SELECT simulation_id, entry_node_id, target_node_id, path_rank, total_hops, total_weight, event_timestamp
    FROM `{dataset}.fact_cyber_risk`
    WHERE observation_type = 'ATTACK_PATH' AND hop_number = 1
    ORDER BY event_timestamp DESC
    LIMIT 50
    """
    return execute_query(sql)

def get_attack_patterns() -> List[Dict[str, Any]]:
    sql = """
    SELECT n.name as node_name, COUNT(*) as frequency
    FROM `{dataset}.fact_cyber_risk` f
    JOIN `{dataset}.dim_node` n ON f.node_key = n.node_key
    WHERE f.observation_type = 'ATTACK_PATH' AND f.hop_number > 1 
      AND n.node_id != f.target_node_id
    GROUP BY n.name
    ORDER BY frequency DESC
    LIMIT 10
    """
    return execute_query(sql)

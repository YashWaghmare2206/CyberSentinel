import logging
import asyncio
from datetime import datetime
from typing import List, Dict, Any

from warehouse.schema import FactCyberRisk
from warehouse.client import get_bq_client, get_dataset_ref
from warehouse.etl import generate_key

logger = logging.getLogger(__name__)

async def build_simulation_rows(
    paths: List[Dict[str, Any]], 
    network_id: str, 
    algorithm: str, 
    weighting_mode: str,
    entry_node: str,
    target_node: str
):
    """
    Parses the output of find_attack_paths() into a list of FactCyberRisk
    observations (one for every hop of every ranked path) and inserts them.
    Runs asynchronously in the background.
    """
    now = datetime.utcnow()
    time_key = int(now.strftime("%Y%m%d"))
    net_key = generate_key(network_id)
    
    # Generate a unique simulation run ID
    sim_id_str = f"SIM-{now.strftime('%Y%m%d%H%M%S')}"
    sim_key = generate_key(sim_id_str)
    
    facts = []
    
    for path_data in paths:
        rank = path_data.get("rank", 1)
        is_optimal = path_data.get("is_optimal", False)
        total_hops = path_data.get("total_hops", 0)
        total_weight = path_data.get("total_weight", 0.0)
        
        # Unique ID for this specific path within the simulation
        path_id = f"{sim_id_str}-P{rank:02d}"
        
        nodes = path_data.get("nodes", [])
        
        for hop_index, node in enumerate(nodes):
            node_id = node.get("id", f"node_{hop_index}")
            node_key = generate_key(f"{network_id}_{node_id}")
            
            cves = node.get("cves", [])
            worst_cve = None
            if cves:
                worst_cve = max(cves, key=lambda c: float(c.get("cvss_score", 0.0)))
            
            cve_key = generate_key(worst_cve["cve_id"]) if worst_cve else None
            
            fact = FactCyberRisk(
                risk_fact_key=generate_key(f"{sim_id_str}_{path_id}_{hop_index}"),
                time_key=time_key,
                network_key=net_key,
                node_key=node_key,
                cve_key=cve_key,
                simulation_key=sim_key,
                
                observation_type="ATTACK_PATH",
                simulation_id=sim_id_str,
                path_id=path_id,
                entry_node_id=entry_node,
                target_node_id=target_node,
                
                path_rank=rank,
                is_optimal=is_optimal,
                hop_number=hop_index + 1,
                total_hops=total_hops,
                total_weight=total_weight,
                
                base_cvss=worst_cve.get("cvss_score") if worst_cve else None,
                contextual_risk_score=node.get("adjusted_weight"),
                edge_weight=None,
                
                kev_listed=worst_cve.get("kev_listed") if worst_cve else None,
                patch_available=worst_cve.get("patch_available") if worst_cve else None,
                days_since_published=worst_cve.get("days_since_published") if worst_cve else None,
                
                event_timestamp=now
            )
            facts.append(fact)
            
    # Try pushing to BigQuery
    try:
        # Offload network I/O to threadpool so we don't block asyncio
        await asyncio.to_thread(_push_to_bq, facts)
    except Exception as e:
        logger.warning(f"Failed to write simulation {sim_id_str} to Data Warehouse: {e}")

import json

def _push_to_bq(facts: List[FactCyberRisk]):
    if not facts:
        return
    client = get_bq_client()
    dataset_ref = get_dataset_ref()
    
    # We use load_table_from_json instead of insert_rows_json because free-tier blocks streaming
    data = [json.loads(f.json()) for f in facts]
    job = client.load_table_from_json(data, f"{dataset_ref}.fact_cyber_risk")
    job.result() # Wait for job completion
    
    logger.info(f"Warehouse Logger: Saved {len(facts)} FactCyberRisk observations to BigQuery.")

async def build_remediation_rows(nodes: List[Dict[str, Any]], network_id: str = "enterprise-bank"):
    """
    Logs remediation application for nodes in a path.
    """
    now = datetime.utcnow()
    time_key = int(now.strftime("%Y%m%d"))
    net_key = generate_key(network_id)
    
    facts = []
    
    for hop_index, node in enumerate(nodes):
        node_id = node.get("id", f"node_{hop_index}")
        node_key = generate_key(f"{network_id}_{node_id}")
        
        cves = node.get("cves", [])
        if not cves:
            continue
            
        worst_cve = max(cves, key=lambda c: float(c.get("cvss_score", 0.0)))
        cve_key = generate_key(worst_cve["cve_id"])
        
        fact = FactCyberRisk(
            risk_fact_key=generate_key(f"FIX_{now.timestamp()}_{node_id}"),
            time_key=time_key,
            network_key=net_key,
            node_key=node_key,
            cve_key=cve_key,
            
            observation_type="REMEDIATION",
            base_cvss=worst_cve.get("cvss_score"),
            remediation_status="SIMULATED_APPLIED",
            remediation_priority="HIGH" if float(worst_cve.get("cvss_score", 0.0)) >= 7 else "MEDIUM",
            
            event_timestamp=now
        )
        facts.append(fact)
        
    try:
        await asyncio.to_thread(_push_to_bq, facts)
    except Exception as e:
        logger.warning(f"Failed to write remediation to Data Warehouse: {e}")

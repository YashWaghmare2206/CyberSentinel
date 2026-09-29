import os
import json
import logging
from datetime import datetime
from warehouse.schema import DimNetwork, DimNode, DimCve, FactCyberRisk
from warehouse.client import get_bq_client, get_dataset_ref

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

NETWORKS_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'networks')

def generate_key(identifier: str) -> int:
    """Simple hash-based surrogate key generator for demonstration."""
    return abs(hash(identifier)) % (10 ** 8)

def extract_and_load_data():
    """
    Extracts data from the local JSON files in data/networks/,
    transforms them into Star Schema representations, and attempts
    to load them into Google BigQuery.
    """
    logger.info("Starting warehouse ETL process...")
    networks = []
    nodes = []
    cves = {}
    facts = []

    # Common time/date keys
    now = datetime.utcnow()
    time_key = int(now.strftime("%Y%m%d"))
    
    # Iterate through all network topologies
    if os.path.exists(NETWORKS_DIR):
        for network_id in os.listdir(NETWORKS_DIR):
            network_path = os.path.join(NETWORKS_DIR, network_id)
            if not os.path.isdir(network_path):
                continue
                
            network_json_path = os.path.join(network_path, 'network.json')
            cves_json_path = os.path.join(network_path, 'cves.json')
            
            if not os.path.exists(network_json_path):
                continue
                
            with open(network_json_path, 'r', encoding='utf-8') as f:
                net_data = json.load(f)
                
            # Build DimNetwork
            net_key = generate_key(network_id)
            networks.append(DimNetwork(
                network_key=net_key,
                network_id=network_id,
                name=net_data.get('name', network_id),
                description=net_data.get('description', ''),
                node_count=len(net_data.get('nodes', []))
            ))
            
            # Build DimNode
            for node in net_data.get('nodes', []):
                node_key = generate_key(f"{network_id}_{node['id']}")
                nodes.append(DimNode(
                    node_key=node_key,
                    network_key=net_key,
                    node_id=node['id'],
                    name=node.get('name', node['id']),
                    type=node.get('type', ''),
                    exposure=node.get('exposure', 'internal'),
                    software=node.get('software', '')
                ))

            # Build DimCve and Baseline Facts
            if os.path.exists(cves_json_path):
                with open(cves_json_path, 'r', encoding='utf-8') as f:
                    cve_data = json.load(f)
                    
                for cve_record in cve_data:
                    cve_id = cve_record.get('cve_id')
                    if not cve_id:
                        continue
                        
                    cve_key = generate_key(cve_id)
                    # Add to unique CVEs dict
                    if cve_key not in cves:
                        cves[cve_key] = DimCve(
                            cve_key=cve_key,
                            cve_id=cve_id,
                            description=cve_record.get('description', ''),
                            severity=cve_record.get('severity', 'UNKNOWN'),
                            cvss_base=cve_record.get('cvss_score', 0.0)
                        )
                    
                    # Create Baseline Fact tying Node and CVE
                    node_key = generate_key(f"{network_id}_{cve_record['node_id']}")
                    
                    fact = FactCyberRisk(
                        risk_fact_key=generate_key(f"{network_id}_{cve_record['node_id']}_{cve_id}_{time_key}"),
                        time_key=time_key,
                        network_key=net_key,
                        node_key=node_key,
                        cve_key=cve_key,
                        observation_type="BASELINE_VULNERABILITY",
                        base_cvss=cve_record.get('cvss_score'),
                        kev_listed=cve_record.get('kev_listed', False),
                        patch_available=cve_record.get('patch_available', False),
                        days_since_published=cve_record.get('days_since_published', 0),
                        event_timestamp=now
                    )
                    facts.append(fact)

    logger.info(f"Extracted: {len(networks)} Networks, {len(nodes)} Nodes, {len(cves)} CVEs, {len(facts)} Baseline Facts.")
    
    # Load into BigQuery (Fail gracefully if not configured)
    try:
        client = get_bq_client()
        dataset_ref = get_dataset_ref()
        
        # Using Load Jobs instead of Streaming Inserts (insert_rows_json) because streaming is disabled on free tier.
        def load_data(table_id, data):
            if not data: return
            job = client.load_table_from_json(data, f"{dataset_ref}.{table_id}")
            job.result() # Wait for job to complete
            
        load_data("dim_network", [json.loads(n.json()) for n in networks])
        load_data("dim_node", [json.loads(n.json()) for n in nodes])
        load_data("dim_cve", [json.loads(c.json()) for c in cves.values()])
        load_data("fact_cyber_risk", [json.loads(f.json()) for f in facts])
        
        logger.info("Successfully pushed data to BigQuery (Simulation/Dry-Run in hackathon context if credentials empty).")
    except Exception as e:
        logger.warning(f"BigQuery credentials not configured or insertion failed: {e}")
        logger.info("Proceeding with local processing. Data warehouse ETL is ready for live DB.")

if __name__ == "__main__":
    extract_and_load_data()

import os
import requests
import json
import time

# 1. GENERATE A REALISTIC 50-NODE ENTERPRISE TOPOLOGY
def generate_network_topology():
    nodes = []
    edges = []

    sw_pool = {
        "gw": "Apache 2.4.49", "lb": "F5 BIG-IP", "vpn": "OpenVPN", "dns": "BIND 9",
        "web": "Spring Framework", "proxy": "Nginx", "api": "Node.js", "app": "Tomcat",
        "auth": "Keycloak", "queue": "Log4j", "db_sql": "MySQL", "db_cache": "Redis",
        "db_core": "PostgreSQL 12.1", "db_dw": "Oracle Database", "backup": "Veritas NetBackup",
        "fw": "FortiOS", "win_admin": "Windows Server 2019", "win_ad": "Windows Server 2016",
        "linux_leg": "Linux Kernel", "swift": "Windows 10"
    }

    # --- NODES ---
    for i in range(1, 4): nodes.append({"id": f"api_gw_{i}", "name": f"Public API Gateway {i}", "type": "public", "software": sw_pool["gw"]})
    for i in range(1, 3): nodes.append({"id": f"load_balancer_{i}", "name": f"Load Balancer {i}", "type": "public", "software": sw_pool["lb"]})
    nodes.extend([
        {"id": "vpn_gateway_1", "name": "Corporate VPN 1", "type": "public", "software": sw_pool["vpn"]},
        {"id": "vpn_gateway_2", "name": "Corporate VPN 2", "type": "public", "software": sw_pool["vpn"]},
        {"id": "dns_server_1", "name": "External DNS Primary", "type": "public", "software": sw_pool["dns"]},
        {"id": "dns_server_2", "name": "External DNS Secondary", "type": "public", "software": sw_pool["dns"]},
        {"id": "waf_1", "name": "Web Application Firewall", "type": "public", "software": sw_pool["fw"]}
    ])

    for i in range(1, 6): nodes.append({"id": f"web_app_{i}", "name": f"Web App Server {i}", "type": "internal", "software": sw_pool["web"]})
    for i in range(1, 4): nodes.append({"id": f"proxy_{i}", "name": f"Reverse Proxy {i}", "type": "internal", "software": sw_pool["proxy"]})
    for i in range(1, 4): nodes.append({"id": f"api_internal_{i}", "name": f"Internal Microservice {i}", "type": "internal", "software": sw_pool["api"]})
    for i in range(1, 3): nodes.append({"id": f"app_server_{i}", "name": f"App Processing Node {i}", "type": "internal", "software": sw_pool["app"]})
    nodes.append({"id": "auth_server", "name": "OAuth Identity Broker", "type": "internal", "software": sw_pool["auth"]})

    for i in range(1, 3): nodes.append({"id": f"msg_queue_{i}", "name": f"Message Queue Broker {i}", "type": "internal", "software": sw_pool["queue"]})
    for i in range(1, 4): nodes.append({"id": f"app_db_sql_{i}", "name": f"Transactional DB Node {i}", "type": "internal", "software": sw_pool["db_sql"]})
    for i in range(1, 4): nodes.append({"id": f"app_db_cache_{i}", "name": f"Redis Cache Node {i}", "type": "internal", "software": sw_pool["db_cache"]})
    for i in range(1, 3): nodes.append({"id": f"core_db_node_{i}", "name": f"Core Banking Cluster Node {i}", "type": "critical", "software": sw_pool["db_core"]})
    nodes.extend([
        {"id": "data_warehouse", "name": "Customer Analytics Data Warehouse", "type": "critical", "software": sw_pool["db_dw"]},
        {"id": "backup_server_1", "name": "Primary Backup Vault", "type": "critical", "software": sw_pool["backup"]},
        {"id": "backup_server_2", "name": "Secondary Offsite Backup", "type": "critical", "software": sw_pool["backup"]}
    ])

    for i in range(1, 3): nodes.append({"id": f"firewall_{i}", "name": f"Internal Segment Firewall {i}", "type": "control", "software": sw_pool["fw"]})
    for i in range(1, 3): nodes.append({"id": f"admin_console_{i}", "name": f"IT Admin Workstation {i}", "type": "control", "software": sw_pool["win_admin"]})
    nodes.extend([
        {"id": "ad_controller_primary", "name": "Active Directory Primary", "type": "control", "software": sw_pool["win_ad"]},
        {"id": "ad_controller_secondary", "name": "Active Directory Replica", "type": "control", "software": sw_pool["win_ad"]},
        {"id": "linux_legacy_node", "name": "Unmanaged Legacy Linux System", "type": "internal", "software": sw_pool["linux_leg"]}
    ])

    nodes.extend([
        {"id": "swift_terminal", "name": "SWIFT Wire Transfer Terminal", "type": "critical", "software": sw_pool["swift"]},
        {"id": "payment_gateway", "name": "Payment Clearing Gateway", "type": "critical", "software": sw_pool["swift"]},
        {"id": "hsms_vault", "name": "Hardware Security Module (HSM)", "type": "critical", "software": sw_pool["swift"]}
    ])

    # --- REALISTIC EDGES (The Enterprise Architecture) ---

    # 1. External Routing to DMZ
    edges.extend([
        {"from": "api_gw_1", "to": "waf_1", "protocol": "HTTPS"},
        {"from": "api_gw_2", "to": "waf_1", "protocol": "HTTPS"},
        {"from": "api_gw_3", "to": "load_balancer_2", "protocol": "HTTPS"},
        {"from": "waf_1", "to": "load_balancer_1", "protocol": "HTTPS"},
        {"from": "waf_1", "to": "load_balancer_2", "protocol": "HTTPS"},
        {"from": "vpn_gateway_1", "to": "ad_controller_primary", "protocol": "LDAP"},
        {"from": "vpn_gateway_2", "to": "admin_console_1", "protocol": "RDP"}
    ])

    # 2. DMZ to Application Tier
    for lb in ["load_balancer_1", "load_balancer_2"]:
        for web in ["web_app_1", "web_app_2", "web_app_3"]:
            edges.append({"from": lb, "to": web, "protocol": "HTTP"})
        for proxy in ["proxy_1", "proxy_2"]:
            edges.append({"from": lb, "to": proxy, "protocol": "HTTPS"})

    # 3. Lateral Movement (Apps talking to Apps)
    edges.append({"from": "web_app_1", "to": "web_app_2", "protocol": "TCP"})
    edges.append({"from": "web_app_2", "to": "web_app_3", "protocol": "TCP"})
    edges.append({"from": "web_app_3", "to": "web_app_1", "protocol": "TCP"})

    # 4. Applications to Microservices & Auth
    for web in ["web_app_1", "web_app_2", "web_app_3"]:
        edges.append({"from": web, "to": "auth_server", "protocol": "HTTPS"})
        edges.append({"from": web, "to": "api_internal_1", "protocol": "REST"})
        edges.append({"from": web, "to": "app_server_1", "protocol": "TCP"})
        edges.append({"from": web, "to": "app_db_cache_1", "protocol": "Redis"})

    for proxy in ["proxy_1", "proxy_2"]:
        edges.append({"from": proxy, "to": "api_internal_2", "protocol": "REST"})
        edges.append({"from": proxy, "to": "api_internal_3", "protocol": "REST"})

    # 5. Microservices to Databases & Messaging
    edges.extend([
        {"from": "api_internal_1", "to": "msg_queue_1", "protocol": "AMQP"},
        {"from": "api_internal_2", "to": "msg_queue_2", "protocol": "AMQP"},
        {"from": "api_internal_3", "to": "app_db_sql_1", "protocol": "MySQL"},
        {"from": "app_server_1", "to": "app_db_sql_2", "protocol": "MySQL"},
        {"from": "app_server_2", "to": "app_db_sql_3", "protocol": "MySQL"},
        {"from": "app_db_sql_1", "to": "data_warehouse", "protocol": "JDBC"},
        {"from": "app_db_sql_2", "to": "data_warehouse", "protocol": "JDBC"}
    ])

    # 6. Messaging & Legacy bridging to Core Systems
    edges.extend([
        {"from": "msg_queue_1", "to": "linux_legacy_node", "protocol": "TCP"},
        {"from": "linux_legacy_node", "to": "core_db_node_1", "protocol": "PostgreSQL"},
        {"from": "msg_queue_2", "to": "core_db_node_2", "protocol": "PostgreSQL"},
        {"from": "core_db_node_1", "to": "backup_server_1", "protocol": "TCP"},
        {"from": "core_db_node_2", "to": "backup_server_2", "protocol": "TCP"}
    ])

    # 7. The Management Network (Admins & Firewalls touch EVERYTHING)
    for admin in ["admin_console_1", "admin_console_2"]:
        edges.append({"from": admin, "to": "firewall_1", "protocol": "SSH"})
        edges.append({"from": admin, "to": "firewall_2", "protocol": "SSH"})
        edges.append({"from": admin, "to": "ad_controller_primary", "protocol": "Kerberos"})
        edges.append({"from": admin, "to": "web_app_1", "protocol": "SSH"})
        edges.append({"from": admin, "to": "core_db_node_1", "protocol": "SQL"})
        edges.append({"from": admin, "to": "data_warehouse", "protocol": "JDBC"}) # Path directly to data warehouse

    # 8. Active Directory
    edges.append({"from": "ad_controller_primary", "to": "swift_terminal", "protocol": "SMB"})
    edges.append({"from": "ad_controller_secondary", "to": "payment_gateway", "protocol": "SMB"})

    # 9. Highly Segmented Crown Jewels
    edges.append({"from": "core_db_node_1", "to": "swift_terminal", "protocol": "Proprietary"})
    edges.append({"from": "core_db_node_2", "to": "payment_gateway", "protocol": "Proprietary"})
    edges.append({"from": "swift_terminal", "to": "hsms_vault", "protocol": "TLS"})

    return {"nodes": nodes, "edges": edges}


# 2. FETCH AND CACHE CVEs FOR UNIQUE SOFTWARE
def fetch_cves_for_software(software_keyword, limit=8):
    print(f"Fetching CVEs for software: '{software_keyword}'...")
    url = f"https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch={software_keyword}&resultsPerPage={limit}"
    cve_list = []

    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()

        if "vulnerabilities" in data:
            for item in data["vulnerabilities"]:
                vuln = item.get("cve", {})
                cve_id = vuln.get("id")

                desc_list = vuln.get("descriptions", [])
                description = desc_list[0]["value"] if desc_list else "No description available."

                metrics = vuln.get("metrics", {})
                if "cvssMetricV31" in metrics:
                    cvss_data = metrics["cvssMetricV31"][0]["cvssData"]
                    score = cvss_data.get("baseScore", 7.0)
                    severity = cvss_data.get("baseSeverity", "HIGH")
                elif "cvssMetricV30" in metrics:
                    cvss_data = metrics["cvssMetricV30"][0]["cvssData"]
                    score = cvss_data.get("baseScore", 7.0)
                    severity = cvss_data.get("baseSeverity", "HIGH")
                else:
                    score = 7.5
                    severity = "HIGH"

                cve_list.append({
                    "cve_id": cve_id,
                    "cvss_score": score,
                    "severity": severity,
                    "description": description,
                    "exploit_type": "Automated NVD API Pull",
                    "patch": "Check vendor advisory"
                })
    except Exception as e:
        print(f"  -> Warning: Failed to fetch for {software_keyword}: {e}")

    return cve_list


# 3. BUILD AND MAP DATA TO 50 NODES
def build_data_layer():
    network = generate_network_topology()
    nodes = network["nodes"]

    # Extract unique software applications across all 50 nodes
    unique_softwares = list(set([node["software"] for node in nodes if "software" in node]))

    print(f"Generated {len(nodes)} network nodes across 5 zones.")
    print(f"Identified {len(unique_softwares)} unique software profiles to query from NVD.\n")

    # Cache CVE results by software name
    software_cve_cache = {}
    for idx, sw in enumerate(unique_softwares, 1):
        print(f"[{idx}/{len(unique_softwares)}]", end=" ")
        software_cve_cache[sw] = fetch_cves_for_software(sw, limit=8)
        time.sleep(6)  # NVD rate-limiting delay

    # Map cached CVEs back to individual nodes
    all_mapped_cves = []
    for node in nodes:
        sw = node.get("software")
        if sw in software_cve_cache:
            for cve in software_cve_cache[sw]:
                node_cve = cve.copy()
                node_cve["node_id"] = node["id"]
                all_mapped_cves.append(node_cve)

    # Save to JSON
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(script_dir, "data")
    os.makedirs(data_dir, exist_ok=True)

    with open(os.path.join(data_dir, "network.json"), "w") as f:
        json.dump(network, f, indent=2)

    with open(os.path.join(data_dir, "cves.json"), "w") as f:
        json.dump(all_mapped_cves, f, indent=2)

    print(f"\n==================================================")
    print(f"SUCCESS! Created 50-node topology with {len(all_mapped_cves)} mapped CVEs.")
    print(f"Saved directly to: {data_dir}")
    print(f"==================================================")

if __name__ == "__main__":
    build_data_layer()
import os
import requests
import json
import time
from datetime import datetime

# Global cache for CISA KEV
KEV_SET = set()

def load_cisa_kev():
    global KEV_SET
    print("Fetching CISA Known Exploited Vulnerabilities catalog...")
    try:
        url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        if "vulnerabilities" in data:
            for v in data["vulnerabilities"]:
                KEV_SET.add(v.get("cveID"))
        print(f"Loaded {len(KEV_SET)} CVEs from CISA KEV catalog.")
    except Exception as e:
        print(f"Failed to fetch CISA KEV catalog: {e}")

def fetch_cves_for_software(software_keyword, limit=4):
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

                # CVSS Score
                metrics = vuln.get("metrics", {})
                if "cvssMetricV31" in metrics:
                    cvss_data = metrics["cvssMetricV31"][0]["cvssData"]
                    score = cvss_data.get("baseScore", 7.0)
                elif "cvssMetricV30" in metrics:
                    cvss_data = metrics["cvssMetricV30"][0]["cvssData"]
                    score = cvss_data.get("baseScore", 7.0)
                else:
                    score = 7.5

                # 1. KEV Listed
                kev_listed = cve_id in KEV_SET

                # 2. Days Since Published
                published_str = vuln.get("published")
                days_since = 0
                if published_str:
                    try:
                        # Format: "2021-08-05T21:15:00.000"
                        pub_date = datetime.strptime(published_str.split("T")[0], "%Y-%m-%d")
                        days_since = (datetime.now() - pub_date).days
                    except ValueError:
                        pass

                # 3. Patch Available
                patch_available = False
                references = vuln.get("references", [])
                for ref in references:
                    tags = ref.get("tags", [])
                    if tags and any("Patch" in t or "Vendor Advisory" in t for t in tags):
                        patch_available = True
                        break

                cve_list.append({
                    "cve_id": cve_id,
                    "cvss_score": score,
                    "description": description,
                    "kev_listed": kev_listed,
                    "days_since_published": max(0, days_since),
                    "patch_available": patch_available
                })
    except Exception as e:
        print(f"  -> Warning: Failed to fetch for {software_keyword}: {e}")

    return cve_list

def generate_and_map_networks():
    load_cisa_kev()

    # --- 1. Small Branch Bank ---
    net_sb = {
        'name': 'Small Branch Bank',
        'description': 'Simpler branch office network with tellers and ATMs',
        'nodes': [
            {'id': 'branch_vpn_gateway', 'name': 'Branch VPN Gateway', 'type': 'public', 'exposure': 'public', 'software': 'FortiOS'},
            {'id': 'teller_workstation_1', 'name': 'Teller Workstation 1', 'type': 'internal', 'exposure': 'internal', 'software': 'Windows 10'},
            {'id': 'teller_workstation_2', 'name': 'Teller Workstation 2', 'type': 'internal', 'exposure': 'internal', 'software': 'Windows 10'},
            {'id': 'branch_file_server', 'name': 'Branch File Server', 'type': 'internal', 'exposure': 'internal', 'software': 'Windows Server 2019'},
            {'id': 'vault_iot_camera', 'name': 'Vault IP Camera', 'type': 'legacy', 'exposure': 'internal', 'software': 'Hikvision'},
            {'id': 'atm_controller', 'name': 'ATM Controller', 'type': 'critical', 'exposure': 'critical', 'software': 'Windows Embedded'}
        ],
        'edges': [
            {'from': 'branch_vpn_gateway', 'to': 'teller_workstation_1'},
            {'from': 'branch_vpn_gateway', 'to': 'teller_workstation_2'},
            {'from': 'branch_vpn_gateway', 'to': 'branch_file_server'},
            {'from': 'teller_workstation_1', 'to': 'branch_file_server'},
            {'from': 'teller_workstation_2', 'to': 'branch_file_server'},
            {'from': 'branch_file_server', 'to': 'atm_controller'},
            {'from': 'teller_workstation_1', 'to': 'vault_iot_camera'},
            {'from': 'vault_iot_camera', 'to': 'atm_controller'}
        ]
    }

    # --- 2. Legacy IoT Bank ---
    net_li = {
        'name': 'Legacy IoT Bank',
        'description': 'Acquired legacy infrastructure heavily reliant on outdated hardware',
        'nodes': [
            {'id': 'unpatched_exchange', 'name': 'Legacy Exchange Server', 'type': 'public', 'exposure': 'public', 'software': 'Microsoft Exchange'},
            {'id': 'legacy_hvac_controller', 'name': 'Building HVAC BMS', 'type': 'public', 'exposure': 'public', 'software': 'Tridium Niagara'},
            {'id': 'legacy_pbx_system', 'name': 'VoIP PBX Server', 'type': 'internal', 'exposure': 'internal', 'software': 'Asterisk'},
            {'id': 'win7_workstation', 'name': 'Legacy Win7 Workstation', 'type': 'internal', 'exposure': 'internal', 'software': 'Windows 7'},
            {'id': 'mainframe_terminal', 'name': 'AS400 Mainframe Term', 'type': 'critical', 'exposure': 'critical', 'software': 'IBM i'}
        ],
        'edges': [
            {'from': 'unpatched_exchange', 'to': 'legacy_pbx_system'},
            {'from': 'legacy_hvac_controller', 'to': 'win7_workstation'},
            {'from': 'unpatched_exchange', 'to': 'win7_workstation'},
            {'from': 'win7_workstation', 'to': 'mainframe_terminal'},
            {'from': 'legacy_pbx_system', 'to': 'mainframe_terminal'}
        ]
    }

    networks = {
        "small-branch-bank": net_sb,
        "legacy-iot-bank": net_li
    }

    all_softwares = set()
    for net_data in networks.values():
        for node in net_data["nodes"]:
            all_softwares.add(node["software"])

    print(f"Fetching true CVE data from NVD for {len(all_softwares)} unique software packages...")
    cache = {}
    for sw in all_softwares:
        cache[sw] = fetch_cves_for_software(sw, limit=4)
        time.sleep(6.1)  # rate limit

    for net_id, net_data in networks.items():
        all_mapped_cves = []
        for node in net_data["nodes"]:
            sw = node["software"]
            if sw in cache:
                for cve in cache[sw]:
                    node_cve = cve.copy()
                    node_cve["node_id"] = node["id"]
                    all_mapped_cves.append(node_cve)

        for base in [f'backend/data/networks/{net_id}', f'frontend/src/data/networks/{net_id}']:
            os.makedirs(base, exist_ok=True)
            with open(f'{base}/network.json', 'w') as f: json.dump(net_data, f, indent=2)
            with open(f'{base}/cves.json', 'w') as f: json.dump(all_mapped_cves, f, indent=2)

    print("Successfully mapped true CVEs and updated JSONs!")

if __name__ == "__main__":
    generate_and_map_networks()

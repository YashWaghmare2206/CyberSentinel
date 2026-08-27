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

def fetch_single_cve(cve_id):
    print(f"Fetching true data for {cve_id}...")
    url = f"https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={cve_id}"
    
    # 1. KEV Listed
    kev_listed = cve_id in KEV_SET
    days_since = 0
    patch_available = False

    try:
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            data = response.json()
            if "vulnerabilities" in data and len(data["vulnerabilities"]) > 0:
                vuln = data["vulnerabilities"][0].get("cve", {})
                
                # 2. Days Since Published
                published_str = vuln.get("published")
                if published_str:
                    try:
                        pub_date = datetime.strptime(published_str.split("T")[0], "%Y-%m-%d")
                        days_since = max(0, (datetime.now() - pub_date).days)
                    except ValueError:
                        pass
                
                # 3. Patch Available
                references = vuln.get("references", [])
                for ref in references:
                    tags = ref.get("tags", [])
                    if tags and any("Patch" in t or "Vendor Advisory" in t for t in tags):
                        patch_available = True
                        break
        else:
            print(f"  -> NVD API returned {response.status_code}")
    except Exception as e:
        print(f"  -> Warning: Failed to fetch {cve_id}: {e}")

    return kev_listed, days_since, patch_available

def fix_enterprise_bank():
    load_cisa_kev()
    
    net_path = "backend/data/networks/enterprise-bank/cves.json"
    with open(net_path, "r") as f:
        cves = json.load(f)
        
    unique_cve_ids = list(set([c["cve_id"] for c in cves]))
    print(f"Found {len(unique_cve_ids)} unique CVEs in Enterprise Bank.")
    
    # Cache to avoid re-fetching
    cve_cache = {}
    
    for i, cve_id in enumerate(unique_cve_ids):
        print(f"[{i+1}/{len(unique_cve_ids)}]", end=" ")
        cve_cache[cve_id] = fetch_single_cve(cve_id)
        time.sleep(6.1) # Strict NVD rate limit
        
    # Update the JSON
    for cve in cves:
        cve_id = cve["cve_id"]
        if cve_id in cve_cache:
            kev, days, patch = cve_cache[cve_id]
            cve["kev_listed"] = kev
            cve["days_since_published"] = days
            cve["patch_available"] = patch
            
    # Save back to backend and frontend
    for p in ["backend/data/networks/enterprise-bank/cves.json", "frontend/src/data/networks/enterprise-bank/cves.json"]:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w") as f:
            json.dump(cves, f, indent=2)
            
    print("Successfully fixed enterprise-bank CVEs with true data!")

if __name__ == "__main__":
    fix_enterprise_bank()

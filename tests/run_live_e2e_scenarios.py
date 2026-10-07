import json
import urllib.request

SCENARIOS = [
    {
        "label": "Scenario 1: Public GW -> SWIFT (PIGNN + DWM)",
        "payload": {
            "entry_node": "api_gw_1",
            "target_node": "swift_terminal",
            "network_id": "enterprise-bank",
            "algorithm": "pignn",
            "weighting_mode": "dwm"
        }
    },
    {
        "label": "Scenario 2: Admin Console -> Data Warehouse (PIGNN + DWM)",
        "payload": {
            "entry_node": "admin_console_1",
            "target_node": "data_warehouse",
            "network_id": "enterprise-bank",
            "algorithm": "pignn",
            "weighting_mode": "dwm"
        }
    },
    {
        "label": "Scenario 3: Load Balancer -> Core DB (Dijkstra + Static)",
        "payload": {
            "entry_node": "load_balancer_1",
            "target_node": "core_db_node_1",
            "network_id": "enterprise-bank",
            "algorithm": "dijkstra",
            "weighting_mode": "static"
        }
    },
    {
        "label": "Scenario 4: Legacy IoT -> SWIFT (A* + DWM)",
        "payload": {
            "entry_node": "linux_legacy_node",
            "target_node": "swift_terminal",
            "network_id": "enterprise-bank",
            "algorithm": "astar",
            "weighting_mode": "dwm"
        }
    },
    {
        "label": "Scenario 5: Branch VPN -> ATM (PIGNN on Small Branch Bank)",
        "payload": {
            "entry_node": "branch_vpn_gateway",
            "target_node": "atm_controller",
            "network_id": "small-branch-bank",
            "algorithm": "pignn",
            "weighting_mode": "dwm"
        }
    },
    {
        "label": "Scenario 6: Exchange -> Mainframe (PIGNN on Legacy IoT Bank)",
        "payload": {
            "entry_node": "unpatched_exchange",
            "target_node": "mainframe_terminal",
            "network_id": "legacy-iot-bank",
            "algorithm": "pignn",
            "weighting_mode": "dwm"
        }
    }
]

def run_scenarios():
    print("=" * 70)
    print("LIVE MULTI-SCENARIO E2E SIMULATION VERIFICATION")
    print("Testing against running FastAPI backend on http://127.0.0.1:8000")
    print("=" * 70)

    for item in SCENARIOS:
        label = item["label"]
        payload = item["payload"]
        req = urllib.request.Request(
            "http://127.0.0.1:8000/simulate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                body = resp.read().decode("utf-8")
                lines = [l for l in body.split("\n\n") if l.strip()]
                first_line = [l for l in lines if l.startswith("data: {")][0]
                first_event = json.loads(first_line.replace("data: ", ""))
                path_info = first_event["data"][0] if isinstance(first_event["data"], list) else first_event["data"]

                token_lines = [l for l in lines if '"type": "token"' in l]
                print(f"\n[OK] {label}")
                print(f"     Path       : {' -> '.join(path_info.get('path', []))}")
                print(f"     Engine     : {path_info.get('algorithm', 'classical')}")
                if "pignn_confidence" in path_info:
                    print(f"     Confidence : {path_info.get('pignn_confidence')}%")
                print(f"     Hops       : {path_info.get('total_hops')}")
                print(f"     Risk Weight: {path_info.get('total_weight'):.2f}")
                print(f"     LLM Tokens : {len(token_lines)} streamed")
        except Exception as e:
            print(f"\n[FAIL] {label}: {e}")

if __name__ == "__main__":
    run_scenarios()

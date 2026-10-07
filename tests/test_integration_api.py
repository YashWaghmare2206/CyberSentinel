import os
import sys
import json
import unittest
from fastapi.testclient import TestClient

BACKEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app


class TestAPIIntegration(unittest.TestCase):
    """Integration test suite for FastAPI backend endpoints."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_get_networks(self):
        """GET /networks returns registered banking networks."""
        res = self.client.get("/networks")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        network_ids = [n["id"] for n in data]
        self.assertIn("enterprise-bank", network_ids)

    def test_get_options(self):
        """GET /options returns entry point and end goal dictionaries."""
        res = self.client.get("/options")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("sources", data)
        self.assertIn("destinations", data)

    def test_simulate_pignn_dwm(self):
        """POST /simulate with PIGNN and DWM weighting."""
        payload = {
            "entry_node": "api_gw_1",
            "target_node": "swift_terminal",
            "network_id": "enterprise-bank",
            "algorithm": "pignn",
            "weighting_mode": "dwm",
        }
        res = self.client.post("/simulate", json=payload)
        self.assertEqual(res.status_code, 200)

        chunks = [c for c in res.text.split("\n\n") if c.strip()]
        self.assertGreater(len(chunks), 2)

        # Check path event
        first_event = json.loads(chunks[0].replace("data: ", ""))
        self.assertEqual(first_event["type"], "path")
        paths = first_event["data"]
        self.assertIsInstance(paths, list)
        self.assertGreater(len(paths), 0)

        top = paths[0]
        self.assertEqual(top["path"][0], "api_gw_1")
        self.assertEqual(top["path"][-1], "swift_terminal")
        self.assertEqual(top.get("algorithm"), "pignn")
        self.assertIn("pignn_confidence", top)

        # Check that token events streamed
        token_events = [c for c in chunks if '"type": "token"' in c]
        self.assertGreater(len(token_events), 0)

        # Check stream completion marker
        self.assertIn("data: [DONE]", res.text)

    def test_simulate_dijkstra_static(self):
        """POST /simulate with classical Dijkstra and static CVSS (backward compatibility)."""
        payload = {
            "entry_node": "api_gw_1",
            "target_node": "swift_terminal",
            "network_id": "enterprise-bank",
            "algorithm": "dijkstra",
            "weighting_mode": "static",
        }
        res = self.client.post("/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertIn('"type": "path"', res.text)
        self.assertIn("data: [DONE]", res.text)

    def test_simulate_astar(self):
        """POST /simulate with A* algorithm."""
        payload = {
            "entry_node": "api_gw_1",
            "target_node": "swift_terminal",
            "network_id": "enterprise-bank",
            "algorithm": "astar",
            "weighting_mode": "dwm",
        }
        res = self.client.post("/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertIn('"type": "path"', res.text)

    def test_simulate_across_all_networks(self):
        """POST /simulate runs successfully across all topology sizes."""
        networks = [
            ("enterprise-bank", "api_gw_1", "swift_terminal"),
            ("small-branch-bank", "branch_vpn_gateway", "atm_controller"),
            ("legacy-iot-bank", "legacy_hvac_controller", "mainframe_terminal"),
        ]
        for net, src, dst in networks:
            payload = {
                "entry_node": src,
                "target_node": dst,
                "network_id": net,
                "algorithm": "pignn",
                "weighting_mode": "dwm",
            }
            res = self.client.post("/simulate", json=payload)
            self.assertEqual(res.status_code, 200, f"Failed on network {net}")
            self.assertIn('"type": "path"', res.text)

    def test_fix_endpoint(self):
        """POST /fix yields remediations for a provided attack path."""
        payload = {
            "attack_path": {
                "path": ["api_gw_1", "web_app_1", "core_db_node_1"],
                "nodes": [
                    {"name": "Gateway", "software": "Apache", "cves": []},
                    {"name": "App", "software": "Node.js", "cves": [{"cve_id": "CVE-2023-0001", "cvss_score": 8.0}]},
                    {"name": "Core DB", "software": "Oracle", "cves": []},
                ],
                "total_hops": 2,
            }
        }
        res = self.client.post("/fix", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertIn("data: [DONE]", res.text)

    def test_invalid_node_error_handling(self):
        """POST /simulate with invalid nodes returns structured SSE error event."""
        payload = {
            "entry_node": "non_existent_entry_node_12345",
            "target_node": "swift_terminal",
            "network_id": "enterprise-bank",
            "algorithm": "pignn",
        }
        res = self.client.post("/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertIn('"type": "error"', res.text)


if __name__ == "__main__":
    unittest.main()

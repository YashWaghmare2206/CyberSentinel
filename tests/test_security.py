import os
import sys
import unittest
from fastapi.testclient import TestClient

BACKEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app
from pignn.preprocess import GraphTensorPreprocessor
import networkx as nx


class TestSecurityDefenses(unittest.TestCase):
    """Security and robustness test suite for CyberSentinel backend."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_path_traversal_defense(self):
        """Verify that directory traversal payloads in network_id do not read host files."""
        traversal_payloads = [
            "../../../../etc/passwd",
            "..\\..\\..\\windows\\win.ini",
            "../../main.py",
            "../data/networks/enterprise-bank",
            "....//....//enterprise-bank",
            "/etc/shadow",
            "C:\\Windows\\System32\\drivers\\etc\\hosts",
        ]

        for payload_id in traversal_payloads:
            payload = {
                "entry_node": "api_gw_1",
                "target_node": "swift_terminal",
                "network_id": payload_id,
                "algorithm": "pignn",
            }
            res = self.client.post("/simulate", json=payload)
            self.assertEqual(res.status_code, 200)
            # Must return a safe SSE error event and NOT leak file contents or crash 500
            self.assertIn('"type": "error"', res.text, f"Failed to defend against traversal: {payload_id}")
            self.assertNotIn("root:", res.text)
            self.assertNotIn("[fonts]", res.text)

    def test_malformed_json_resilience(self):
        """Verify API handles unexpected JSON structures with proper 422 HTTP validation errors."""
        res = self.client.post(
            "/simulate",
            content=b'{"entry_node": 12345, "network_id": ["not_a_string"]}',
            headers={"Content-Type": "application/json"}
        )
        self.assertEqual(res.status_code, 422)

    def test_empty_fix_payload_handling(self):
        """Verify /fix endpoint returns structured error for missing or empty attack paths."""
        res = self.client.post("/fix", json={"attack_path": {}})
        self.assertEqual(res.status_code, 200)
        self.assertIn('"type": "error"', res.text)

    def test_cors_headers(self):
        """Verify CORS headers permit secure cross-origin dashboard interaction."""
        res = self.client.options(
            "/simulate",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
            }
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("access-control-allow-origin", res.headers)

    def test_graph_preprocessor_oversized_guard(self):
        """Verify preprocessor strictly guards against oversized graphs exceeding MAX_NODES (64)."""
        preprocessor = GraphTensorPreprocessor(max_nodes=64)
        giant_graph = nx.DiGraph()
        for i in range(70):
            giant_graph.add_node(f"node_{i}", type="internal", cvss_score=5.0)

        with self.assertRaises(ValueError) as ctx:
            preprocessor.process_graph(giant_graph)
        self.assertIn("exceeding MAX_NODES=64", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()

import os
import sys
import unittest
import torch
import networkx as nx

# Add backend to path
BACKEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from pignn.config import MAX_NODES, NODE_FEATURE_DIM, NUM_RELATIONS
from pignn.model import TypedGraphSAGELayer, PIGNNPathPredictor
from pignn.loss import PhysicsInformedLoss
from pignn.preprocess import GraphTensorPreprocessor, map_protocol_to_relation
from pignn.decoder import ConstrainedPathDecoder
from graph import build_graph, find_attack_paths
from dwm_scorer import calculate_dynamic_weight


class TestPIGNNUnit(unittest.TestCase):
    """Unit tests for PIGNN components, architecture, and mathematics."""

    def test_protocol_mapping(self):
        """Verify protocol to relation mapping logic."""
        self.assertEqual(map_protocol_to_relation("HTTPS"), "api_call")
        self.assertEqual(map_protocol_to_relation("REST API"), "api_call")
        self.assertEqual(map_protocol_to_relation("SQL Server"), "database_access")
        self.assertEqual(map_protocol_to_relation("SSH"), "admin_access")
        self.assertEqual(map_protocol_to_relation("LDAP"), "authentication")
        self.assertEqual(map_protocol_to_relation("MODBUS"), "legacy_protocol")
        self.assertEqual(map_protocol_to_relation("VPN"), "network_route")

    def test_preprocessor_tensors(self):
        """Verify preprocessor produces properly sized and normalized tensors."""
        G = build_graph("small-branch-bank", weighting_mode="dwm")
        preprocessor = GraphTensorPreprocessor(max_nodes=MAX_NODES)
        nodes = list(G.nodes())
        tensors = preprocessor.process_graph(G, entry_node=nodes[0], target_node=nodes[-1])

        self.assertEqual(tensors["x"].shape, (MAX_NODES, NODE_FEATURE_DIM))
        self.assertEqual(tensors["adj"].shape, (MAX_NODES, MAX_NODES, NUM_RELATIONS))
        self.assertEqual(tensors["node_mask"].shape, (MAX_NODES,))
        self.assertEqual(tensors["edge_mask"].shape, (MAX_NODES, MAX_NODES))
        self.assertEqual(int(tensors["node_mask"].sum().item()), len(nodes))

        # Check normalization bounds [0, 1] on node features
        f = tensors["x"][:len(nodes)]
        self.assertTrue(torch.all(f >= 0.0) and torch.all(f <= 1.0), "Node features must be normalized in [0, 1]")

    def test_model_forward_pass(self):
        """Verify PIGNN model forward pass dimensions and property constraints."""
        B, N = 2, MAX_NODES
        model = PIGNNPathPredictor()
        x = torch.rand(B, N, NODE_FEATURE_DIM)
        adj = torch.rand(B, N, N, NUM_RELATIONS)
        mask = torch.ones(B, N)
        mask[:, 30:] = 0.0  # simulate padding

        y_hat = model(x, adj, mask)

        self.assertEqual(y_hat.shape, (B, N, N))
        # Sigmoid bounds [0, 1]
        self.assertTrue(torch.all(y_hat >= 0.0) and torch.all(y_hat <= 1.0))

        # Diagonal must be 0 (no self loops)
        for b in range(B):
            diag = torch.diagonal(y_hat[b])
            self.assertTrue(torch.all(diag == 0.0), "Self-loops must be masked to zero")

        # Padded nodes must be 0
        self.assertTrue(torch.all(y_hat[:, 30:, :] == 0.0), "Padded node outputs must be zero")
        self.assertTrue(torch.all(y_hat[:, :, 30:] == 0.0), "Padded node outputs must be zero")

    def test_physics_loss_computation(self):
        """Verify PhysicsInformedLoss computes all required penalties cleanly without NaN."""
        B, N = 2, MAX_NODES
        criterion = PhysicsInformedLoss()

        y_hat = torch.rand(B, N, N)
        y_true = torch.zeros(B, N, N)
        y_true[0, 1, 2] = 1.0
        y_true[0, 2, 3] = 1.0

        edge_mask = torch.ones(B, N, N)
        node_mask = torch.ones(B, N)
        entry_idx = torch.tensor([1, 0])
        target_idx = torch.tensor([3, 5])

        loss_dict = criterion(y_hat, y_true, edge_mask, node_mask, entry_idx, target_idx)

        self.assertIn("total_loss", loss_dict)
        self.assertIn("data_loss", loss_dict)
        self.assertIn("degree_loss", loss_dict)
        self.assertIn("continuity_loss", loss_dict)
        self.assertIn("cycle_loss", loss_dict)

        self.assertFalse(torch.isnan(loss_dict["total_loss"]), "Loss should not be NaN")
        self.assertTrue(loss_dict["total_loss"].item() > 0.0)

    def test_constrained_decoder(self):
        """Verify decoder strictly follows real network topology and prevents hallucinated edges."""
        G = nx.DiGraph()
        G.add_edge("A", "B", weight=1.0, protocol="HTTP")
        G.add_edge("B", "C", weight=1.0, protocol="HTTP")
        # No edge A -> C exists in G!
        G.nodes["A"]["risk"] = 5.0
        G.nodes["B"]["risk"] = 7.0
        G.nodes["C"]["risk"] = 9.0

        decoder = ConstrainedPathDecoder()
        node_order = ["A", "B", "C"]
        y_hat = torch.zeros(MAX_NODES, MAX_NODES)
        # Model predicts direct connection A -> C with 0.99 probability
        y_hat[0, 2] = 0.99
        y_hat[0, 1] = 0.80
        y_hat[1, 2] = 0.85

        edge_mask = torch.zeros(MAX_NODES, MAX_NODES)
        edge_mask[0, 1] = 1.0
        edge_mask[1, 2] = 1.0
        # edge_mask[0, 2] remains 0.0 (no physical edge)

        paths = decoder.decode(y_hat, edge_mask, node_order, G, "A", "C")
        self.assertGreater(len(paths), 0)
        top = paths[0]
        # Decoded path must NOT be ["A", "C"], it must be ["A", "B", "C"]!
        self.assertEqual(top["path"], ["A", "B", "C"], "Decoder must not take non-existent shortcut A -> C")
        self.assertIn("pignn_confidence", top)
        self.assertTrue(0.0 <= top["pignn_confidence"] <= 100.0)

    def test_dwm_scorer_logic(self):
        """Verify DWM scorer adjusts CVSS with temporal and environmental context."""
        weight_static, adj_static = calculate_dynamic_weight(
            base_cvss=7.0,
            kev_listed=False,
            days_since_published=10,
            patch_available=True,
            exposure="internal"
        )
        self.assertEqual(adj_static, 7.0)
        self.assertAlmostEqual(weight_static, 3.0, places=2)

        # Active KEV + Public exposure increases adjusted risk
        weight_high, adj_high = calculate_dynamic_weight(
            base_cvss=7.0,
            kev_listed=True,
            days_since_published=10,
            patch_available=False,
            exposure="public"
        )
        self.assertGreater(adj_high, adj_static)
        self.assertLess(weight_high, weight_static)  # lower edge weight = higher priority in graph


if __name__ == "__main__":
    unittest.main()

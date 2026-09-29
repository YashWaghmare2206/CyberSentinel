import math
import torch
import networkx as nx
from typing import Dict, List, Tuple, Any, Optional

from .config import (
    MAX_NODES,
    NODE_FEATURE_DIM,
    RELATION_TYPES,
    RELATION_TO_IDX,
    NUM_RELATIONS,
    NODE_ROLES,
    EXPOSURE_LEVELS,
)


def map_protocol_to_relation(protocol: str, source_node: str = "", target_node: str = "") -> str:
    """
    Deterministically maps network edge protocol and context into the canonical 8 relation families.
    """
    proto = (protocol or "").upper()

    if any(p in proto for p in ["MODBUS", "DNP3", "SCADA", "LEGACY", "SERIAL", "BACNET"]):
        return "legacy_protocol"
    if any(p in proto for p in ["HTTP", "HTTPS", "REST", "API", "WEB", "SOAP"]):
        return "api_call"
    if any(p in proto for p in ["SQL", "ORACLE", "POSTGRES", "MYSQL", "MONGO", "DATABASE", "TNS", "DB_"]):
        return "database_access"
    if proto == "DB":
        return "database_access"
    if any(p in proto for p in ["SSH", "RDP", "TELNET", "VNC", "WINRM"]):
        return "admin_access"
    if any(p in proto for p in ["LDAP", "KERBEROS", "ACTIVE_DIRECTORY", "AUTH", "RADIUS"]):
        return "authentication"
    if any(p in proto for p in ["RPC", "SMB", "NFS", "GRPC"]):
        return "remote_service"
    if any(p in proto for p in ["FIREWALL", "FW", "IPTABLES", "ACL"]):
        return "firewall_control"
    if any(p in proto for p in ["TCP", "UDP", "VPN", "IPSEC", "ROUTER", "GATEWAY", "DNS", "BGP", "ICMP"]):
        return "network_route"

    # Secondary heuristic based on target name
    tgt = target_node.lower()
    if "db" in tgt or "warehouse" in tgt:
        return "database_access"
    if "admin" in tgt or "console" in tgt:
        return "admin_access"
    if "ad_" in tgt or "controller" in tgt:
        return "authentication"
    if "gw" in tgt or "balancer" in tgt or "proxy" in tgt:
        return "network_route"

    return "network_route"


class GraphTensorPreprocessor:
    """
    Converts a NetworkX graph or raw CyberSentinel network dict into fixed-size padded PyTorch tensors.
    """

    def __init__(self, max_nodes: int = MAX_NODES):
        self.max_nodes = max_nodes

    def process_graph(
        self,
        G: nx.DiGraph,
        entry_node: Optional[str] = None,
        target_node: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Converts in-memory DiGraph to padded tensors.
        """
        node_order: List[str] = list(G.nodes())
        num_nodes = len(node_order)

        if num_nodes > self.max_nodes:
            raise ValueError(f"Graph has {num_nodes} nodes, exceeding MAX_NODES={self.max_nodes}")

        node_to_idx = {node: idx for idx, node in enumerate(node_order)}

        # Allocate tensors
        # F: [max_nodes, 20]
        # A: [max_nodes, max_nodes, 8]
        # M: [max_nodes]
        # E: [max_nodes, max_nodes]
        f_matrix = torch.zeros(self.max_nodes, NODE_FEATURE_DIM, dtype=torch.float32)
        adj_tensor = torch.zeros(self.max_nodes, self.max_nodes, NUM_RELATIONS, dtype=torch.float32)
        node_mask = torch.zeros(self.max_nodes, dtype=torch.float32)
        edge_mask = torch.zeros(self.max_nodes, self.max_nodes, dtype=torch.float32)

        # Populate valid node mask
        node_mask[:num_nodes] = 1.0

        # Degree calculations for normalization
        in_degrees = dict(G.in_degree())
        out_degrees = dict(G.out_degree())
        max_deg = max(1, num_nodes)

        # 1. Populate Node Features
        for idx, node_id in enumerate(node_order):
            data = G.nodes[node_id]
            feat = [0.0] * NODE_FEATURE_DIM

            # Features 0..6: Node role one-hot
            role = data.get("type", "internal")
            for r_idx, r_name in enumerate(NODE_ROLES):
                if role == r_name or (r_name == "web_app" and "app" in role) or (r_name == "database" and "db" in role):
                    feat[r_idx] = 1.0
                    break
            else:
                feat[6] = 1.0  # default to internal

            # Features 7..9: Exposure level one-hot
            exposure = data.get("exposure", "internal")
            for e_idx, e_name in enumerate(EXPOSURE_LEVELS):
                if exposure == e_name:
                    feat[7 + e_idx] = 1.0
                    break
            else:
                feat[8] = 1.0  # internal

            # Feature 10: base_cvss_max normalized [0, 1]
            cvss = float(data.get("cvss_score", 0.0))
            feat[10] = min(1.0, max(0.0, cvss / 10.0))

            # Feature 11: dwm_adjusted_score normalized [0, 1]
            adj_cvss = float(data.get("adjusted_weight", cvss))
            feat[11] = min(1.0, max(0.0, adj_cvss / 10.0))

            # Feature 12: cve_count (log normalized)
            cves = data.get("cves", [])
            cve_count = len(cves)
            feat[12] = min(1.0, math.log1p(cve_count) / math.log1p(20))

            # Feature 13: kev_listed
            has_kev = any(c.get("kev_listed", False) for c in cves)
            feat[13] = 1.0 if has_kev else 0.0

            # Feature 14: patch_unavailable
            patch_unavail = any(not c.get("patch_available", True) for c in cves)
            feat[14] = 1.0 if patch_unavail else 0.0

            # Feature 15: vulnerability age normalized
            max_days = max([c.get("days_since_published", 0) for c in cves], default=0)
            feat[15] = min(1.0, max_days / 3650.0)

            # Feature 16: in_degree normalized
            feat[16] = min(1.0, in_degrees.get(node_id, 0) / max_deg)

            # Feature 17: out_degree normalized
            feat[17] = min(1.0, out_degrees.get(node_id, 0) / max_deg)

            # Feature 18: is_entry_node
            feat[18] = 1.0 if entry_node and node_id == entry_node else 0.0

            # Feature 19: is_target_node
            feat[19] = 1.0 if target_node and node_id == target_node else 0.0

            f_matrix[idx] = torch.tensor(feat, dtype=torch.float32)

        # 2. Populate Typed Edges
        for u, v, edge_data in G.edges(data=True):
            if u in node_to_idx and v in node_to_idx:
                u_idx = node_to_idx[u]
                v_idx = node_to_idx[v]

                proto = edge_data.get("protocol", "TCP")
                relation = edge_data.get("relation") or map_protocol_to_relation(proto, u, v)
                rel_idx = RELATION_TO_IDX.get(relation, 6)  # fallback to network_route (6)

                adj_tensor[u_idx, v_idx, rel_idx] = 1.0
                edge_mask[u_idx, v_idx] = 1.0

        entry_idx = node_to_idx.get(entry_node, 0) if entry_node else 0
        target_idx = node_to_idx.get(target_node, num_nodes - 1) if target_node else (num_nodes - 1)

        return {
            "x": f_matrix,                # [max_nodes, 20]
            "adj": adj_tensor,            # [max_nodes, max_nodes, 8]
            "node_mask": node_mask,       # [max_nodes]
            "edge_mask": edge_mask,       # [max_nodes, max_nodes]
            "node_order": node_order,
            "node_to_idx": node_to_idx,
            "entry_idx": entry_idx,
            "target_idx": target_idx,
            "num_nodes": num_nodes,
        }

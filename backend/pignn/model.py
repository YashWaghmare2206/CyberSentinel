import torch
import torch.nn as nn
import torch.nn.functional as F
from .config import (
    NODE_FEATURE_DIM,
    NUM_RELATIONS,
    HIDDEN_DIM,
    DROPOUT,
    MAX_NODES,
)


class TypedGraphSAGELayer(nn.Module):
    """
    Pure PyTorch relation-aware GraphSAGE layer.
    Performs message-passing aggregation across multiple edge relation types.
    """

    def __init__(self, in_dim: int, out_dim: int, num_relations: int = NUM_RELATIONS):
        super().__init__()
        self.in_dim = in_dim
        self.out_dim = out_dim
        self.num_relations = num_relations

        self.w_self = nn.Linear(in_dim, out_dim, bias=False)
        self.w_rel = nn.ModuleList([
            nn.Linear(in_dim, out_dim, bias=False) for _ in range(num_relations)
        ])
        self.bias = nn.Parameter(torch.zeros(out_dim))
        self.layer_norm = nn.LayerNorm(out_dim)

    def forward(self, h: torch.Tensor, a: torch.Tensor, mask: torch.Tensor = None) -> torch.Tensor:
        """
        h: [B, N, in_dim]
        a: [B, N, N, num_relations]
        mask: [B, N] (1 for valid nodes, 0 for padded)
        """
        B, N, _ = h.shape

        # Self transformation
        self_feat = self.w_self(h)  # [B, N, out_dim]

        # Neighbor aggregation across edge relations
        rel_messages = torch.zeros(B, N, self.out_dim, device=h.device, dtype=h.dtype)

        for r in range(self.num_relations):
            # Adjacency slice for relation r: [B, N, N]
            adj_r = a[:, :, :, r]
            # Normalization factor (in-degree per relation + eps)
            deg_r = adj_r.sum(dim=-1, keepdim=True) + 1e-6
            norm_adj_r = adj_r / deg_r

            # Aggregate neighbor features: [B, N, in_dim]
            neigh_feat = torch.bmm(norm_adj_r, h)
            # Transform aggregated features for relation r
            rel_messages = rel_messages + self.w_rel[r](neigh_feat)

        out = F.relu(self_feat + rel_messages + self.bias)
        out = self.layer_norm(out)

        if mask is not None:
            out = out * mask.unsqueeze(-1)

        return out


class PIGNNPathPredictor(nn.Module):
    """
    Complete CyberSentinel PIGNN Model:
    1. Node feature encoder (Linear -> ReLU)
    2. 2-layer Typed GraphSAGE message passing
    3. Inductive Pairwise Edge MLP Head
    Outputs predicted attack-path edge probabilities Y_hat in [0, 1]^(N x N).
    """

    def __init__(
        self,
        in_dim: int = NODE_FEATURE_DIM,
        hidden_dim: int = HIDDEN_DIM,
        num_relations: int = NUM_RELATIONS,
        dropout: float = DROPOUT,
    ):
        super().__init__()
        self.in_dim = in_dim
        self.hidden_dim = hidden_dim
        self.num_relations = num_relations

        # Initial node feature projection
        self.node_proj = nn.Sequential(
            nn.Linear(in_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
        )

        # GraphSAGE encoder layers
        self.gnn1 = TypedGraphSAGELayer(hidden_dim, hidden_dim, num_relations)
        self.gnn2 = TypedGraphSAGELayer(hidden_dim, hidden_dim, num_relations)
        self.dropout = nn.Dropout(dropout)

        # Pairwise inductive edge head
        # Input features for (u, v): [h_u, h_v, h_u * h_v, h_u - h_v] -> 4 * hidden_dim
        pair_dim = hidden_dim * 4
        self.edge_head = nn.Sequential(
            nn.Linear(pair_dim, hidden_dim * 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid(),
        )

    def forward(
        self,
        x: torch.Tensor,
        a: torch.Tensor,
        mask: torch.Tensor = None,
    ) -> torch.Tensor:
        """
        x: [B, N, in_dim] - Node features
        a: [B, N, N, R] - Typed edge tensor
        mask: [B, N] - Valid node mask (1 for real node, 0 for pad)
        Returns:
        y_hat: [B, N, N] - Attack path transition probabilities
        """
        B, N, _ = x.shape

        if mask is None:
            mask = torch.ones(B, N, device=x.device, dtype=x.dtype)

        # 1. Project node features
        h = self.node_proj(x)
        h = h * mask.unsqueeze(-1)

        # 2. Message passing
        h = self.gnn1(h, a, mask)
        h = self.dropout(h)
        h = self.gnn2(h, a, mask)
        h = self.dropout(h)

        # 3. Compute pairwise edge representations
        # h_u: [B, N, 1, D] -> [B, N, N, D]
        # h_v: [B, 1, N, D] -> [B, N, N, D]
        h_u = h.unsqueeze(2).expand(B, N, N, self.hidden_dim)
        h_v = h.unsqueeze(1).expand(B, N, N, self.hidden_dim)

        phi = torch.cat([
            h_u,
            h_v,
            h_u * h_v,
            h_u - h_v,
        ], dim=-1)  # [B, N, N, 4 * hidden_dim]

        # 4. Predict edge probabilities
        y_hat = self.edge_head(phi).squeeze(-1)  # [B, N, N]

        # 5. Mask self-loops and padded nodes
        diag_mask = (1.0 - torch.eye(N, device=x.device)).unsqueeze(0)  # [1, N, N]
        node_pair_mask = mask.unsqueeze(1) * mask.unsqueeze(2)  # [B, N, N]

        y_hat = y_hat * diag_mask * node_pair_mask
        return y_hat

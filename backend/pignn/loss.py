import torch
import torch.nn as nn
import torch.nn.functional as F
from .config import (
    POS_WEIGHT,
    ALPHA_DEGREE,
    BETA_CONTINUITY,
    ZETA_CYCLE,
)


class PhysicsInformedLoss(nn.Module):
    """
    Stabilized Physics-Informed Multi-Objective Loss:
    - Data Loss: Weighted BCE on real edges and sampled non-edges
    - Degree Loss: Directed flow conservation (s -> intermediate -> t)
    - Continuity Loss: Penalizes branching (out-degree > 1 or in-degree > 1)
    - Cycle Loss: Penalizes back-and-forth transitions and closed loops
    """

    def __init__(
        self,
        pos_weight: float = POS_WEIGHT,
        alpha_degree: float = ALPHA_DEGREE,
        beta_continuity: float = BETA_CONTINUITY,
        zeta_cycle: float = ZETA_CYCLE,
        eps: float = 1e-7,
    ):
        super().__init__()
        self.pos_weight = pos_weight
        self.alpha_degree = alpha_degree
        self.beta_continuity = beta_continuity
        self.zeta_cycle = zeta_cycle
        self.eps = eps

    def forward(
        self,
        y_hat: torch.Tensor,
        y_true: torch.Tensor,
        edge_mask: torch.Tensor,
        node_mask: torch.Tensor,
        entry_idx: torch.Tensor,
        target_idx: torch.Tensor,
    ) -> dict:
        """
        y_hat: [B, N, N] - Predicted probabilities
        y_true: [B, N, N] - Binary ground truth path adjacency
        edge_mask: [B, N, N] - Topology mask (1 if edge exists, 0 otherwise)
        node_mask: [B, N] - 1 for valid nodes, 0 for pad
        entry_idx: [B] - Index of entry node
        target_idx: [B] - Index of target node
        """
        B, N, _ = y_hat.shape
        device = y_hat.device

        # -------------------------------------------------------------
        # 1. Masked Weighted BCE Data Loss
        # -------------------------------------------------------------
        # We compute loss over existing edges + valid node pairs
        valid_pairs = node_mask.unsqueeze(1) * node_mask.unsqueeze(2)
        diag_mask = (1.0 - torch.eye(N, device=device)).unsqueeze(0)
        calc_mask = valid_pairs * diag_mask

        # Numerical clamping
        y_pred = torch.clamp(y_hat, min=self.eps, max=1.0 - self.eps)

        bce_pos = -self.pos_weight * y_true * torch.log(y_pred)
        bce_neg = -(1.0 - y_true) * torch.log(1.0 - y_pred)
        bce_matrix = (bce_pos + bce_neg) * calc_mask

        num_valid = calc_mask.sum().clamp(min=1.0)
        data_loss = bce_matrix.sum() / num_valid

        # -------------------------------------------------------------
        # 2. Degree Loss: Flow Conservation
        # -------------------------------------------------------------
        # in_deg: sum over incoming edges u -> v (dim=1)
        # out_deg: sum over outgoing edges v -> w (dim=2)
        in_degree = y_hat.sum(dim=1)   # [B, N]
        out_degree = y_hat.sum(dim=2)  # [B, N]

        # Target flow delta: delta_s = -1, delta_t = +1, others = 0
        delta = torch.zeros(B, N, device=device)
        for b in range(B):
            delta[b, entry_idx[b]] = -1.0
            delta[b, target_idx[b]] = 1.0

        # For intermediate nodes, in_degree - out_degree == 0
        # For entry node, in_degree - out_degree == -1
        # For target node, in_degree - out_degree == +1
        flow_imbalance = (in_degree - out_degree) - delta  # [B, N]
        degree_loss = ((flow_imbalance ** 2) * node_mask).sum() / node_mask.sum().clamp(min=1.0)

        # -------------------------------------------------------------
        # 3. Continuity Loss: Branch Suppression
        # -------------------------------------------------------------
        # Attack path edges shouldn't branch to > 1 next hop simultaneously
        excess_out = F.relu(out_degree - 1.0) ** 2
        excess_in = F.relu(in_degree - 1.0) ** 2
        continuity_loss = ((excess_out + excess_in) * node_mask).sum() / node_mask.sum().clamp(min=1.0)

        # -------------------------------------------------------------
        # 4. Cycle Loss: 2-cycle and 3-cycle suppression
        # -------------------------------------------------------------
        # 2-cycle: u -> v and v -> u simultaneously
        two_cycles = (y_hat * y_hat.transpose(1, 2) * edge_mask).sum() / (B * N)

        # 3-cycle: trace of Y_hat^3
        y_norm = y_hat / (y_hat.sum(dim=-1, keepdim=True) + 1.0)
        y_cube = torch.bmm(torch.bmm(y_norm, y_norm), y_norm)
        three_cycles = torch.diagonal(y_cube, dim1=-2, dim2=-1).sum() / (B * N)

        cycle_loss = two_cycles + 0.5 * three_cycles

        # -------------------------------------------------------------
        # 5. Combined Physics-Informed Multi-Objective Loss
        # -------------------------------------------------------------
        total_loss = (
            data_loss
            + self.alpha_degree * degree_loss
            + self.beta_continuity * continuity_loss
            + self.zeta_cycle * cycle_loss
        )

        return {
            "total_loss": total_loss,
            "data_loss": data_loss.item(),
            "degree_loss": degree_loss.item(),
            "continuity_loss": continuity_loss.item(),
            "cycle_loss": cycle_loss.item(),
        }

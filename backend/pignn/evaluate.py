import os
import sys
import time
import math
import torch
import numpy as np
from sklearn.metrics import roc_auc_score, precision_recall_fscore_support

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from pignn.config import WEIGHTS_PATH, GENERATED_DATA_DIR
from pignn.model import PIGNNPathPredictor
from pignn.dataset import CyberSentinelPIGNNDataset


def evaluate_pignn(weights_path: str = WEIGHTS_PATH):
    print("=" * 60)
    print("CYBERSENTINEL PIGNN EVALUATION & BENCHMARKING")
    print("=" * 60)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    if not os.path.exists(weights_path):
        print(f"Error: Weights file not found at {weights_path}")
        return

    model = PIGNNPathPredictor().to(device)
    model.load_state_dict(torch.load(weights_path, map_location=device, weights_only=True))
    model.eval()

    dataset = CyberSentinelPIGNNDataset(data_dir=GENERATED_DATA_DIR)
    print(f"[*] Evaluating on {len(dataset)} banking graph samples...")

    all_preds = []
    all_targets = []
    latencies = []
    exact_matches = 0
    cycle_free_count = 0

    with torch.no_grad():
        for i in range(len(dataset)):
            sample = dataset[i]
            x = sample["x"].unsqueeze(0).to(device)
            adj = sample["adj"].unsqueeze(0).to(device)
            node_mask = sample["node_mask"].unsqueeze(0).to(device)
            edge_mask = sample["edge_mask"].to(device)
            y_true = sample["y_true"].to(device)

            start_t = time.perf_counter()
            y_hat = model(x, adj, node_mask).squeeze(0)  # [N, N]
            latencies.append((time.perf_counter() - start_t) * 1000.0)

            # Apply topology edge mask
            masked_y_hat = (y_hat * edge_mask).cpu().numpy()
            masked_y_true = y_true.cpu().numpy()
            valid_mask = (edge_mask.cpu().numpy() > 0)

            # Collect edge-level probabilities for valid network edges
            if np.any(valid_mask):
                preds = masked_y_hat[valid_mask]
                targets = masked_y_true[valid_mask]
                all_preds.extend(preds)
                all_targets.extend(targets)

            # Check 2-cycle freedom
            two_cycles = np.sum(masked_y_hat * masked_y_hat.T)
            if two_cycles < 0.5:
                cycle_free_count += 1

            # Check top predicted edges vs target
            bin_preds = (masked_y_hat > 0.5).astype(float)
            if np.array_equal(bin_preds * valid_mask, masked_y_true * valid_mask):
                exact_matches += 1

    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)

    # Metrics
    auc = roc_auc_score(all_targets, all_preds) if len(np.unique(all_targets)) > 1 else 0.5
    bin_preds = (all_preds > 0.4).astype(int)
    precision, recall, f1, _ = precision_recall_fscore_support(all_targets, bin_preds, average="binary", zero_division=0)
    avg_latency = np.mean(latencies)
    p95_latency = np.percentile(latencies, 95)
    cycle_free_pct = (cycle_free_count / len(dataset)) * 100.0

    print("\n--- PERFORMANCE METRICS ---")
    print(f"ROC-AUC Score          : {auc:.4f}")
    print(f"Edge Precision         : {precision:.4f}")
    print(f"Edge Recall            : {recall:.4f}")
    print(f"Edge F1-Score          : {f1:.4f}")
    print(f"Physics Cycle-Free Rate: {cycle_free_pct:.1f}%")
    print(f"Mean Inference Latency : {avg_latency:.2f} ms")
    print(f"P95 Inference Latency  : {p95_latency:.2f} ms")
    print("---------------------------\n")

    return {
        "auc": auc,
        "f1": f1,
        "precision": precision,
        "recall": recall,
        "cycle_free_pct": cycle_free_pct,
        "avg_latency_ms": avg_latency,
    }


if __name__ == "__main__":
    evaluate_pignn()

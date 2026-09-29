import os
import glob
import torch
from torch.utils.data import Dataset
from typing import List, Dict, Any, Optional

from .config import GENERATED_DATA_DIR


class CyberSentinelPIGNNDataset(Dataset):
    """
    PyTorch Dataset for loading CyberSentinel graph training samples.
    """

    def __init__(self, data_dir: str = GENERATED_DATA_DIR, samples: Optional[List[Dict[str, Any]]] = None):
        self.samples = []
        if samples is not None:
            self.samples = samples
        elif os.path.exists(data_dir):
            file_paths = glob.glob(os.path.join(data_dir, "*.pt"))
            for path in sorted(file_paths):
                try:
                    data = torch.load(path, weights_only=True)
                    self.samples.append(data)
                except Exception as e:
                    print(f"[PIGNN Dataset] Warning: Could not load {path}: {e}")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        item = self.samples[idx]
        return {
            "x": item["x"].float(),
            "adj": item["adj"].float(),
            "y_true": item["y_true"].float(),
            "edge_mask": item["edge_mask"].float(),
            "node_mask": item["node_mask"].float(),
            "entry_idx": torch.tensor(item["entry_idx"], dtype=torch.long),
            "target_idx": torch.tensor(item["target_idx"], dtype=torch.long),
        }

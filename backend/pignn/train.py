import os
import sys
import torch
from torch.utils.data import DataLoader, random_split

# Ensure backend modules are on path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from pignn.config import (
    WEIGHTS_PATH,
    WEIGHTS_DIR,
    GENERATED_DATA_DIR,
    BATCH_SIZE,
    LEARNING_RATE,
    NUM_EPOCHS,
)
from pignn.model import PIGNNPathPredictor
from pignn.loss import PhysicsInformedLoss
from pignn.dataset import CyberSentinelPIGNNDataset


def train_pignn(epochs: int = NUM_EPOCHS, batch_size: int = BATCH_SIZE, lr: float = LEARNING_RATE):
    print("=" * 60)
    print("CYBERSENTINEL PIGNN TRAINING")
    print("Physics-Informed Graph Neural Network for Attack Path Prediction")
    print("=" * 60)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Training on device: {device}")

    # 1. Load dataset
    full_dataset = CyberSentinelPIGNNDataset(data_dir=GENERATED_DATA_DIR)
    if len(full_dataset) == 0:
        raise RuntimeError(f"No samples found in {GENERATED_DATA_DIR}. Please run generate_pignn_dataset.py first.")

    train_size = int(0.8 * len(full_dataset))
    val_size = len(full_dataset) - train_size
    train_set, val_set = random_split(
        full_dataset,
        [train_size, val_size],
        generator=torch.Generator().manual_seed(42),
    )

    train_loader = DataLoader(train_set, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_set, batch_size=batch_size, shuffle=False)
    print(f"[*] Loaded {len(full_dataset)} samples ({train_size} train, {val_size} val)")

    # 2. Setup model, loss, optimizer
    model = PIGNNPathPredictor().to(device)
    criterion = PhysicsInformedLoss().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ExponentialLR(optimizer, gamma=0.96)

    os.makedirs(WEIGHTS_DIR, exist_ok=True)
    best_val_loss = float("inf")

    # 3. Training Loop
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        train_data_loss = 0.0
        train_physics_loss = 0.0

        for batch in train_loader:
            x = batch["x"].to(device)
            adj = batch["adj"].to(device)
            node_mask = batch["node_mask"].to(device)
            edge_mask = batch["edge_mask"].to(device)
            y_true = batch["y_true"].to(device)
            entry_idx = batch["entry_idx"].to(device)
            target_idx = batch["target_idx"].to(device)

            optimizer.zero_grad()
            y_hat = model(x, adj, node_mask)

            loss_dict = criterion(
                y_hat=y_hat,
                y_true=y_true,
                edge_mask=edge_mask,
                node_mask=node_mask,
                entry_idx=entry_idx,
                target_idx=target_idx,
            )

            loss = loss_dict["total_loss"]
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=2.0)
            optimizer.step()

            train_loss += loss.item() * x.size(0)
            train_data_loss += loss_dict["data_loss"] * x.size(0)
            train_physics_loss += (
                loss_dict["degree_loss"] + loss_dict["continuity_loss"] + loss_dict["cycle_loss"]
            ) * x.size(0)

        scheduler.step()

        # Validation
        model.eval()
        val_loss = 0.0
        val_data_loss = 0.0
        with torch.no_grad():
            for batch in val_loader:
                x = batch["x"].to(device)
                adj = batch["adj"].to(device)
                node_mask = batch["node_mask"].to(device)
                edge_mask = batch["edge_mask"].to(device)
                y_true = batch["y_true"].to(device)
                entry_idx = batch["entry_idx"].to(device)
                target_idx = batch["target_idx"].to(device)

                y_hat = model(x, adj, node_mask)
                loss_dict = criterion(
                    y_hat=y_hat,
                    y_true=y_true,
                    edge_mask=edge_mask,
                    node_mask=node_mask,
                    entry_idx=entry_idx,
                    target_idx=target_idx,
                )
                val_loss += loss_dict["total_loss"].item() * x.size(0)
                val_data_loss += loss_dict["data_loss"] * x.size(0)

        epoch_train_loss = train_loss / train_size
        epoch_val_loss = val_loss / val_size
        epoch_val_data = val_data_loss / val_size

        print(
            f"Epoch {epoch:02d}/{epochs:02d} | "
            f"Train Loss: {epoch_train_loss:.4f} | "
            f"Val Loss: {epoch_val_loss:.4f} (Data: {epoch_val_data:.4f}) | "
            f"LR: {scheduler.get_last_lr()[0]:.6f}"
        )

        if epoch_val_loss < best_val_loss:
            best_val_loss = epoch_val_loss
            torch.save(model.state_dict(), WEIGHTS_PATH)

    print(f"\n[OK] Training completed. Best checkpoint saved to: {WEIGHTS_PATH}")
    return WEIGHTS_PATH


if __name__ == "__main__":
    train_pignn()

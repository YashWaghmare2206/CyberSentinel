import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(BASE_DIR)
WEIGHTS_DIR = os.path.join(BACKEND_DIR, "weights")
WEIGHTS_PATH = os.path.join(WEIGHTS_DIR, "cybersentinel_pignn.pth")
DATA_DIR = os.path.join(BACKEND_DIR, "data", "pignn")
GENERATED_DATA_DIR = os.path.join(DATA_DIR, "generated")

os.makedirs(WEIGHTS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(GENERATED_DATA_DIR, exist_ok=True)

MAX_NODES = 64
NODE_FEATURE_DIM = 20

RELATION_TYPES = [
    "api_call",
    "database_access",
    "admin_access",
    "authentication",
    "remote_service",
    "firewall_control",
    "network_route",
    "legacy_protocol",
]
NUM_RELATIONS = len(RELATION_TYPES)
RELATION_TO_IDX = {rel: idx for idx, rel in enumerate(RELATION_TYPES)}

NODE_ROLES = [
    "public",
    "web_app",
    "database",
    "control",
    "critical",
    "endpoint",
    "internal",
]

EXPOSURE_LEVELS = [
    "public",
    "internal",
    "critical",
]

# Model Architecture Config
HIDDEN_DIM = 128
NUM_GNN_LAYERS = 2
DROPOUT = 0.1
LEARNING_RATE = 1e-3
BATCH_SIZE = 16
NUM_EPOCHS = 25

# Loss Configuration
POS_WEIGHT = 15.0  # Counteract severe edge sparsity in N x N adjacency
ALPHA_DEGREE = 0.5  # Weight for directed flow conservation
BETA_CONTINUITY = 0.5  # Weight for branch prevention
ZETA_CYCLE = 0.3  # Weight for cycle suppression

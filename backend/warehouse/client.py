import os
from google.cloud import bigquery
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "your-gcp-project-id")
DATASET_ID = os.getenv("BIGQUERY_DATASET", "cybersentinel_dw")

# Initialize BigQuery client
# In production, this will use Application Default Credentials or a service account key
# Make sure to authenticate locally using `gcloud auth application-default login`
def get_bq_client() -> bigquery.Client:
    """Returns an authenticated BigQuery client."""
    return bigquery.Client(project=PROJECT_ID)

def get_dataset_ref() -> str:
    """Returns the fully qualified dataset reference string."""
    return f"{PROJECT_ID}.{DATASET_ID}"

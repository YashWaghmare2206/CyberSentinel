import os
import sys
import logging

# Add backend directory to Python path so we can import warehouse modules
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from warehouse.client import get_bq_client, get_dataset_ref
from warehouse.etl import extract_and_load_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Force absolute path for GCP credentials
from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, ".env"))
if "GOOGLE_APPLICATION_CREDENTIALS" in os.environ and not os.path.isabs(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(backend_dir, os.environ["GOOGLE_APPLICATION_CREDENTIALS"])

def bootstrap():
    """
    Bootstraps the Data Warehouse for CyberSentinel.
    1. Checks GCP credentials.
    2. Suggests running the SQL schema if not already done.
    3. Triggers the ETL pipeline to load baseline network and CVE data.
    """
    logger.info("Initializing CyberSentinel Data Warehouse Bootstrap...")
    
    try:
        client = get_bq_client()
        dataset_ref = get_dataset_ref()
        logger.info(f"Targeting BigQuery Dataset: {dataset_ref}")
        
        # In a fully automated setup, we would read 001_schema.sql and execute it here.
        logger.info("Note: Please ensure you have run backend/warehouse/sql/001_schema.sql in your GCP console before this step.")
        
        logger.info("Starting initial ETL load...")
        extract_and_load_data()
        
        logger.info("Bootstrap complete! Your dimensions and baseline facts are now populated.")
    except Exception as e:
        logger.error(f"Bootstrap failed. Ensure your backend/.env is configured correctly. Error: {e}")

if __name__ == "__main__":
    bootstrap()

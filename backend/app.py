import multiprocessing
import uvicorn
import time
import os

import sys

sys.path.append(os.path.dirname(__file__))

from database import create_tables
from ingestor import run_ingestor


def start_backend_server():
    """
    Starts the FastAPI Uvicorn server.
    'main:app' tells uvicorn where to find the FastAPI 'app' instance.
    """
    print("Starting backend API server...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, log_level="info")


if __name__ == "__main__":
    print("--- Starting QuantStream Application ---")

    # --- 1. Initialize Database ---
    print("Step 1: Initializing database and tables...")
    create_tables()
    print("Database setup complete.")

    # --- 2. Start Data Ingestor Process ---
    print("Step 2: Starting data ingestor in a background process...")
    ingestor_process = multiprocessing.Process(target=run_ingestor, daemon=True)
    ingestor_process.start()
    print(f"Ingestor process started with PID: {ingestor_process.pid}")

    # --- 3. Start API Server ---
    print("Step 3: Starting main backend API server...")
    start_backend_server()

    print("--- Application has shut down. ---")

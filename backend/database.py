import sqlite3
import os


DB_FOLDER = "database_storage"
DATABASE_NAME = "quantstreamdb.db"

# Full path to the database file.
DB_FILE_PATH = os.path.join(os.path.dirname(__file__), DB_FOLDER, DATABASE_NAME)


def get_db_connection():
    """
    Creates and returns a connection to the SQLite database.
    Ensures the database directory exists.
    """
    # Get the directory part of the path.
    db_dir = os.path.dirname(DB_FILE_PATH)
    # Create the directory if it doesn't exist.
    os.makedirs(db_dir, exist_ok=True)

    conn = sqlite3.connect(DB_FILE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def create_tables():
    """
    Connects to the database and creates the necessary tables
    if they don't already exist.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    print("Creating 'raw_ticks' table...")
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS raw_ticks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            symbol TEXT NOT NULL,
            price REAL NOT NULL,
            quantity REAL NOT NULL
        )
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_raw_ticks_timestamp_symbol
        ON raw_ticks (timestamp, symbol)
    """
    )

    print("Creating 'alerts' table...")
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol_pair TEXT NOT NULL,
            metric TEXT NOT NULL,
            condition TEXT NOT NULL,
            value REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    conn.commit()
    conn.close()
    print(f"Database setup complete. DB located at: {DB_FILE_PATH}")

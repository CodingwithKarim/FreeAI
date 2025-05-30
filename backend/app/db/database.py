import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).parent / "app.db"

def init_db():
    # Create SQLite file and tables if they don't exist
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, isolation_level="DEFERRED")

    print("[INFO] Database initialized successfully.")

    conn.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    conn.execute("""
    CREATE TABLE IF NOT EXISTS download_tasks (
    model_id   TEXT    PRIMARY KEY,
    status     TEXT    NOT NULL,
    progress   INTEGER NOT NULL,
    local_path TEXT
    );
    """)

    conn.execute("""
    CREATE TABLE IF NOT EXISTS models (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        model_id     TEXT    UNIQUE     NOT NULL,
        model_name TEXT               DEFAULT NULL,
        is_quantized INTEGER DEFAULT 0,
        is_uncensored INTEGER DEFAULT 0,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user','assistant')),
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES sessions(session_id)
    );
    """)

    conn.commit()
    conn.close()

@contextmanager
def get_db():
    """
    Context manager for managing SQLite database connections.

    This function yields a SQLite connection object, ensuring that the connection
    is properly closed after use. It is designed to safely handle database operations
    by providing a consistent and error-free way to manage resources.

    Usage:
        with get_db() as conn:
            # Perform database operations using 'conn'

    The connection is automatically closed when the context block is exited.
    """
    conn = sqlite3.connect(DB_PATH, isolation_level="DEFERRED")
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from app.db.sql_queries import (
    CREATE_SESSIONS_TABLE,
    CREATE_DOWNLOAD_TASKS_TABLE,
    CREATE_MESSAGES_TABLE,
    CREATE_MODELS_TABLE,
)

# Path to SQLite file (will be created if missing)
# Resolves to FreeAI/backend/data/app.db
DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "app.db"

def init_db() -> None:
    # Init a connection variable
    connection: sqlite3.Connection = None
    
    try:
        # Create an app.db file at the DB_Path if it doesn't exist and create connection instance
        connection = sqlite3.connect(DB_PATH, isolation_level="DEFERRED")

        # Create database tables if they don't exist
        connection.execute(CREATE_SESSIONS_TABLE)
        connection.execute(CREATE_DOWNLOAD_TASKS_TABLE)
        connection.execute(CREATE_MODELS_TABLE)
        connection.execute(CREATE_MESSAGES_TABLE)

        # Save changes
        connection.commit()
        
        print("[INFO]: Database initialized successfully.")
        
    except sqlite3.Error as error:
        if connection:
            connection.rollback()
            
        print(f"Error Initializing Database: {error}")
        raise
        
    finally:
        if connection:
            connection.close()

@contextmanager
def get_db():
    # Init connection variable to hold SQLite connection
    connection: sqlite3.Connection = None
    
    try:
        # Create an app.db file at the target DB_Path directory if it doesn't exist and create connection instance
        connection = sqlite3.connect(DB_PATH, isolation_level="DEFERRED")
        
        # Return / yield the conenction object to be used
        yield connection
        
        # Save any potential changes made to the database
        connection.commit()
        
    except Exception:
        if connection:
            connection.rollback()
        raise
    
    finally:
        if connection:
            connection.close()
            
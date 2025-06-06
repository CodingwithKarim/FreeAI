from typing import List, Tuple
from app.db.init_database import get_db
from app.db.sql_queries import DELETE_SESSION, INSERT_NEW_SESSION, GET_ALL_SESSIONS

def insert_new_session(session_id: str, session_name: str) -> None:
    with get_db() as connection:
       # Insert a new session with a distinct ID + name into the database
        connection.execute(INSERT_NEW_SESSION, (session_id, session_name))
        
def get_all_sessions() -> List[Tuple[str, str]]:
    with get_db() as connection:
        # Retrieve all sessions from the database
        rows = connection.execute(GET_ALL_SESSIONS).fetchall()
        
    return rows

def delete_session(session_id: str) -> None:
    with get_db() as connection:
        # Delete session from the database
        connection.execute(
            DELETE_SESSION,
            (session_id,)
        )
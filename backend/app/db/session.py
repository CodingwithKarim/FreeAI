from typing import List, Tuple
from app.db.database import get_db

def InsertNewSession(session_id: str, session_name: str) -> None:
    with get_db() as conn:
        conn.execute(
            "INSERT INTO sessions (id, name) VALUES (?, ?)", (session_id, session_name),
        )
        
        conn.commit()
        
        
def GetAllSessions() -> List[Tuple[str, str]]:
    with get_db() as conn:
        rows = conn.execute("SELECT id, name FROM sessions").fetchall()
        
    return rows


def DeleteSession(session_id: str) -> None:
    print(f"Deleting session with ID: {session_id}")
    with get_db() as conn:
        conn.execute(
            "DELETE FROM sessions WHERE id = ?",
            (session_id,)
        )
        
        conn.commit()
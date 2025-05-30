from typing import List, Tuple
from app.db.database import get_db

def GetSessionMessages(session_id: str) -> List[Tuple[str, str, str]]:
    with get_db() as conn:
        rows = conn.execute(
            '''
            SELECT model_id, role, content
            FROM messages
            WHERE session_id = ?
            ORDER BY timestamp
            ''', (session_id)
        ).fetchall()
        
    return rows
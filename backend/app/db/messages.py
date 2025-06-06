from typing import List, Tuple
from app.db.init_database import get_db
from app.utils.types.model_types import RunInferenceRequest
from app.db.sql_queries import GET_SESSION_MESSAGES, INSERT_MESSAGE

def get_session_messages(session_id: str) -> List[Tuple[str, str, str]]:
    with get_db() as conn:
        # Get all messages associated with the session ID from the database
        rows = conn.execute(GET_SESSION_MESSAGES, (session_id,)).fetchall()
     
    # Return session messages
    return rows

def persist_user_and_assistant_message(request: RunInferenceRequest, inference_output: str ) -> None:
    with get_db() as connection:
        # Insert User + Assistant messages into the database
        connection.execute(
           INSERT_MESSAGE,
            (
                request.session_id, request.model_id, "user", request.prompt,
                request.session_id, request.model_id, "assistant", inference_output
            )
        )
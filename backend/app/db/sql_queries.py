CREATE_SESSIONS_TABLE = (
    """
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """
)

CREATE_DOWNLOAD_TASKS_TABLE = (
    """
        CREATE TABLE IF NOT EXISTS download_tasks (
            model_id   TEXT    PRIMARY KEY,
            status     TEXT    NOT NULL,
            progress   INTEGER NOT NULL,
            local_path TEXT
        );
    """
)

CREATE_MODELS_TABLE = (
    """
        CREATE TABLE IF NOT EXISTS models (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            model_id     TEXT    UNIQUE     NOT NULL,
            model_name   TEXT               DEFAULT NULL,
            is_quantized INTEGER DEFAULT 0,
            is_uncensored INTEGER DEFAULT 0,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """
)

CREATE_MESSAGES_TABLE = (
    """
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            model_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user','assistant')),
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        );
    """
)

INSERT_NEW_SESSION = (
    """
        INSERT INTO sessions (id, name) VALUES (?, ?)
    """
)

DELETE_SESSION = (
    """
        DELETE FROM sessions WHERE id = ?
    """
)

GET_ALL_SESSIONS = (
    """
        SELECT id, name FROM sessions
    """
)

GET_SESSION_MESSAGES = (
    """
            SELECT
                m.model_id,
                mdl.model_name,
                m.role,
                m.content,
                m.timestamp
            FROM messages AS m
            JOIN models    AS mdl
              ON m.model_id = mdl.model_id
            WHERE m.session_id = ?
            ORDER BY m.timestamp
    """
)

INSERT_MESSAGE = (
    """
        INSERT INTO messages (session_id, model_id, role, content)
        VALUES
        (?, ?, ?, ?),
        (?, ?, ?, ?)
    """
)

DELETE_MODEL = (
    """
        DELETE FROM models WHERE model_id = ?
    """
)

DELETE_TASKS = (
    """
        DELETE FROM download_tasks WHERE model_id = ?
    """
)

INSERT_PENDING_TASK = (
    """
        INSERT OR REPLACE INTO download_tasks
        (model_id, status, progress, local_path)
        VALUES (?, 'pending', 0, NULL)
    """
)

UPDATE_DOWNLOADING_TASK = (
    """
        UPDATE download_tasks
        SET status = 'downloading', progress = 0
        WHERE model_id = ?
    """
)

UPDATE_READY_TASK = (
    """
        UPDATE download_tasks
        SET status = 'ready', progress = 100, local_path = ?
        WHERE model_id = ?
    """
)

UPDATE_FAILED_TASK = (
    """
        UPDATE download_tasks
        SET status = 'failed', progress = 0
        WHERE model_id = ?
    """
)

INSERT_MODEL = (
    """
        INSERT OR IGNORE INTO models
        (model_id, model_name, is_quantized, is_uncensored)
        VALUES (?, ?, ?, ?)
    """
)

GET_DOWNLOAD_STATUS = (
    """
        SELECT model_id, status, progress, local_path FROM download_tasks
    """
)

GET_ALL_MODELS = (
    """
        SELECT model_id, model_name, is_quantized, is_uncensored FROM models
    """
)

GET_MODEL_DIRECTORY_PATH = (
    """
        SELECT local_path FROM download_tasks WHERE model_id = ? AND status = 'ready'
    """
)
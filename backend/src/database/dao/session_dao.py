from uuid import UUID, uuid4

from psycopg_pool import ConnectionPool

from ..model.message import Message
from ..model.session import Session

# errors should be handled in the functions calling?
class ConversationDao:
    """Manages all database operations"""

    def __init__(self, pool: ConnectionPool) -> None:
        self.pool = pool

    def create_session(self) -> UUID:
        """Create a session and return its ID"""
        session_id = uuid4()
        with self.pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("INSERT INTO sessions (id) VALUES (%s)", (session_id,))
        return session_id

    def get_conversation(self, session_id: UUID) -> Session:
        """Form and return a Session object given session id"""
        session = Session(session_id)
        rows = self._get_messages(session_id)
        if not rows:
            raise KeyError(f"Session {session_id} does not exist")

        for entry in rows:
            if entry[0] is None:
                continue
            message = Message(entry[0], entry[1], entry[2])
            session.add_message(message)

        return session

    def add_message(self, role: str, content: str, session_id: UUID, kind: str | None = None) -> None:
        """Add message to database

        Arguments:
            role - "AGENT" or "USER"
            content - message string
            session_id - id of session
            kind - "CLARIFY" or "ANSWER"
        """
        sql = """
            INSERT INTO messages (role, kind, content, session_id)
            VALUES (%s, %s, %s, %s)
        """
        with self.pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, (role, kind, content, session_id))

    def _get_messages(self, session_id: UUID) -> list[tuple]:
        """Get a list of messages from database given session id"""
        sql = """
            SELECT messages.role, messages.kind, messages.content
            FROM sessions
            LEFT JOIN messages ON messages.session_id = sessions.id
            WHERE sessions.id = %s
            ORDER BY messages.created_at ASC, messages.id ASC
        """
        with self.pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, (session_id,))
                return cursor.fetchall()

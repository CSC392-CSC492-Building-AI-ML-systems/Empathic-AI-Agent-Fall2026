from uuid import UUID

from psycopg_pool import ConnectionPool

from ..model.message import Message
from ..model.session import Session

# errors should be handled in the functions calling?
class ConversationDao:

    def __init__(self, pool: ConnectionPool) -> None:
        self.pool = pool

    def get_conversation(self, session_id: UUID) -> Session:
        """Form and return a Session object given session id"""
        session = Session(session_id)

        for entry in self._get_messages(session_id):
            message = Message(entry[1], entry[2], entry[3])
            session = session.add_message(message)

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
            SELECT id, role, kind, content, created_at, session_id
            FROM messages
            WHERE session_id = %s
            ORDER BY created_at ASC
        """
        with self.pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, (session_id,))
                return cursor.fetchall()

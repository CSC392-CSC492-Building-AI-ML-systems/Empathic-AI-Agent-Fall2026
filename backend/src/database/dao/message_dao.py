from uuid import UUID
from psycopg_pool import ConnectionPool

from ..model.message import Message


class MessageDao:
    """Manage message records in the database."""

    def __init__(self, pool: ConnectionPool) -> None:
        self.pool = pool

    def add_message(self, role: str, content: str, session_id: UUID, kind: str | None = None) -> None:
        """Add a message to a session."""
        sql = """
            INSERT INTO messages (role, kind, content, session_id)
            VALUES (%s, %s, %s, %s)
        """
        with self.pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, (role, kind, content, session_id))

    def get_messages(self, session_id: UUID) -> list[Message]:
        """Get a list of messages from database given session id"""
        sql = """
            SELECT messages.id, messages.role, messages.kind, messages.content
            FROM sessions
            LEFT JOIN messages ON messages.session_id = sessions.id
            WHERE sessions.id = %s
            ORDER BY messages.created_at ASC, messages.id ASC
        """
        with self.pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, (session_id,))
                rows = cursor.fetchall()

        messages = []
        for row in rows:
            if row[0] is None:
                continue
            messages.append(Message(row[0], row[1], row[2], row[3]))
        return messages

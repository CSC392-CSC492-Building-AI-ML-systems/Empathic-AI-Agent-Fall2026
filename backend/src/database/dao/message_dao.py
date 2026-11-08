from uuid import UUID
from psycopg_pool import AsyncConnectionPool

from ..model.message import Message


class MessageDao:
    """Manage message records in the database."""

    def __init__(self, pool: AsyncConnectionPool) -> None:
        self.pool = pool

    async def add_message(self, role: str, content: str, session_id: UUID) -> None:
        """Add a message to a session."""
        sql = """
            INSERT INTO messages (role, content, session_id)
            VALUES (%s, %s, %s)
        """
        async with self.pool.connection() as connection:
            async with connection.cursor() as cursor:
                await cursor.execute(sql, (role, content, session_id))

    async def get_messages(self, session_id: UUID) -> list[Message]:
        """Get a list of messages from database given session id"""
        sql = """
            SELECT messages.id, messages.role, messages.content, messages.created_at
            FROM sessions
            LEFT JOIN messages ON messages.session_id = sessions.id
            WHERE sessions.id = %s
            ORDER BY messages.created_at ASC, messages.id ASC
        """
        async with self.pool.connection() as connection:
            async with connection.cursor() as cursor:
                await cursor.execute(sql, (session_id,))
                rows = await cursor.fetchall()

        messages = []
        for row in rows:
            if row[0] is None:
                continue
            messages.append(Message(row[0], row[1], row[2], row[3]))
        return messages

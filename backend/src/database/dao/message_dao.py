from datetime import datetime
from uuid import UUID

from psycopg_pool import AsyncConnectionPool

from ..model.message import Message


class MessageDao:
    """Manage message records in the database."""

    def __init__(self, pool: AsyncConnectionPool) -> None:
        self.pool = pool

    async def add_message(self, role: str, content: str, session_id: UUID) -> datetime:
        """Add a message to a session and return its stored creation timestamp."""
        sql = """
            INSERT INTO messages (role, content, session_id)
            VALUES (%s, %s, %s)
            RETURNING created_at
        """
        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, (role, content, session_id))
            row = await cursor.fetchone()
            if row is None:
                raise RuntimeError("Message insert did not return a timestamp")
            return row[0]

    async def get_messages(self, session_id: UUID, created_after: datetime | None = None) -> list[Message]:
        """Get a session's messages in order, optionally after a cutoff."""
        sql = """
            SELECT id, role, content, created_at
            FROM messages
            WHERE session_id = %s
        """
        params = (session_id,)
        if created_after is not None:
            sql += " AND created_at > %s"
            params = (session_id, created_after)
        sql += " ORDER BY created_at ASC, id ASC"

        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, params)
            rows = await cursor.fetchall()

        messages = []
        for row in rows:
            messages.append(Message(message_id=row[0],
                                    role=row[1],
                                    content=row[2],
                                    created_at=row[3]))
        return messages

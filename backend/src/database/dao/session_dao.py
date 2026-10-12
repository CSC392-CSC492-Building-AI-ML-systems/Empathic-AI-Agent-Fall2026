from uuid import UUID, uuid4
from psycopg_pool import AsyncConnectionPool

from ..model.session import Session
from .message_dao import MessageDao


class SessionDao:
    """Manage session records in the database."""

    def __init__(self, pool: AsyncConnectionPool, message_dao: MessageDao) -> None:
        self.pool = pool
        self.message_dao = message_dao

    async def create_session(self, user_id: UUID, name: str | None = None) -> UUID:
        """Create a session and return its ID"""
        session_id = uuid4()
        async with self.pool.connection() as connection:
            async with connection.cursor() as cursor:
                await cursor.execute(
                    "INSERT INTO sessions (id, user_id, name) VALUES (%s, %s, %s)",
                    (session_id, user_id, name),
                )
        return session_id

    async def get_session(self, session_id: UUID) -> Session:
        """Form and return a Session object given session id"""

        sql = """
            SELECT name FROM sessions
            WHERE id = %s
        """
        async with self.pool.connection() as connection:
            async with connection.cursor() as cursor:
                await cursor.execute(sql, (session_id,))
                row = await cursor.fetchone()
        if row is None:
            raise KeyError(f"Session {session_id} does not exist")

        session = Session(session_id, row[0])
        messages = await self.message_dao.get_messages(session_id)
        for message in messages:
            session.add_message(message)
        return session

    async def get_session_ids(self, user_id: UUID) -> list[UUID]:
        """Return a user's session IDs in creation order."""
        sql = """
            SELECT id FROM sessions
            WHERE user_id = %s
            ORDER BY created_at ASC, id ASC
        """
        async with self.pool.connection() as connection:
            async with connection.cursor() as cursor:
                await cursor.execute(sql, (user_id,))
                rows = await cursor.fetchall()

        sessions = []
        for row in rows:
            sessions.append(row[0])
        return sessions

    async def del_session(self, session_id: UUID) -> None:
        """Deletes session and all messages related to a session_id from database"""
        sql = """
            DELETE FROM sessions
            WHERE id = %s
        """
        async with self.pool.connection() as connection:
            async with connection.cursor() as cursor:
                await cursor.execute(sql, (session_id,))

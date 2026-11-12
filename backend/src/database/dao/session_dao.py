from uuid import UUID, uuid4

from psycopg_pool import AsyncConnectionPool

from ..model.session import Session
from .message_dao import MessageDao


class SessionDao:
    """Manage session records in the database."""

    def __init__(self, pool: AsyncConnectionPool, message_dao: MessageDao) -> None:
        self.pool = pool
        self.message_dao = message_dao

    async def create_session(self,
                             user_id: UUID,
                             context: str,
                             tool_context: str,
                             terminated: bool,
                             name: str | None = None) -> UUID:
        """Create a session and return its ID"""
        session_id = uuid4()
        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(
                "INSERT INTO sessions (id, user_id, name, context, tool_context, terminated) VALUES (%s, %s, %s, %s, %s, %s)",
                (session_id, user_id, name, context, tool_context, terminated),
            )
        return session_id

    async def get_session(self, session_id: UUID) -> Session:
        """Form and return a Session object given session id"""

        sql = """
            SELECT created_at, context, tool_context, terminated, user_id, name FROM sessions
            WHERE id = %s
        """
        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, (session_id,))
            row = await cursor.fetchone()
        if row is None:
            raise KeyError(f"Session {session_id} does not exist")

        session = Session(session_id=session_id,
                          created_at=row[0],
                          context=row[1],
                          tool_context=row[2],
                          terminated=row[3],
                          user_id=row[4],
                          name=row[5],
                          messages=[])
        messages = await self.message_dao.get_messages(session_id)
        for message in messages:
            session.add_message(message)
        return session

    async def get_session_ids(self, user_id: UUID) -> list[tuple[UUID, str]]:
        """Return a user's session IDs in creation order."""
        sql = """
            SELECT id, name FROM sessions
            WHERE user_id = %s
            ORDER BY created_at ASC, id ASC
        """
        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, (user_id,))
            rows = await cursor.fetchall()

        sessions = []
        for row in rows:
            sessions.append((row[0], row[1]))
        return sessions

    async def del_session(self, session_id: UUID) -> None:
        """Deletes session and all messages related to a session_id from database"""
        sql = """
            DELETE FROM sessions
            WHERE id = %s
        """
        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, (session_id,))

    async def terminate_session(self, session_id: UUID) -> None:
        """Terminates a session by setting the terminated flag to true"""
        sql = """
            UPDATE sessions
            SET terminated = true
            WHERE id = %s
        """
        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, (session_id,))
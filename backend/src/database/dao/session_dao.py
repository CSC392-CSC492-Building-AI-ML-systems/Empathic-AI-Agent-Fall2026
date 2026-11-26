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
                "INSERT INTO sessions (id, user_id, name, terminated) VALUES (%s, %s, %s, %s)",
                (session_id, user_id, name, terminated),
            )
            await cursor.execute(
                "INSERT INTO message_context (session_id, context) VALUES (%s, %s)",
                (session_id, context),
            )
            if tool_context:
                await cursor.execute(
                    "INSERT INTO tool_context (session_id, context) VALUES (%s, %s)",
                    (session_id, tool_context),
                )
        return session_id

    async def add_tool_context(self, session_id: UUID, context: str) -> None:
        """Append one tool result to a session."""
        sql = "INSERT INTO tool_context (session_id, context) VALUES (%s, %s)"

        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, (session_id, context))

    async def get_tool_context(self, session_id: UUID) -> list[str]:
        """Return the session's tool entries in ID order."""
        sql = """
            SELECT context FROM tool_context
            WHERE session_id = %s AND context IS NOT NULL
            ORDER BY id
        """

        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, (session_id,))
            return [row[0] for row in await cursor.fetchall()]

    async def get_message_context(self, session_id: UUID) -> str:
        """Return the stored message context, or None if there is none."""
        sql = "SELECT context FROM message_context WHERE session_id = %s"

        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, (session_id,))
            row = await cursor.fetchone()
        return row[0] if row is not None else ""

    async def upsert_message_context(self, session_id: UUID, context: str) -> None:
        """Store or replace the session's message context."""
        sql = """
            INSERT INTO message_context (session_id, context) VALUES (%s, %s)
            ON CONFLICT (session_id)
            DO UPDATE SET context = EXCLUDED.context
        """

        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, (session_id, context))

    async def get_session(self, session_id: UUID) -> Session:
        """Form and return a Session object given session id"""

        sql = """
            SELECT s.created_at, s.terminated, s.user_id, s.name, m.context
            FROM sessions AS s
            LEFT JOIN message_context AS m ON m.session_id = s.id
            WHERE s.id = %s
        """
        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, (session_id,))
            row = await cursor.fetchone()
        if row is None:
            raise KeyError(f"Session {session_id} does not exist")

        return Session(
            session_id=session_id,
            created_at=row[0],
            terminated=row[1],
            user_id=row[2],
            name=row[3],
            message_context=row[4],
            messages=await self.message_dao.get_messages(session_id),
        )

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

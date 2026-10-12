from uuid import UUID, uuid4
from psycopg_pool import ConnectionPool

from ..model.session import Session
from .message_dao import MessageDao


class SessionDao:
    """Manage session records in the database."""

    def __init__(self, pool: ConnectionPool, message_dao: MessageDao) -> None:
        self.pool = pool
        self.message_dao = message_dao

    def create_session(self, user_id: UUID, name: str | None = None) -> UUID:
        """Create a session and return its ID"""
        session_id = uuid4()
        with self.pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO sessions (id, user_id, name) VALUES (%s, %s, %s)",
                    (session_id, user_id, name),
                )
        return session_id

    def get_session(self, session_id: UUID) -> Session:
        """Form and return a Session object given session id"""

        sql = """
            SELECT name FROM sessions
            WHERE id = %s
        """
        with self.pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, (session_id,))
                row = cursor.fetchone()
        if row is None:
            raise KeyError(f"Session {session_id} does not exist")

        session = Session(session_id, row[0])
        messages = self.message_dao.get_messages(session_id)
        for message in messages:
            session.add_message(message)
        return session

    def get_session_ids(self, user_id: UUID) -> list[UUID]:
        """Return a user's session IDs in creation order."""
        sql = """
            SELECT id FROM sessions
            WHERE user_id = %s
            ORDER BY created_at ASC, id ASC
        """
        with self.pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, (user_id,))
                rows = cursor.fetchall()

        sessions = []
        for row in rows:
            sessions.append(row[0])
        return sessions

    def del_session(self, session_id: UUID) -> None:
        """Deletes session and all messages related to a session_id from database"""
        sql = """
            DELETE FROM sessions
            WHERE id = %s
        """
        with self.pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, (session_id,))

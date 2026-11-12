from uuid import UUID, uuid4

import bcrypt
from psycopg.errors import Error
from psycopg_pool import AsyncConnectionPool

from ..model.user import User


class UserDao:
    """Manage user records in the database."""

    def __init__(self, pool: AsyncConnectionPool) -> None:
        self.pool = pool


    async def create_user(self,
                          email: str,
                          password: str,
                          name: str) -> UUID | None:
        """Create a user and return its ID"""
        user_id = uuid4()
        sql = """
            INSERT INTO users (id, name, email, password)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        try:
            async with self.pool.connection() as connection, connection.cursor() as cursor:
                await cursor.execute(sql,(user_id, name, email, password),)
        except Error:
            return None

        return user_id


    async def email_exists(self, email: str) -> bool:
        """Check whether an email is already in use"""
        sql = "SELECT EXISTS (SELECT 1 FROM users WHERE email = %s)"

        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, (email,))
            row = await cursor.fetchone()

        if row is None:
            return False
        return bool(row[0])


    async def authenticate_user(self, email: str, password: str) -> UUID | None:
        """Return the user's ID if their email and password match"""
        sql = "SELECT id, password FROM users WHERE email = %s"

        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, (email,))
            row = await cursor.fetchone()

        if row is None:
            return None

        try:
            matches = bcrypt.checkpw(password.encode('utf-8'), row[1].encode())
        except ValueError:
            return None

        if matches:
            return row[0]

        return None


    async def get_user(self, user_id: UUID) -> User | None:
        """Return all user info given a user ID"""
        sql = """
            SELECT id, name, email, password
            FROM users 
            WHERE id = %s
        """

        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, (user_id,))
            row = await cursor.fetchone()

        if row is None:
            return None

        return User(user_id=row[0],
                    name=row[1],
                    email=row[2],
                    password=row[3])


    async def update_user(self,
                          user_id: UUID,
                          name: str,
                          email: str,
                          password: str) -> bool:
        """Replace a user's information and return whether the user exists"""
        sql = """
            UPDATE users
            SET name = %s, email = %s, password = %s
            WHERE id = %s RETURNING id
        """
        try:
            async with self.pool.connection() as connection, connection.cursor() as cursor:
                await cursor.execute(sql,(name, email, password, user_id),)
                row = await cursor.fetchone()

        except Error:
            return False

        return row is not None


    async def del_user(self, user_id: UUID) -> None:
        """Delete a user and their sessions, messages, and memories."""
        sql = """
            DELETE FROM users
            WHERE id = %s
        """
        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, (user_id,))


    async def get_memories(self, user_id: UUID) -> dict[str, str]:
        """Get a user's stored memories"""
        sql = """
            SELECT memory_key, content
            FROM user_memories
            WHERE user_id = %s
            ORDER BY memory_key ASC
        """
        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, (user_id,))
            rows = await cursor.fetchall()

        memories = {}
        for row in rows:
            memories[row[0]] = row[1]
        return memories


    async def upsert_memory(self, user_id: UUID, memory_key: str, content: str) -> None:
        """Save a memory, replacing the content if the user's key already exists"""
        if not memory_key.strip():
            raise ValueError("memory_key must not be empty")

        sql = """
            INSERT INTO user_memories (user_id, memory_key, content)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id, memory_key) DO UPDATE
            SET content = EXCLUDED.content
        """
        async with self.pool.connection() as connection, connection.cursor() as cursor:
            await cursor.execute(sql, (user_id, memory_key, content))

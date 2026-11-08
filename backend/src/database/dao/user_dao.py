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
                          first_name: str,
                          last_name: str,
                          email: str,
                          password: str,
                          profile: str,
                          nickname: str) -> UUID | None:
        """Create a user and return its ID"""
        user_id = uuid4()
        sql = """
            INSERT INTO users (id, profile, first_name, last_name, nickname, email, password)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        try:
            async with self.pool.connection() as connection:
                async with connection.cursor() as cursor:
                    await cursor.execute(sql,(user_id, profile, first_name, last_name, nickname, email, password),)
        except Error:
            return None

        return user_id


    async def email_exists(self, email: str) -> bool:
        """Check whether an email is already in use"""
        sql = "SELECT EXISTS (SELECT 1 FROM users WHERE email = %s)"

        async with self.pool.connection() as connection:
            async with connection.cursor() as cursor:
                await cursor.execute(sql, (email,))
                row = await cursor.fetchone()

        if row is None:
            return False
        return bool(row[0])


    async def authenticate_user(self, email: str, password: str) -> UUID | None:
        """Return the user's ID if their email and password match"""
        sql = "SELECT id, password FROM users WHERE email = %s"

        async with self.pool.connection() as connection:
            async with connection.cursor() as cursor:
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
            SELECT id, first_name, last_name, email, password, profile, nickname
            FROM users WHERE id = %s
        """

        async with self.pool.connection() as connection:
            async with connection.cursor() as cursor:
                await cursor.execute(sql, (user_id,))
                row = await cursor.fetchone()

        if row is None:
            return None

        return User(user_id=row[0],
                    first_name=row[1],
                    last_name=row[2],
                    email=row[3],
                    password=row[4],
                    profile=row[5],
                    nickname=row[6])


    async def update_user(self,
                          user_id: UUID,
                          first_name: str,
                          last_name: str,
                          email: str,
                          password: str,
                          profile: str,
                          nickname: str) -> bool:
        """Replace a user's information and return whether the user exists"""
        sql = """
            UPDATE users
            SET first_name = %s, last_name = %s, email = %s, password = %s, profile = %s, nickname = %s
            WHERE id = %s RETURNING id
        """
        try:
            async with self.pool.connection() as connection:
                async with connection.cursor() as cursor:
                    await cursor.execute(sql,(first_name, last_name, email, password, profile, nickname, user_id),)
                    row = await cursor.fetchone()

        except Error:
            return False

        return row is not None


    async def del_user(self, user_id: UUID) -> None:
        """Delete a user and their sessions and messages."""
        sql = """
            DELETE FROM users
            WHERE id = %s
        """
        async with self.pool.connection() as connection:
            async with connection.cursor() as cursor:
                await cursor.execute(sql, (user_id,))

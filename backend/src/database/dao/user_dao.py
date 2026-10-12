from uuid import UUID, uuid4
from psycopg_pool import ConnectionPool


class UserDao:
    """Manage user records in the database."""

    def __init__(self, pool: ConnectionPool) -> None:
        self.pool = pool

    def create_user(self,
                    first_name: str,
                    last_name: str,
                    email: str,
                    password: str,
                    profile: str,
                    nickname: str) -> UUID:
        """Create a user and return its ID."""
        user_id = uuid4()
        sql = """
            INSERT INTO users (id, profile, first_name, last_name, nickname, email, password)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        with self.pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, (user_id, profile, first_name, last_name, nickname, email, password),)
        return user_id

    def del_user(self, user_id: UUID) -> None:
        """Delete a user and their sessions and messages."""
        sql = """
            DELETE FROM users
            WHERE id = %s
        """
        with self.pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, (user_id,))

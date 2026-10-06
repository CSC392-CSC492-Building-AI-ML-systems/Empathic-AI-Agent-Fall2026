import os

from psycopg.conninfo import make_conninfo
from psycopg_pool import ConnectionPool

def get_conn_info() -> str:
    """Form and return a connection string for database using .env variables"""

    password = os.environ.get("POSTGRES_PASSWORD", "")
    if not password:
        raise ValueError("POSTGRES_PASSWORD is required")

    return make_conninfo(
        "",
        host=os.environ.get("DB_HOST", "localhost"),
        port=os.environ.get("DB_PORT", "5432"),
        dbname=os.environ.get("POSTGRES_DB", "postgres"),
        user=os.environ.get("POSTGRES_USER", "postgres"),
        password=password,
    )

def create_pool() -> ConnectionPool:
    """Form and return a connection pool"""
    return ConnectionPool(get_conn_info(), min_size=1, max_size=5, open=True)

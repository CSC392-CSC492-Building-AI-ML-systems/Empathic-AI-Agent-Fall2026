#
# This script will run before the app is allowed to start. Modifications to the schema must be done by adding
# a .sql file with the migration to the migrations directory.
#
from pathlib import Path
import psycopg

from .connection import get_conn_info

def apply_migrations(connection: psycopg.Connection) -> None:

    directory = Path(__file__).parent / "migrations"
    migrations = sorted([f for f in directory.iterdir()])

    if not migrations:
        raise ValueError(f"No migrations found in {directory}")

    with connection.transaction():
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS migrations (
                path_name TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now())
            """
        )
        applied = connection.execute("SELECT path_name FROM migrations").fetchall()
        applied = {record[0] for record in applied_records}

        for path in migrations:
            if path.name in applied:
                continue

            sql = path.read_text()
            connection.execute(sql)
            connection.execute(
                "INSERT INTO migrations (path_name) VALUES (%s)",
                (path.name,)
            )

def main() -> None:
    with psycopg.connect(get_conn_info()) as connection:
        apply_migrations(connection)


if __name__ == "__main__":
    main()

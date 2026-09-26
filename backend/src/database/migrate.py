from pathlib import Path
import psycopg

from .connection import get_conn_info

def apply_migrations(connection: psycopg.Connection) -> None:
    """Apply sql migrations to database

    IMPORTANT:
        This script runs before the app is allowed to start. If you want to modify the schema,
        you must make a .sql file with the migration in the migrations directory.
    """
    directory = Path(__file__).parent / "migrations" # get path of migration folder
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
        applied = {record[0] for record in applied}

        for path in migrations:
            if path.name in applied:
                continue

            sql = path.read_text() # shouldn't be an issue?
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

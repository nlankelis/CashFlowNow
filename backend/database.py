import sqlite3
from config import DATABASE_PATH


def get_db_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_db_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                file_hash TEXT NOT NULL,
                invoice_number TEXT,
                amount REAL,
                due_date TEXT,
                debtor_name TEXT,
                decision TEXT NOT NULL,
                raw_ocr_text TEXT,
                layout_signature TEXT,
                offer_json TEXT,
                decision_json TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            """
        )
        # Migrate existing table if decision_json column is not present
        existing_cols = [r[1] for r in connection.execute("PRAGMA table_info(invoices)").fetchall()]
        if "decision_json" not in existing_cols:
            connection.execute("ALTER TABLE invoices ADD COLUMN decision_json TEXT")

        connection.execute("CREATE INDEX IF NOT EXISTS idx_invoices_file_hash ON invoices (file_hash)")
        connection.execute("CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices (invoice_number)")
        connection.execute("CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices (user_id)")
        connection.commit()


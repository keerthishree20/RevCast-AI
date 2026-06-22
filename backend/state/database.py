"""SQLite database for persistent user and session storage."""

import sqlite3
import json
import os
from pathlib import Path
from typing import Optional, Any

DB_PATH = os.getenv("DB_PATH", str(Path(__file__).parent.parent / "revcast.db"))

def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            user_email TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_email) REFERENCES users(email)
        );
    """)
    conn.commit()
    conn.close()


# ── User operations ──────────────────────────────────────────────────────────

def create_user(email: str, name: str, password_hash: str) -> bool:
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)",
            (email, name, password_hash),
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


def get_user(email: str) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    if row is None:
        return None
    return dict(row)


def get_all_users_count() -> int:
    conn = _get_conn()
    count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    conn.close()
    return count


# ── Session operations ───────────────────────────────────────────────────────

def create_session(session_id: str, user_email: Optional[str] = None):
    conn = _get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO sessions (session_id, user_email) VALUES (?, ?)",
        (session_id, user_email),
    )
    conn.commit()
    conn.close()


def get_session_owner(session_id: str) -> Optional[str]:
    conn = _get_conn()
    row = conn.execute("SELECT user_email FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
    conn.close()
    if row is None:
        return None
    return row["user_email"]


def get_user_sessions(user_email: str) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT session_id, created_at FROM sessions WHERE user_email = ? ORDER BY created_at DESC",
        (user_email,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# Initialize on import
init_db()

"""SQLite access layer for LeadFlow.

Uses only Python's built-in ``sqlite3`` module — no ORM. All statements are
parameterized. Timestamps are stored as UTC ISO 8601 strings in TEXT columns.
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

STATUSES = ("New", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost")

_DEFAULT_DB = Path(__file__).resolve().parent.parent / "data" / "leadflow.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'New'
        CHECK (status IN ('New', 'Contacted', 'Qualified', 'Proposal Sent', 'Won', 'Lost')),
    follow_up_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS discussions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    follow_up_at TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(follow_up_at);
CREATE INDEX IF NOT EXISTS idx_disc_lead_created ON discussions(lead_id, created_at DESC);
"""


class LeadNotFoundError(Exception):
    """Raised when an operation references a lead id that does not exist."""


def db_path() -> Path:
    """SQLite file location; overridable via DATABASE_PATH (used by tests)."""
    return Path(os.environ.get("DATABASE_PATH", str(_DEFAULT_DB)))


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect() -> sqlite3.Connection:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    conn = connect()
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()


def _row_to_lead(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "company": row["company"],
        "phone": row["phone"],
        "status": row["status"],
        "follow_up_at": row["follow_up_at"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _row_to_discussion(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "lead_id": row["lead_id"],
        "note": row["note"],
        "follow_up_at": row["follow_up_at"],
        "created_at": row["created_at"],
    }


def create_lead(name: str, company: str | None, phone: str | None) -> dict:
    now = utcnow_iso()
    conn = connect()
    try:
        cur = conn.execute(
            "INSERT INTO leads (name, company, phone, status, created_at, updated_at)"
            " VALUES (?, ?, ?, 'New', ?, ?)",
            (name, company, phone, now, now),
        )
        conn.commit()
        lead_id = cur.lastrowid
        assert lead_id is not None
        row = conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
        assert row is not None
        lead = _row_to_lead(row)
        lead["latest_note"] = None
        lead["latest_discussion_at"] = None
        return lead
    finally:
        conn.close()


def list_leads(status: str | None = None, search: str | None = None) -> list[dict]:
    query = """
        SELECT l.*,
            (SELECT note FROM discussions d WHERE d.lead_id = l.id
             ORDER BY d.created_at DESC, d.id DESC LIMIT 1) AS latest_note,
            (SELECT created_at FROM discussions d WHERE d.lead_id = l.id
             ORDER BY d.created_at DESC, d.id DESC LIMIT 1) AS latest_discussion_at
        FROM leads l
    """
    clauses: list[str] = []
    params: list[object] = []
    if status:
        clauses.append("l.status = ?")
        params.append(status)
    if search:
        clauses.append("LOWER(l.name) LIKE '%' || LOWER(?) || '%'")
        params.append(search)
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    query += " ORDER BY datetime(l.updated_at) DESC, l.id DESC"
    conn = connect()
    try:
        rows = conn.execute(query, params).fetchall()
        leads = []
        for row in rows:
            lead = _row_to_lead(row)
            lead["latest_note"] = row["latest_note"]
            lead["latest_discussion_at"] = row["latest_discussion_at"]
            leads.append(lead)
        return leads
    finally:
        conn.close()


def get_lead(lead_id: int) -> dict:
    conn = connect()
    try:
        row = conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
        if row is None:
            raise LeadNotFoundError(lead_id)
        return _row_to_lead(row)
    finally:
        conn.close()


def update_lead(
    lead_id: int,
    status: str | None = None,
    name: str | None = None,
    company: str | None = None,
    phone: str | None = None,
) -> dict:
    updates: list[str] = []
    params: list[object] = []
    if status is not None:
        updates.append("status = ?")
        params.append(status)
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if company is not None:
        updates.append("company = ?")
        params.append(company)
    if phone is not None:
        updates.append("phone = ?")
        params.append(phone)
    if not updates:
        return get_lead(lead_id)
    updates.append("updated_at = ?")
    params.append(utcnow_iso())
    params.append(lead_id)
    conn = connect()
    try:
        cur = conn.execute(
            f"UPDATE leads SET {', '.join(updates)} WHERE id = ?", params
        )
        if cur.rowcount == 0:
            raise LeadNotFoundError(lead_id)
        conn.commit()
        row = conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
        assert row is not None
        return _row_to_lead(row)
    finally:
        conn.close()


def list_discussions(lead_id: int) -> list[dict]:
    conn = connect()
    try:
        lead = conn.execute("SELECT id FROM leads WHERE id = ?", (lead_id,)).fetchone()
        if lead is None:
            raise LeadNotFoundError(lead_id)
        rows = conn.execute(
            "SELECT * FROM discussions WHERE lead_id = ?"
            " ORDER BY datetime(created_at) DESC, id DESC",
            (lead_id,),
        ).fetchall()
        return [_row_to_discussion(r) for r in rows]
    finally:
        conn.close()


def create_discussion(
    lead_id: int, note: str, follow_up_at: str | None = None
) -> dict:
    """Insert a discussion and, when a follow-up is supplied, update the lead's
    current follow-up — both inside a single transaction. Any failure rolls
    back the whole operation so no partial state is persisted."""
    now = utcnow_iso()
    conn = connect()
    try:
        lead = conn.execute("SELECT id FROM leads WHERE id = ?", (lead_id,)).fetchone()
        if lead is None:
            raise LeadNotFoundError(lead_id)
        cur = conn.execute(
            "INSERT INTO discussions (lead_id, note, follow_up_at, created_at)"
            " VALUES (?, ?, ?, ?)",
            (lead_id, note, follow_up_at, now),
        )
        discussion_id = cur.lastrowid
        if follow_up_at is not None:
            conn.execute(
                "UPDATE leads SET follow_up_at = ?, updated_at = ? WHERE id = ?",
                (follow_up_at, now, lead_id),
            )
        else:
            conn.execute(
                "UPDATE leads SET updated_at = ? WHERE id = ?", (now, lead_id)
            )
        conn.commit()
        assert discussion_id is not None
        row = conn.execute(
            "SELECT * FROM discussions WHERE id = ?", (discussion_id,)
        ).fetchone()
        assert row is not None
        return _row_to_discussion(row)
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def clear_follow_up(lead_id: int) -> dict:
    conn = connect()
    try:
        cur = conn.execute(
            "UPDATE leads SET follow_up_at = NULL, updated_at = ? WHERE id = ?",
            (utcnow_iso(), lead_id),
        )
        if cur.rowcount == 0:
            raise LeadNotFoundError(lead_id)
        conn.commit()
        row = conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
        assert row is not None
        return _row_to_lead(row)
    finally:
        conn.close()

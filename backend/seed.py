"""Seed the LeadFlow SQLite database with fictional demo leads.

Repeatable and non-destructive: existing leads (matched by name) are left
untouched. Run from the backend directory::

    uv run python seed.py
"""

from __future__ import annotations

import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app import database  # noqa: E402


def _days_ago(days: float) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def _today_at(hour: int, minute: int = 0) -> str:
    """A follow-up for *today* in the server's local timezone, stored as UTC."""
    now_local = datetime.now().astimezone()
    target_local = now_local.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return target_local.astimezone(timezone.utc).isoformat()


def _relative(days: float) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


SEED_LEADS: list[dict] = [
    {
        "name": "Pepper Potts",
        "company": "Stark Industries",
        "phone": "555-0199",
        "status": "Proposal Sent",
        "follow_up_at": ("today", 14, 0),
        "discussions": [
            ("Sent pricing tier PDF. Said she would review with the board.", 2.0, ("today", 14, 0)),
            (
                "Initial discovery call. They need a CRM for 50 reps. Pain points"
                " include dropping leads and no follow-up tracking.",
                5.0,
                None,
            ),
            ("Lead created via web form.", 6.0, None),
        ],
    },
    {
        "name": "Clint Barton",
        "company": "Avengers Compound",
        "phone": None,
        "status": "New",
        "follow_up_at": None,
        "discussions": [
            ("Inbound lead from website contact form.", 0.08, None),
        ],
    },
    {
        "name": "Nick Fury",
        "company": "S.H.I.E.L.D.",
        "phone": "555-0134",
        "status": "Contacted",
        "follow_up_at": None,
        "discussions": [
            ("Left a voicemail with his assistant.", 7.0, None),
        ],
    },
    {
        "name": "Reed Richards",
        "company": "Baxter Building",
        "phone": "555-0100",
        "status": "Won",
        "follow_up_at": None,
        "discussions": [
            ("Contract signed! Sending welcome package.", 21.0, None),
        ],
    },
    {
        "name": "Natasha Romanoff",
        "company": "Avengers Tower",
        "phone": "555-0177",
        "status": "Qualified",
        "follow_up_at": None,
        "discussions": [
            ("Budget confirmed for Q1. Wants a pilot with 10 seats.", 1.0, None),
            ("Demo went well. Asked about SSO and audit logs.", 3.0, None),
            ("Intro call. Evaluating three vendors.", 9.0, None),
        ],
    },
    {
        "name": "Gwen Stacy",
        "company": "Oscorp",
        "phone": None,
        "status": "Lost",
        "follow_up_at": None,
        "discussions": [
            ("Went with a competitor on price. Revisit in six months.", 10.0, None),
        ],
    },
    {
        "name": "Tony Stark",
        "company": "Stark Industries",
        "phone": "555-0113",
        "status": "Contacted",
        "follow_up_at": ("relative", -1.0),
        "discussions": [
            ("Asked for a callback this week. Has not picked up since.", 4.0, ("relative", -1.0)),
            ("First call. Interested in the enterprise tier.", 6.0, None),
        ],
    },
    {
        "name": "Peter Parker",
        "company": "Daily Bugle",
        "phone": "555-0121",
        "status": "New",
        "follow_up_at": None,
        "discussions": [],
    },
]


def _resolve(spec: tuple | None) -> str | None:
    if spec is None:
        return None
    if spec[0] == "today":
        return _today_at(spec[1], spec[2])
    if spec[0] == "relative":
        return _relative(spec[1])
    raise ValueError(f"Unknown follow-up spec: {spec!r}")


def seed() -> int:
    database.init_db()
    created = 0
    conn = database.connect()
    try:
        for entry in SEED_LEADS:
            existing = conn.execute(
                "SELECT id FROM leads WHERE LOWER(name) = LOWER(?)", (entry["name"],)
            ).fetchone()
            if existing is not None:
                continue
            now = datetime.now(timezone.utc).isoformat()
            cur = conn.execute(
                "INSERT INTO leads (name, company, phone, status, follow_up_at,"
                " created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    entry["name"],
                    entry["company"],
                    entry["phone"],
                    entry["status"],
                    _resolve(entry["follow_up_at"]),
                    now,
                    now,
                ),
            )
            lead_id = cur.lastrowid
            for note, days_ago, fu in entry["discussions"]:
                conn.execute(
                    "INSERT INTO discussions (lead_id, note, follow_up_at, created_at)"
                    " VALUES (?, ?, ?, ?)",
                    (lead_id, note, _resolve(fu), _days_ago(days_ago)),
                )
            created += 1
        conn.commit()
    finally:
        conn.close()
    return created


def main() -> None:
    created = seed()
    print(f"Seed complete: {created} new lead(s) added.")


if __name__ == "__main__":
    main()

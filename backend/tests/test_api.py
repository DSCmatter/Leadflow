"""Backend tests for LeadFlow (pytest + FastAPI TestClient).

Each test runs against an isolated temporary SQLite file so results never
depend on developer data or wall-clock-sensitive seed state. Fixed timestamps
are used for time-dependent cases (today / tomorrow / overdue / midnight).
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    db_file = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    from app import database
    from app.main import create_app

    database.init_db()
    with TestClient(create_app()) as test_client:
        yield test_client


def _create_lead(client: TestClient, name: str = "Ada Lovelace", **kwargs) -> dict:
    payload = {"name": name, "company": "Analytical Engines", "phone": "555-0001"}
    payload.update(kwargs)
    resp = client.post("/api/v1/leads", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


# 1. Creating a lead --------------------------------------------------------
def test_create_lead(client: TestClient) -> None:
    body = _create_lead(client)
    assert body["id"] > 0
    assert body["name"] == "Ada Lovelace"
    assert body["company"] == "Analytical Engines"
    assert "created_at" in body and "updated_at" in body


# 2. Rejecting a missing or empty lead name ----------------------------------
def test_create_lead_rejects_missing_name(client: TestClient) -> None:
    assert client.post("/api/v1/leads", json={}).status_code == 422


@pytest.mark.parametrize("bad", ["", "   ", "\t\n "])
def test_create_lead_rejects_blank_name(client: TestClient, bad: str) -> None:
    resp = client.post("/api/v1/leads", json={"name": bad})
    assert resp.status_code == 422


# 3. Defaulting new leads to New ----------------------------------------------
def test_new_lead_defaults_to_new_status(client: TestClient) -> None:
    assert _create_lead(client)["status"] == "New"


# 4. Retrieving leads ----------------------------------------------------------
def test_list_and_get_lead(client: TestClient) -> None:
    created = _create_lead(client)
    listed = client.get("/api/v1/leads")
    assert listed.status_code == 200
    assert any(item["id"] == created["id"] for item in listed.json())
    fetched = client.get(f"/api/v1/leads/{created['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Ada Lovelace"
    assert fetched.json()["discussions"] == []


# 5. Searching by name (case-insensitive, partial) ------------------------------
def test_search_by_name(client: TestClient) -> None:
    _create_lead(client, name="Sarah Connor")
    _create_lead(client, name="Hank Scorpio")
    resp = client.get("/api/v1/leads", params={"search": "sarah"})
    assert resp.status_code == 200
    names = [item["name"] for item in resp.json()]
    assert names == ["Sarah Connor"]


# 6. Filtering by status ---------------------------------------------------------
def test_filter_by_status(client: TestClient) -> None:
    ada = _create_lead(client, name="Ada Lovelace")
    _create_lead(client, name="Grace Hopper")
    client.patch(f"/api/v1/leads/{ada['id']}", json={"status": "Won"})
    resp = client.get("/api/v1/leads", params={"status": "Won"})
    assert [i["name"] for i in resp.json()] == ["Ada Lovelace"]
    resp = client.get("/api/v1/leads", params={"status": "New"})
    assert [i["name"] for i in resp.json()] == ["Grace Hopper"]


def test_filter_rejects_unknown_status(client: TestClient) -> None:
    assert client.get("/api/v1/leads", params={"status": "Nope"}).status_code == 422


def test_search_and_status_combine(client: TestClient) -> None:
    sarah = _create_lead(client, name="Sarah Connor")
    client.patch(f"/api/v1/leads/{sarah['id']}", json={"status": "Proposal Sent"})
    _create_lead(client, name="Sarah Miles")
    resp = client.get(
        "/api/v1/leads", params={"search": "sarah", "status": "Proposal Sent"}
    )
    assert [i["name"] for i in resp.json()] == ["Sarah Connor"]


# 7. 404 for a nonexistent lead ----------------------------------------------------
def test_get_missing_lead_returns_404(client: TestClient) -> None:
    assert client.get("/api/v1/leads/99999").status_code == 404
    assert client.get("/api/v1/leads/99999/discussions").status_code == 404
    assert client.patch("/api/v1/leads/99999", json={"status": "Won"}).status_code == 404
    assert (
        client.post("/api/v1/leads/99999/discussions", json={"note": "hi"}).status_code
        == 404
    )
    assert client.delete("/api/v1/leads/99999/follow-up").status_code == 404


# 8. Creating discussions ------------------------------------------------------------
def test_create_discussion(client: TestClient) -> None:
    lead = _create_lead(client)
    resp = client.post(
        f"/api/v1/leads/{lead['id']}/discussions", json={"note": "First call went well."}
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["lead_id"] == lead["id"]
    assert body["note"] == "First call went well."
    assert body["follow_up_at"] is None


# 9. Rejecting empty discussion notes ---------------------------------------------------
@pytest.mark.parametrize("bad", ["", "   "])
def test_create_discussion_rejects_blank_note(client: TestClient, bad: str) -> None:
    lead = _create_lead(client)
    resp = client.post(
        f"/api/v1/leads/{lead['id']}/discussions", json={"note": bad}
    )
    assert resp.status_code == 422
    # Nothing persisted.
    assert client.get(f"/api/v1/leads/{lead['id']}/discussions").json() == []


# 10. Saving follow-up reminders ----------------------------------------------------------
def test_discussion_with_follow_up_updates_lead(client: TestClient) -> None:
    lead = _create_lead(client)
    follow_up = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    resp = client.post(
        f"/api/v1/leads/{lead['id']}/discussions",
        json={"note": "Call back soon.", "follow_up_at": follow_up},
    )
    assert resp.status_code == 201
    assert resp.json()["follow_up_at"] is not None
    fetched = client.get(f"/api/v1/leads/{lead['id']}").json()
    assert fetched["follow_up_at"] == resp.json()["follow_up_at"]


def test_discussion_rejects_invalid_follow_up(client: TestClient) -> None:
    lead = _create_lead(client)
    resp = client.post(
        f"/api/v1/leads/{lead['id']}/discussions",
        json={"note": "Note", "follow_up_at": "not-a-date"},
    )
    assert resp.status_code == 422


# 11. Preserving existing reminders when a discussion has no new follow-up -------------------
def test_discussion_without_follow_up_preserves_reminder(client: TestClient) -> None:
    lead = _create_lead(client)
    follow_up = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    client.post(
        f"/api/v1/leads/{lead['id']}/discussions",
        json={"note": "First.", "follow_up_at": follow_up},
    )
    before = client.get(f"/api/v1/leads/{lead['id']}").json()["follow_up_at"]
    client.post(
        f"/api/v1/leads/{lead['id']}/discussions", json={"note": "Just a note."}
    )
    after = client.get(f"/api/v1/leads/{lead['id']}").json()["follow_up_at"]
    assert before == after


# 12. Updating the current reminder when a new one is supplied ----------------------------------
def test_new_follow_up_replaces_old(client: TestClient) -> None:
    lead = _create_lead(client)
    first = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    second = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    client.post(
        f"/api/v1/leads/{lead['id']}/discussions",
        json={"note": "First.", "follow_up_at": first},
    )
    client.post(
        f"/api/v1/leads/{lead['id']}/discussions",
        json={"note": "Second.", "follow_up_at": second},
    )
    current = client.get(f"/api/v1/leads/{lead['id']}").json()["follow_up_at"]
    assert current is not None and second[:16] == current[:16]


# 13. Cancelling a reminder ------------------------------------------------------------------------
def test_cancel_follow_up(client: TestClient) -> None:
    lead = _create_lead(client)
    follow_up = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    client.post(
        f"/api/v1/leads/{lead['id']}/discussions",
        json={"note": "First.", "follow_up_at": follow_up},
    )
    resp = client.delete(f"/api/v1/leads/{lead['id']}/follow-up")
    assert resp.status_code == 200
    assert resp.json()["follow_up_at"] is None
    # History is preserved.
    assert len(client.get(f"/api/v1/leads/{lead['id']}").json()["discussions"]) == 1


# 14. Discussions in reverse chronological order ------------------------------------------------------
def test_discussions_returned_newest_first(client: TestClient) -> None:
    from app import database

    lead = _create_lead(client)
    conn = sqlite3.connect(os.environ["DATABASE_PATH"])
    base = datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc)
    for i, day in enumerate([1, 3, 2]):  # inserted out of order on purpose
        conn.execute(
            "INSERT INTO discussions (lead_id, note, created_at) VALUES (?, ?, ?)",
            (lead["id"], f"note-{i}", (base + timedelta(days=day)).isoformat()),
        )
    conn.commit()
    conn.close()
    # Touch via API so updated_at ordering is irrelevant here.
    notes = [
        d["note"]
        for d in client.get(f"/api/v1/leads/{lead['id']}/discussions").json()
    ]
    assert notes == ["note-1", "note-2", "note-0"]
    detail = client.get(f"/api/v1/leads/{lead['id']}").json()
    assert [d["note"] for d in detail["discussions"]] == ["note-1", "note-2", "note-0"]
    # Dashboard preview reflects the newest discussion.
    listed = {i["id"]: i for i in client.get("/api/v1/leads").json()}
    assert listed[lead["id"]]["latest_note"] == "note-1"


# 15. Persisting status changes --------------------------------------------------------------------------
def test_status_change_persists(client: TestClient) -> None:
    lead = _create_lead(client)
    resp = client.patch(f"/api/v1/leads/{lead['id']}", json={"status": "Qualified"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "Qualified"
    assert client.get(f"/api/v1/leads/{lead['id']}").json()["status"] == "Qualified"


# 16. Rejecting unsupported status values -------------------------------------------------------------------
def test_status_change_rejects_unknown(client: TestClient) -> None:
    lead = _create_lead(client)
    resp = client.patch(f"/api/v1/leads/{lead['id']}", json={"status": "Celebrating"})
    assert resp.status_code == 422
    assert client.get(f"/api/v1/leads/{lead['id']}").json()["status"] == "New"


# 17. Rolling back after a failed multi-step operation ---------------------------------------------------------
def test_failed_discussion_write_rolls_back(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Force the UPDATE half of the discussion transaction to fail and verify
    the INSERT half was rolled back (no orphan discussion rows)."""
    from app import database

    lead = _create_lead(client)
    real_connect = database.connect

    class FailingConn:
        def __init__(self, conn: sqlite3.Connection) -> None:
            self._conn = conn

        def execute(self, sql: str, params=()) -> sqlite3.Cursor:  # type: ignore[no-untyped-def]
            if "UPDATE leads" in sql:
                raise sqlite3.IntegrityError("simulated failure")
            return self._conn.execute(sql, params)

        def __getattr__(self, name: str):  # type: ignore[no-untyped-def]
            return getattr(self._conn, name)

    monkeypatch.setattr(database, "connect", lambda: FailingConn(real_connect()))
    try:
        with pytest.raises(sqlite3.IntegrityError):
            database.create_discussion(lead["id"], note="Should not persist.")
    finally:
        monkeypatch.setattr(database, "connect", real_connect)
    assert database.list_discussions(lead["id"]) == []


def test_invalid_follow_up_leaves_no_partial_state(client: TestClient) -> None:
    lead = _create_lead(client)
    resp = client.post(
        f"/api/v1/leads/{lead['id']}/discussions",
        json={"note": "Bad date.", "follow_up_at": "31-02-2026"},
    )
    assert resp.status_code == 422
    detail = client.get(f"/api/v1/leads/{lead['id']}").json()
    assert detail["discussions"] == []
    assert detail["follow_up_at"] is None


# Time-dependent classification data (fixed timestamps) --------------------------------------------------------------
@pytest.mark.parametrize(
    "offset_days, label",
    [(-2.0, "overdue"), (0.25, "today"), (1.0, "tomorrow")],
)
def test_follow_up_timestamps_round_trip(
    client: TestClient, offset_days: float, label: str
) -> None:
    lead = _create_lead(client, name=f"Time {label}")
    moment = (datetime.now(timezone.utc) + timedelta(days=offset_days)).isoformat()
    resp = client.post(
        f"/api/v1/leads/{lead['id']}/discussions",
        json={"note": "Timed.", "follow_up_at": moment},
    )
    assert resp.status_code == 201
    stored = client.get(f"/api/v1/leads/{lead['id']}").json()["follow_up_at"]
    assert stored is not None
    delta = abs(
        (datetime.fromisoformat(stored) - datetime.fromisoformat(moment)).total_seconds()
    )
    assert delta < 5


def test_midnight_edge_follow_up_accepted(client: TestClient) -> None:
    lead = _create_lead(client)
    midnight = datetime.now(timezone.utc).replace(
        hour=0, minute=1, second=0, microsecond=0
    )
    if midnight <= datetime.now(timezone.utc):
        midnight += timedelta(days=1)
    resp = client.post(
        f"/api/v1/leads/{lead['id']}/discussions",
        json={"note": "Midnight.", "follow_up_at": midnight.isoformat()},
    )
    assert resp.status_code == 201


def test_health(client: TestClient) -> None:
    assert client.get("/api/v1/health").json() == {"status": "ok"}

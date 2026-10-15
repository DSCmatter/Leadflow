"""Lead, discussion, and follow-up routes (all under /api/v1)."""

from __future__ import annotations

import sqlite3

from fastapi import APIRouter, HTTPException, Query, status

from .. import database
from ..schemas import (
    DiscussionCreate,
    DiscussionResponse,
    LeadCreate,
    LeadDetailResponse,
    LeadListItem,
    LeadResponse,
    LeadUpdate,
)

router = APIRouter(prefix="/api/v1/leads", tags=["leads"])


def _to_500() -> HTTPException:
    return HTTPException(status_code=500, detail="Unexpected database error.")


@router.get("", response_model=list[LeadListItem])
def api_list_leads(
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
) -> list[dict]:
    if status is not None and status not in database.STATUSES:
        raise HTTPException(status_code=422, detail=f"Unsupported status: {status}.")
    try:
        return database.list_leads(status=status, search=search or None)
    except sqlite3.Error:
        raise _to_500()


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def api_create_lead(payload: LeadCreate) -> dict:
    try:
        return database.create_lead(
            name=payload.name, company=payload.company, phone=payload.phone
        )
    except sqlite3.Error:
        raise _to_500()


@router.get("/{lead_id}", response_model=LeadDetailResponse)
def api_get_lead(lead_id: int) -> dict:
    try:
        lead = database.get_lead(lead_id)
        lead["discussions"] = database.list_discussions(lead_id)
        return lead
    except database.LeadNotFoundError:
        raise HTTPException(status_code=404, detail="Lead not found.")
    except sqlite3.Error:
        raise _to_500()


@router.patch("/{lead_id}", response_model=LeadResponse)
def api_update_lead(lead_id: int, payload: LeadUpdate) -> dict:
    try:
        return database.update_lead(
            lead_id,
            status=payload.status,
            name=payload.name,
            company=payload.company,
            phone=payload.phone,
        )
    except database.LeadNotFoundError:
        raise HTTPException(status_code=404, detail="Lead not found.")
    except sqlite3.Error:
        raise _to_500()


@router.get("/{lead_id}/discussions", response_model=list[DiscussionResponse])
def api_list_discussions(lead_id: int) -> list[dict]:
    try:
        return database.list_discussions(lead_id)
    except database.LeadNotFoundError:
        raise HTTPException(status_code=404, detail="Lead not found.")
    except sqlite3.Error:
        raise _to_500()


@router.post(
    "/{lead_id}/discussions",
    response_model=DiscussionResponse,
    status_code=status.HTTP_201_CREATED,
)
def api_create_discussion(lead_id: int, payload: DiscussionCreate) -> dict:
    try:
        return database.create_discussion(
            lead_id, note=payload.note, follow_up_at=payload.follow_up_at
        )
    except database.LeadNotFoundError:
        raise HTTPException(status_code=404, detail="Lead not found.")
    except sqlite3.Error:
        raise _to_500()


@router.delete("/{lead_id}/follow-up", response_model=LeadResponse)
def api_cancel_follow_up(lead_id: int) -> dict:
    """Explicitly cancel the lead's current follow-up; history is preserved."""
    try:
        return database.clear_follow_up(lead_id)
    except database.LeadNotFoundError:
        raise HTTPException(status_code=404, detail="Lead not found.")
    except sqlite3.Error:
        raise _to_500()

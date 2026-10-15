"""Pydantic request/response schemas — the validation boundary of the API."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, field_validator

LeadStatus = Literal["New", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"]


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped if stripped else None


class LeadCreate(BaseModel):
    name: str
    company: str | None = None
    phone: str | None = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Name is required.")
        return value.strip()

    @field_validator("company", "phone")
    @classmethod
    def empty_optional_to_none(cls, value: str | None) -> str | None:
        return _blank_to_none(value)


class LeadUpdate(BaseModel):
    status: LeadStatus | None = None
    name: str | None = None
    company: str | None = None
    phone: str | None = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Name must not be empty.")
        return value.strip() if value is not None else None

    @field_validator("company", "phone")
    @classmethod
    def empty_optional_to_none(cls, value: str | None) -> str | None:
        return _blank_to_none(value)


class DiscussionCreate(BaseModel):
    note: str
    follow_up_at: str | None = None

    @field_validator("note")
    @classmethod
    def note_must_not_be_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Discussion note is required.")
        return value.strip()

    @field_validator("follow_up_at")
    @classmethod
    def follow_up_must_be_valid_iso(cls, value: str | None) -> str | None:
        if value is None:
            return None
        text = value.strip()
        if not text:
            raise ValueError("Follow-up date and time must both be provided.")
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            raise ValueError("Follow-up must be a valid ISO 8601 date-time.")
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat()


class DiscussionResponse(BaseModel):
    id: int
    lead_id: int
    note: str
    follow_up_at: str | None
    created_at: str


class LeadResponse(BaseModel):
    id: int
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus
    follow_up_at: str | None
    created_at: str
    updated_at: str


class LeadListItem(LeadResponse):
    latest_note: str | None = None
    latest_discussion_at: str | None = None


class LeadDetailResponse(LeadResponse):
    discussions: list[DiscussionResponse] = []

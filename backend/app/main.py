"""FastAPI application factory and wiring for LeadFlow."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import database
from .observability import init_observability, instrument_app
from .routes import leads


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    database.init_db()
    yield


def create_app() -> FastAPI:
    # Tracing must start before the app is instrumented.
    init_observability()
    app = FastAPI(title="LeadFlow API", version="1.0.0", lifespan=lifespan)

    origins = [
        o.strip()
        for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
        if o.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/v1/health")
    def health() -> dict:
        return {"status": "ok"}

    app.include_router(leads.router)

    # Temporary Autter Runtime selftest route: throws on purpose so the error
    # shows up in the dashboard. Delete before shipping.
    @app.get("/__autter-selftest/error")
    def autter_selftest_error() -> dict:
        raise RuntimeError("Autter Runtime selftest error (backend)")

    instrument_app(app)
    return app


app = create_app()

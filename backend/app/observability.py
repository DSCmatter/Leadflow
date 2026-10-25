"""Autter Runtime telemetry for the LeadFlow API.

Server-side telemetry goes out over OTLP/HTTP to Autter's ingester
(``https://otlp.autter.dev``) using the plain OpenTelemetry SDK -- there is no
Python Autter SDK. ``autter_tracing.init_tracing`` is the adapter Autter ships
for Python: it keeps error spans at any sampling ratio, counts every request in
the delta ``http.server.duration`` histogram the ingester reads, and scrubs
secrets/PII before export.

Telemetry is enabled only when ``OTEL_EXPORTER_OTLP_ENDPOINT`` is set, so the
test suite and local runs without a configured endpoint do not spawn exporters.
"""

from __future__ import annotations

import os
import uuid

import psutil
from opentelemetry import metrics
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlite3 import SQLite3Instrumentor
from opentelemetry.metrics import Observation
from opentelemetry.sdk.resources import Resource

from .autter_tracing import init_tracing

#: Kept alive for the process lifetime; the SDK holds the callback, not the
#: instrument, so dropping both would unregister the gauge.
_memory_gauge = None


def _resource() -> Resource:
    """Resource from the standard ``OTEL_*`` env vars plus a per-process id.

    ``OTEL_SERVICE_NAME`` and ``OTEL_RESOURCE_ATTRIBUTES`` supply the service
    name, release (``service.version``) and ``deployment.environment``. One
    ``service.instance.id`` per process lifetime keeps two instances of the
    same service apart in the dashboard.
    """
    return Resource.create(
        {
            "service.instance.id": os.environ.get("AUTTER_RUNTIME_INSTANCE_ID")
            or str(uuid.uuid4()),
        }
    )


def _register_process_memory_gauge() -> None:
    """Report current RSS so Autter can flag memory pressure for this service."""
    global _memory_gauge
    process = psutil.Process()

    def _observation(_options: object) -> list[Observation]:
        try:
            return [Observation(process.memory_info().rss)]
        except Exception:  # the process may be exiting
            return []

    _memory_gauge = metrics.get_meter("autter-process-memory").create_observable_gauge(
        "autter.process.memory.rss",
        callbacks=[_observation],
        unit="By",
        description="Resident set size of the API process",
    )


def init_observability() -> None:
    """Set up tracing, request metrics and the RSS gauge. Idempotent."""
    if not os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT"):
        return
    init_tracing(resource=_resource(), count_requests=True)
    _register_process_memory_gauge()
    SQLite3Instrumentor().instrument()


def instrument_app(app) -> None:  # noqa: ANN001 - FastAPI instance
    """Trace requests on ``app``.

    ``send``/``receive`` spans are excluded: they duplicate the request span on
    failures and carry no extra information for this API.
    """
    if not os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT"):
        return
    FastAPIInstrumentor.instrument_app(app, exclude_spans=["send", "receive"])

#!/bin/sh
# Seed demo data on first boot (idempotent: existing lead names are skipped),
# then hand off to the container command (uvicorn by default).
set -e

python seed.py

exec "$@"

"""Pytest bootstrap: ensure ``backend/`` is importable as top-level package root.

Tests import ``from app import ...``; when pytest runs with its default
``prepend`` import mode only the ``tests/`` directory lands on ``sys.path``,
so the ``app`` package (a sibling of ``tests/``) would not resolve unless
the backend directory itself is also on the path (e.g. via ``PYTHONPATH=.``).
Inserting it here makes ``uv run pytest`` work from ``backend/`` with no
extra environment setup.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

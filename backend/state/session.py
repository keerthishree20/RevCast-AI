"""In-memory session store. Keys are UUIDs; values are arbitrary dicts."""

from __future__ import annotations
from typing import Any, Optional

_store: dict[str, dict[str, Any]] = {}


def get(session_id: str) -> Optional[dict[str, Any]]:
    return _store.get(session_id)


def set(session_id: str, data: dict[str, Any]) -> None:
    _store[session_id] = data


def update(session_id: str, patch: dict[str, Any]) -> None:
    if session_id not in _store:
        _store[session_id] = {}
    _store[session_id].update(patch)


def require(session_id: str) -> dict[str, Any]:
    data = _store.get(session_id)
    if data is None:
        raise KeyError(f"Session {session_id!r} not found. Call /api/ingest first.")
    return data

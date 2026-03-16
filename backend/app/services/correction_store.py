from __future__ import annotations

from threading import Lock

from app.models.correction import CorrectionRecord


class CorrectionStore:
    """In-memory store for correction continuity keyed by expression/session id."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._records: dict[str, CorrectionRecord] = {}

    def upsert(self, record: CorrectionRecord) -> CorrectionRecord:
        with self._lock:
            self._records[record.id] = record
            return self._records[record.id]

    def get(self, key: str) -> CorrectionRecord | None:
        with self._lock:
            return self._records.get(key)


correction_store = CorrectionStore()

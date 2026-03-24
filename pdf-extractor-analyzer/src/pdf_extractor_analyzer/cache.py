from __future__ import annotations

import hashlib
import json
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from shutil import rmtree
from typing import Any

from .config import CacheMode
from .exceptions import CacheError


def compute_content_hash(file_path: Path) -> str:
    sha256 = hashlib.sha256()
    with file_path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


@dataclass(slots=True)
class CacheMetadata:
    page_count: int
    dpi: int
    created_at: str
    source_hash: str
    max_pages: int | None = None
    converter_version: str = "1"

    def as_dict(self) -> dict[str, Any]:
        return {
            "page_count": self.page_count,
            "dpi": self.dpi,
            "created_at": self.created_at,
            "source_hash": self.source_hash,
            "max_pages": self.max_pages,
            "converter_version": self.converter_version,
        }


class CacheManager:
    def __init__(self, base_cache_dir: Path, mode: CacheMode, ttl_days: int = 7):
        self.base_cache_dir = base_cache_dir
        self.mode = mode
        self.ttl_days = ttl_days
        self._ephemeral_dirs: list[Path] = []

    @staticmethod
    def cache_key_dir(source_hash: str, base_cache_dir: Path) -> Path:
        return base_cache_dir / source_hash[:16]

    def resolve_work_dir(self, source_hash: str) -> Path | None:
        if self.mode == CacheMode.DISABLED:
            return None

        if self.mode == CacheMode.PERSISTENT:
            work_dir = self.cache_key_dir(source_hash, self.base_cache_dir)
            work_dir.mkdir(parents=True, exist_ok=True)
            return work_dir

        temp_dir = Path(tempfile.mkdtemp(prefix=f"pdfx-{source_hash[:8]}-"))
        self._ephemeral_dirs.append(temp_dir)
        return temp_dir

    def cleanup(self) -> None:
        for path in self._ephemeral_dirs:
            if path.exists():
                rmtree(path, ignore_errors=True)
        self._ephemeral_dirs.clear()

    def metadata_path(self, cache_dir: Path) -> Path:
        return cache_dir / "metadata.json"

    def read_metadata(self, cache_dir: Path) -> CacheMetadata | None:
        path = self.metadata_path(cache_dir)
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return CacheMetadata(
                page_count=int(data["page_count"]),
                dpi=int(data["dpi"]),
                created_at=str(data["created_at"]),
                source_hash=str(data["source_hash"]),
                max_pages=data.get("max_pages"),
                converter_version=str(data.get("converter_version", "1")),
            )
        except (KeyError, ValueError, TypeError, json.JSONDecodeError) as exc:
            raise CacheError(f"Invalid cache metadata: {path}") from exc

    def write_metadata(self, cache_dir: Path, metadata: CacheMetadata) -> None:
        path = self.metadata_path(cache_dir)
        path.write_text(json.dumps(metadata.as_dict(), indent=2), encoding="utf-8")

    def list_page_images(self, cache_dir: Path) -> list[Path]:
        return sorted(cache_dir.glob("page_*.png"))

    def is_cache_hit(
        self,
        cache_dir: Path,
        *,
        source_hash: str,
        dpi: int,
        max_pages: int | None,
    ) -> bool:
        if not cache_dir.exists():
            return False

        try:
            metadata = self.read_metadata(cache_dir)
        except CacheError:
            return False
        if metadata is None:
            return False

        if metadata.source_hash != source_hash or metadata.dpi != dpi:
            return False

        if metadata.max_pages != max_pages:
            return False

        pages = self.list_page_images(cache_dir)
        return len(pages) == metadata.page_count and metadata.page_count > 0

    def cleanup_expired(self) -> int:
        if self.mode != CacheMode.PERSISTENT:
            return 0
        if not self.base_cache_dir.exists():
            return 0

        now = datetime.now(UTC)
        cutoff = now - timedelta(days=self.ttl_days)
        removed = 0

        for entry in self.base_cache_dir.iterdir():
            if not entry.is_dir():
                continue
            metadata_path = entry / "metadata.json"
            if not metadata_path.exists():
                continue
            try:
                metadata = self.read_metadata(entry)
                if metadata is None:
                    continue
                created_at = datetime.fromisoformat(metadata.created_at)
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=UTC)
                if created_at < cutoff:
                    rmtree(entry, ignore_errors=True)
                    removed += 1
            except Exception:
                continue

        return removed

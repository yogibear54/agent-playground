from datetime import UTC, datetime, timedelta
import json
from pathlib import Path

from pdf_extractor_analyzer.cache import CacheManager, CacheMetadata, compute_content_hash
from pdf_extractor_analyzer.config import CacheMode


def test_compute_content_hash_stable(tmp_path: Path):
    sample = tmp_path / "sample.pdf"
    sample.write_bytes(b"abc123")

    first = compute_content_hash(sample)
    second = compute_content_hash(sample)

    assert first == second


def test_ephemeral_cache_cleanup(tmp_path: Path):
    manager = CacheManager(tmp_path / "cache", mode=CacheMode.EPHEMERAL)
    work_dir = manager.resolve_work_dir("0123456789abcdef" * 4)
    assert work_dir is not None
    assert work_dir.exists()

    manager.cleanup()
    assert not work_dir.exists()


def test_cache_hit_requires_metadata_match(tmp_path: Path):
    cache_dir = tmp_path / "cache"
    manager = CacheManager(cache_dir, mode=CacheMode.PERSISTENT)
    source_hash = "a" * 64
    work_dir = manager.resolve_work_dir(source_hash)
    assert work_dir is not None

    (work_dir / "page_001.png").write_bytes(b"img-1")
    (work_dir / "page_002.png").write_bytes(b"img-2")
    manager.write_metadata(
        work_dir,
        CacheMetadata(
            page_count=2,
            dpi=150,
            created_at=datetime.now(UTC).isoformat(),
            source_hash=source_hash,
            max_pages=None,
        ),
    )

    assert manager.is_cache_hit(work_dir, source_hash=source_hash, dpi=150, max_pages=None)
    assert not manager.is_cache_hit(work_dir, source_hash=source_hash, dpi=200, max_pages=None)
    assert not manager.is_cache_hit(work_dir, source_hash=source_hash, dpi=150, max_pages=1)
    assert not manager.is_cache_hit(work_dir, source_hash="b" * 64, dpi=150, max_pages=None)


def test_invalid_metadata_returns_cache_miss(tmp_path: Path):
    manager = CacheManager(tmp_path / "cache", mode=CacheMode.PERSISTENT)
    source_hash = "c" * 64
    work_dir = manager.resolve_work_dir(source_hash)
    assert work_dir is not None

    (work_dir / "page_001.png").write_bytes(b"img")
    (work_dir / "metadata.json").write_text("not-json", encoding="utf-8")

    assert manager.is_cache_hit(work_dir, source_hash=source_hash, dpi=150, max_pages=None) is False


def test_cleanup_expired_removes_old_entries(tmp_path: Path):
    cache_root = tmp_path / "cache"
    manager = CacheManager(cache_root, mode=CacheMode.PERSISTENT, ttl_days=7)

    old_dir = cache_root / "old-entry"
    old_dir.mkdir(parents=True, exist_ok=True)
    old_data = {
        "page_count": 1,
        "dpi": 150,
        "created_at": (datetime.now(UTC) - timedelta(days=10)).isoformat(),
        "source_hash": "d" * 64,
        "max_pages": None,
        "converter_version": "1",
    }
    (old_dir / "metadata.json").write_text(json.dumps(old_data), encoding="utf-8")

    new_dir = cache_root / "new-entry"
    new_dir.mkdir(parents=True, exist_ok=True)
    new_data = {
        "page_count": 1,
        "dpi": 150,
        "created_at": datetime.now(UTC).isoformat(),
        "source_hash": "e" * 64,
        "max_pages": None,
        "converter_version": "1",
    }
    (new_dir / "metadata.json").write_text(json.dumps(new_data), encoding="utf-8")

    removed = manager.cleanup_expired()
    assert removed == 1
    assert not old_dir.exists()
    assert new_dir.exists()

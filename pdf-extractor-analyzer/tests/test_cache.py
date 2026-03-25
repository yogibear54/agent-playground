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


def test_write_and_read_content(tmp_path: Path):
    """Test writing and reading content.json."""
    manager = CacheManager(tmp_path, mode=CacheMode.PERSISTENT)
    cache_dir = tmp_path / "test-cache"
    cache_dir.mkdir()

    content = {"extracted": "data", "value": 123}
    params = {"mode": "full_text", "model": "gpt-4o"}

    manager.write_content(cache_dir, content, params)

    # Verify file exists
    content_path = cache_dir / "content.json"
    assert content_path.exists()

    # Read back and verify
    cached = manager.read_content(cache_dir)
    assert cached is not None
    assert cached["content"] == content
    assert cached["extraction_params"] == params
    assert "cached_at" in cached


def test_is_content_cache_hit(tmp_path: Path):
    """Test content cache hit detection."""
    manager = CacheManager(tmp_path, mode=CacheMode.PERSISTENT)
    cache_dir = tmp_path / "test-cache"
    cache_dir.mkdir()

    content = {"result": "test"}
    params = {"mode": "summary", "model": "gpt-4o"}

    manager.write_content(cache_dir, content, params)

    # Should hit with matching params
    assert manager.is_content_cache_hit(cache_dir, params) is True

    # Should miss with different params
    different_params = {"mode": "full_text", "model": "gpt-4o"}
    assert manager.is_content_cache_hit(cache_dir, different_params) is False


def test_read_content_handles_missing_file(tmp_path: Path):
    """Test read_content returns None for missing content.json."""
    manager = CacheManager(tmp_path, mode=CacheMode.PERSISTENT)
    cache_dir = tmp_path / "empty-cache"
    cache_dir.mkdir()

    assert manager.read_content(cache_dir) is None


def test_read_content_handles_corrupted_file(tmp_path: Path):
    """Test read_content returns None for corrupted content.json."""
    manager = CacheManager(tmp_path, mode=CacheMode.PERSISTENT)
    cache_dir = tmp_path / "corrupt-cache"
    cache_dir.mkdir()

    # Write invalid JSON
    (cache_dir / "content.json").write_text("not valid json", encoding="utf-8")

    assert manager.read_content(cache_dir) is None


def test_cache_key_uses_32_char_hash(tmp_path: Path):
    """Test that cache_key_dir uses 32 characters of the hash."""
    manager = CacheManager(tmp_path, mode=CacheMode.PERSISTENT)
    full_hash = "a" * 64

    key_dir = manager.cache_key_dir(full_hash, tmp_path)

    # Should use 32 characters
    expected_name = "a" * 32
    assert key_dir.name == expected_name
    assert len(key_dir.name) == 32

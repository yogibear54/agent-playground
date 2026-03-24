from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from pathlib import Path


class CacheMode(str, Enum):
    PERSISTENT = "persistent"
    EPHEMERAL = "ephemeral"
    DISABLED = "disabled"


@dataclass(slots=True)
class ExtractorConfig:
    dpi: int = 150
    cache_dir: Path = Path("./cache")
    cache_mode: CacheMode = CacheMode.PERSISTENT
    cache_ttl_days: int = 7
    force_conversion: bool = False
    max_pages: int | None = None

    model: str = "openai/gpt-4o"
    fallback_model: str | None = "openai/gpt-4o-mini"
    replicate_api_token: str | None = None
    max_retries: int = 3
    retry_backoff_seconds: float = 1.0
    timeout_seconds: int = 60

    def validate(self) -> None:
        if self.dpi <= 0:
            raise ValueError("dpi must be > 0")
        if self.cache_ttl_days < 0:
            raise ValueError("cache_ttl_days cannot be negative")
        if self.max_retries < 1:
            raise ValueError("max_retries must be >= 1")
        if self.retry_backoff_seconds < 0:
            raise ValueError("retry_backoff_seconds cannot be negative")
        if self.timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be > 0")

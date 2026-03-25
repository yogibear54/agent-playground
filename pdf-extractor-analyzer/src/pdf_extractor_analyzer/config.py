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

    # Input validation limits
    max_image_width: int = 4096
    max_image_height: int = 4096
    max_image_bytes: int = 20_971_520  # 20MB
    max_pdf_file_size: int | None = None  # None = unlimited

    # Logging configuration
    log_level: str = "WARNING"

    # Model API parameters
    max_completion_tokens: int = 4096
    temperature: float = 0.0
    top_p: float = 1.0
    presence_penalty: float = 0.0
    frequency_penalty: float = 0.0

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
        if self.max_image_width <= 0:
            raise ValueError("max_image_width must be > 0")
        if self.max_image_height <= 0:
            raise ValueError("max_image_height must be > 0")
        if self.max_image_bytes <= 0:
            raise ValueError("max_image_bytes must be > 0")
        if self.max_pdf_file_size is not None and self.max_pdf_file_size <= 0:
            raise ValueError("max_pdf_file_size must be > 0 or None")

        # Validate log level
        valid_levels = ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL")
        if self.log_level.upper() not in valid_levels:
            raise ValueError(f"log_level must be one of {valid_levels}, got {self.log_level}")

        # Validate model API parameters
        if self.max_completion_tokens <= 0:
            raise ValueError("max_completion_tokens must be > 0")
        if not (0.0 <= self.temperature <= 2.0):
            raise ValueError(f"temperature must be between 0.0 and 2.0, got {self.temperature}")
        if not (0.0 <= self.top_p <= 1.0):
            raise ValueError(f"top_p must be between 0.0 and 1.0, got {self.top_p}")
        if not (-2.0 <= self.presence_penalty <= 2.0):
            raise ValueError(f"presence_penalty must be between -2.0 and 2.0, got {self.presence_penalty}")
        if not (-2.0 <= self.frequency_penalty <= 2.0):
            raise ValueError(f"frequency_penalty must be between -2.0 and 2.0, got {self.frequency_penalty}")

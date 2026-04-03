from __future__ import annotations

import os
import warnings
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import ClassVar


class CacheMode(str, Enum):
    PERSISTENT = "persistent"
    EPHEMERAL = "ephemeral"
    DISABLED = "disabled"


@dataclass(slots=True)
class ReplicateProviderConfig:
    api_token: str | None = None
    max_concurrent_calls: int = 1
    model: str | None = None
    fallback_model: str | None = None


@dataclass(slots=True)
class OpenRouterProviderConfig:
    api_key: str | None = None
    base_url: str = "https://openrouter.ai/api/v1"
    model: str | None = None
    fallback_model: str | None = None


@dataclass(slots=True)
class ExtractorConfig:
    LEGACY_DEFAULT_MODEL: ClassVar[str] = "openai/gpt-4o"
    LEGACY_DEFAULT_FALLBACK_MODEL: ClassVar[str | None] = "openai/gpt-4o-mini"
    # OPENROUTER_DEFAULT_MODEL: ClassVar[str] = "qwen/qwen3.6-plus:free"
    OPENROUTER_DEFAULT_MODEL: ClassVar[str] = "nvidia/llama-nemotron-embed-vl-1b-v2:free"
    OPENROUTER_DEFAULT_FALLBACK_MODEL: ClassVar[str | None] = "openai/gpt-4o"

    dpi: int = 72
    cache_dir: Path = Path("./cache")
    cache_mode: CacheMode = CacheMode.PERSISTENT
    cache_ttl_days: int = 7
    force_conversion: bool = False
    max_pages: int | None = None

    provider: str = "replicate"
    model: str = LEGACY_DEFAULT_MODEL
    fallback_model: str | None = LEGACY_DEFAULT_FALLBACK_MODEL

    # New provider-grouped settings
    replicate: ReplicateProviderConfig = field(default_factory=ReplicateProviderConfig)
    openrouter: OpenRouterProviderConfig = field(default_factory=OpenRouterProviderConfig)

    # Legacy compatibility fields (kept for strict backward compatibility)
    replicate_api_token: str | None = None
    max_concurrent_replicate_calls: int = 1

    max_retries: int = 3
    retry_backoff_seconds: float = 1.0
    timeout_seconds: int = 60

    # Async processing controls
    max_concurrent_pages: int = 4
    async_requests_per_second: float = 8.0

    # Input validation limits
    image_max_long_edge: int | 600 = None
    max_image_width: int = 8000
    max_image_height: int = 8000
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

    def __post_init__(self) -> None:
        self._sync_legacy_provider_fields()

    def _sync_legacy_provider_fields(self) -> None:
        """Keep old and new provider settings in sync.

        Legacy values win when explicitly provided; otherwise grouped values are
        mirrored back to legacy fields so existing code paths continue to work.
        """
        # replicate_api_token
        if self.replicate_api_token is not None:
            if self.replicate.api_token != self.replicate_api_token:
                warnings.warn(
                    "replicate_api_token is deprecated; prefer config.replicate.api_token",
                    DeprecationWarning,
                    stacklevel=3,
                )
            self.replicate.api_token = self.replicate_api_token
        elif self.replicate.api_token is not None:
            self.replicate_api_token = self.replicate.api_token

        # max_concurrent_replicate_calls
        if self.max_concurrent_replicate_calls != 1 and self.replicate.max_concurrent_calls != self.max_concurrent_replicate_calls:
            warnings.warn(
                "max_concurrent_replicate_calls is deprecated; prefer config.replicate.max_concurrent_calls",
                DeprecationWarning,
                stacklevel=3,
            )
            self.replicate.max_concurrent_calls = self.max_concurrent_replicate_calls
        elif self.replicate.max_concurrent_calls != self.max_concurrent_replicate_calls:
            # New grouped config was customized while legacy value stayed default.
            self.max_concurrent_replicate_calls = self.replicate.max_concurrent_calls

    def get_replicate_api_token(self) -> str | None:
        # Config value wins; otherwise allow env var fallback behavior.
        return self.replicate.api_token or os.getenv("REPLICATE_API_TOKEN")

    def get_replicate_max_concurrent_calls(self) -> int:
        return self.replicate.max_concurrent_calls

    def get_openrouter_api_key(self) -> str | None:
        # Config value wins, then env var fallback.
        return self.openrouter.api_key or os.getenv("OPENROUTER_API_KEY")

    def get_primary_model(self) -> str:
        provider_key = self.provider.strip().lower()
        if provider_key == "openrouter":
            if self.openrouter.model:
                return self.openrouter.model
            # Back-compat: if user explicitly provided legacy model, keep it.
            if self.model != self.LEGACY_DEFAULT_MODEL:
                return self.model
            return self.OPENROUTER_DEFAULT_MODEL

        # replicate/default path
        return self.replicate.model or self.model

    def get_fallback_model(self) -> str | None:
        provider_key = self.provider.strip().lower()
        if provider_key == "openrouter":
            if self.openrouter.fallback_model is not None:
                return self.openrouter.fallback_model
            # Back-compat: preserve explicit legacy fallback values only.
            if self.fallback_model != self.LEGACY_DEFAULT_FALLBACK_MODEL:
                return self.fallback_model
            return self.OPENROUTER_DEFAULT_FALLBACK_MODEL

        # replicate/default path
        if self.replicate.fallback_model is not None:
            return self.replicate.fallback_model
        return self.fallback_model

    def validate(self) -> None:
        self._sync_legacy_provider_fields()

        if self.dpi <= 0:
            raise ValueError("dpi must be > 0")
        if self.cache_ttl_days < 0:
            raise ValueError("cache_ttl_days cannot be negative")

        provider_key = self.provider.strip().lower()
        valid_providers = ("replicate", "openrouter")
        if provider_key not in valid_providers:
            raise ValueError(f"provider must be one of {valid_providers}, got {self.provider}")

        if self.max_retries < 1:
            raise ValueError("max_retries must be >= 1")
        if self.retry_backoff_seconds < 0:
            raise ValueError("retry_backoff_seconds cannot be negative")
        if self.timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be > 0")
        if self.max_concurrent_pages <= 0:
            raise ValueError("max_concurrent_pages must be > 0")
        if self.async_requests_per_second <= 0:
            raise ValueError("async_requests_per_second must be > 0")

        if self.get_replicate_max_concurrent_calls() <= 0:
            raise ValueError("max_concurrent_replicate_calls must be > 0")

        if provider_key == "openrouter" and not self.get_openrouter_api_key():
            raise ValueError(
                "OpenRouter provider requires API key via openrouter.api_key or OPENROUTER_API_KEY"
            )

        if self.image_max_long_edge is not None and self.image_max_long_edge <= 0:
            raise ValueError("image_max_long_edge must be > 0 or None")
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

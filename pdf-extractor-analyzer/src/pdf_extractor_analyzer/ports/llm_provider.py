from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol, runtime_checkable


@dataclass(slots=True, frozen=True)
class GenerationParams:
    """Provider-agnostic generation parameters for text/vision model calls."""

    max_completion_tokens: int = 4096
    temperature: float = 0.0
    top_p: float = 1.0
    presence_penalty: float = 0.0
    frequency_penalty: float = 0.0


@dataclass(slots=True, frozen=True)
class LLMRequest:
    """Normalized request payload for an LLM provider adapter."""

    prompt: str
    model: str
    image_bytes: bytes | None = None
    timeout_seconds: int | None = None
    generation: GenerationParams = field(default_factory=GenerationParams)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True, frozen=True)
class LLMResponse:
    """Normalized response payload from an LLM provider adapter."""

    text: str
    provider: str
    model: str
    raw_output: Any | None = None


class ProviderErrorCode(str, Enum):
    """Normalized provider error categories for retry/handling policies."""

    AUTHENTICATION = "authentication"
    RATE_LIMIT = "rate_limit"
    TIMEOUT = "timeout"
    INVALID_REQUEST = "invalid_request"
    SERVICE_UNAVAILABLE = "service_unavailable"
    UNKNOWN = "unknown"


class ProviderError(Exception):
    """Normalized provider exception used by adapters.

    Adapters should map provider-specific exceptions to this type so the
    application layer can apply uniform retry and error-handling policies.
    """

    def __init__(
        self,
        message: str,
        *,
        provider: str,
        code: ProviderErrorCode = ProviderErrorCode.UNKNOWN,
        model: str | None = None,
        retryable: bool | None = None,
        cause: BaseException | None = None,
    ) -> None:
        super().__init__(message)
        self.provider = provider
        self.code = code
        self.model = model
        self.retryable = retryable
        self.cause = cause


@runtime_checkable
class LLMProviderPort(Protocol):
    """Port contract for provider adapters used by the analyzer/application layer."""

    @property
    def provider_name(self) -> str:
        """Stable provider identifier (e.g. 'replicate', 'openrouter')."""

    def generate(self, request: LLMRequest) -> LLMResponse:
        """Run a synchronous model inference request."""

    async def agenerate(self, request: LLMRequest) -> LLMResponse:
        """Run an asynchronous model inference request."""

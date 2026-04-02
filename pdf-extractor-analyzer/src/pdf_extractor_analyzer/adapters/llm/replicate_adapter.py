from __future__ import annotations

import asyncio
import base64
from typing import Any

from ...config import ExtractorConfig
from ...ports.llm_provider import (
    LLMProviderPort,
    LLMRequest,
    LLMResponse,
    ProviderError,
    ProviderErrorCode,
)


def _import_replicate() -> Any:
    try:
        import replicate as replicate_module
    except ImportError as exc:
        raise ImportError(
            "Replicate SDK is not installed. Install with: pip install 'pdf-extractor-analyzer[replicate]'"
        ) from exc
    return replicate_module


class ReplicateLLMAdapter(LLMProviderPort):
    """Replicate implementation of the LLM provider port."""

    def __init__(
        self,
        config: ExtractorConfig,
        *,
        client: Any | None = None,
        async_client: Any | None = None,
    ):
        self.config = config
        self.client = client if client is not None else self._build_client()
        self.async_client = async_client if async_client is not None else self._build_async_client()
        self._sync_replicate_semaphore = asyncio.Semaphore(config.get_replicate_max_concurrent_calls())

    @property
    def provider_name(self) -> str:
        return "replicate"

    def generate(self, request: LLMRequest) -> LLMResponse:
        payload = self._build_input_payload(request)
        timeout_seconds = request.timeout_seconds or self.config.timeout_seconds

        try:
            try:
                output = self.client.run(
                    request.model,
                    input=payload,
                    wait=timeout_seconds,
                )
            except TypeError:
                # Older replicate client versions may not support `wait`.
                output = self.client.run(request.model, input=payload)
            return LLMResponse(
                text=self._normalize_output(output),
                provider=self.provider_name,
                model=request.model,
                raw_output=output,
            )
        except Exception as exc:
            raise self._to_provider_error(exc, model=request.model) from exc

    async def agenerate(self, request: LLMRequest) -> LLMResponse:
        payload = self._build_input_payload(request)
        timeout_seconds = request.timeout_seconds or self.config.timeout_seconds

        try:
            output = await self._run_model_async(
                model=request.model,
                input_payload=payload,
                timeout_seconds=timeout_seconds,
            )
            return LLMResponse(
                text=self._normalize_output(output),
                provider=self.provider_name,
                model=request.model,
                raw_output=output,
            )
        except Exception as exc:
            raise self._to_provider_error(exc, model=request.model) from exc

    def _build_client(self) -> Any:
        token = self.config.get_replicate_api_token()
        replicate = _import_replicate()
        if token:
            return replicate.Client(api_token=token)
        return replicate.Client()

    def _build_async_client(self) -> Any | None:
        """Build AsyncReplicate client when available.

        When AsyncReplicate is missing, async inference uses sync ``client.run``
        in a thread, serialized with a semaphore (see ``_run_model_async``).
        """
        replicate = _import_replicate()
        async_cls = getattr(replicate, "AsyncReplicate", None)
        if async_cls is None:
            return None

        token = self.config.get_replicate_api_token()
        kwargs: dict[str, Any] = {}
        if token:
            kwargs["bearer_token"] = token

        try:
            return async_cls(**kwargs)
        except TypeError:
            if token:
                try:
                    return async_cls(api_token=token)
                except TypeError:
                    return async_cls()
            return async_cls()

    async def _run_model_async(
        self,
        *,
        model: str,
        input_payload: dict[str, Any],
        timeout_seconds: int,
    ) -> Any:
        if self.async_client is not None and hasattr(self.async_client, "run"):
            try:
                return await self.async_client.run(
                    model,
                    input=input_payload,
                    wait=timeout_seconds,
                )
            except TypeError:
                return await self.async_client.run(model, input=input_payload)

        # Without AsyncReplicate, avoid client.async_run(): large image uploads can
        # hit write timeouts. Run sync client in a thread and limit concurrency.
        def _sync_run() -> Any:
            try:
                return self.client.run(
                    model,
                    input=input_payload,
                    wait=timeout_seconds,
                )
            except TypeError:
                return self.client.run(model, input=input_payload)

        async with self._sync_replicate_semaphore:
            return await asyncio.to_thread(_sync_run)

    def _build_input_payload(self, request: LLMRequest) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "prompt": request.prompt,
            "max_completion_tokens": request.generation.max_completion_tokens,
            "temperature": request.generation.temperature,
            "top_p": request.generation.top_p,
            "presence_penalty": request.generation.presence_penalty,
            "frequency_penalty": request.generation.frequency_penalty,
        }

        if request.image_bytes is not None:
            payload["image_input"] = [self._bytes_to_data_url(request.image_bytes)]

        return payload

    @staticmethod
    def _bytes_to_data_url(image_bytes: bytes, mime_type: str = "image/png") -> str:
        encoded = base64.b64encode(image_bytes).decode("ascii")
        return f"data:{mime_type};base64,{encoded}"

    @staticmethod
    def _normalize_output(output: Any) -> str:
        if isinstance(output, str):
            return output
        if isinstance(output, list):
            return "".join(str(part) for part in output)
        if hasattr(output, "__iter__"):
            return "".join(str(part) for part in output)
        return str(output)

    def _to_provider_error(self, exc: Exception, *, model: str) -> ProviderError:
        message = str(exc).strip() or type(exc).__name__
        lower = message.lower()

        if "401" in lower or "unauthorized" in lower or "authentication" in lower:
            code = ProviderErrorCode.AUTHENTICATION
            retryable = False
        elif "429" in lower or "rate" in lower and "limit" in lower:
            code = ProviderErrorCode.RATE_LIMIT
            retryable = True
        elif "timeout" in lower:
            code = ProviderErrorCode.TIMEOUT
            retryable = True
        elif "400" in lower or "invalid" in lower:
            code = ProviderErrorCode.INVALID_REQUEST
            retryable = False
        elif "503" in lower or "service unavailable" in lower:
            code = ProviderErrorCode.SERVICE_UNAVAILABLE
            retryable = True
        else:
            code = ProviderErrorCode.UNKNOWN
            retryable = None

        return ProviderError(
            message,
            provider=self.provider_name,
            code=code,
            model=model,
            retryable=retryable,
            cause=exc,
        )

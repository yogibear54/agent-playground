from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
import warnings
from typing import Any, Awaitable, Callable

from .adapters.llm import ReplicateLLMAdapter
from .config import ExtractorConfig
from .exceptions import AnalysisError, ValidationError
from .ports.llm_provider import GenerationParams, LLMProviderPort, LLMRequest, ProviderError
from .schemas import ExtractionMode

# Module-level logger
logger = logging.getLogger(__name__)


def _format_last_error(exc: BaseException | None) -> str:
    if exc is None:
        return "unknown error"
    text = str(exc).strip()
    if text:
        return text
    return type(exc).__name__


def _is_model_region_or_access_error(exc: BaseException | None) -> bool:
    """True when the provider indicates the model cannot be used (e.g. region)."""
    if exc is None:
        return False
    low = _format_last_error(exc).lower()
    return "not available in your region" in low or "not available in region" in low


def _analysis_failure_message(provider_name: str, exc: BaseException | None) -> str:
    """User-facing AnalysisError text; avoids sounding like an internal bug for API issues."""
    detail = _format_last_error(exc)
    if _is_model_region_or_access_error(exc):
        return (
            f"{provider_name}: The selected model is not available in your region. "
            f"Configure a different model or provider, or use an endpoint that serves your location. "
            f"(API: {detail})"
        )
    return f"{provider_name} analysis failed: {detail}"


def _log_models_exhausted(
    logger: logging.Logger,
    *,
    async_mode: bool,
    candidate_models: list[str],
    last_error: BaseException | None,
    extra: dict[str, Any],
) -> None:
    ctx = "async " if async_mode else ""
    n = len(candidate_models)
    models_label = ", ".join(candidate_models)
    if _is_model_region_or_access_error(last_error):
        logger.warning(
            f"All {n} configured model(s) unavailable for {ctx}analysis "
            f"(region or access): [{models_label}]. {_format_last_error(last_error)}",
            extra=extra,
        )
        return
    logger.error(
        f"All {n} models failed after {ctx}retries",
        extra={**extra, "last_error": _format_last_error(last_error)[:200]},
    )


class VisionAnalyzer:
    def __init__(self, config: ExtractorConfig, provider: LLMProviderPort | None = None):
        self.config = config
        self.provider = provider or ReplicateLLMAdapter(config)

        # Setup logger with configured level
        self._logger = logging.getLogger(f"{__name__}.VisionAnalyzer")
        self._logger.setLevel(getattr(logging, config.log_level.upper()))

    def _validate_image_bytes(self, image_bytes: bytes) -> None:
        """Validate image bytes for size limits.

        Raises:
            ValidationError: If image exceeds configured size limits.
        """
        if not isinstance(image_bytes, bytes):
            raise ValidationError(
                f"image_bytes must be bytes, got {type(image_bytes).__name__}",
                field="image_bytes",
                value=type(image_bytes).__name__,
            )

        image_size = len(image_bytes)
        if image_size > self.config.max_image_bytes:
            raise ValidationError(
                f"Image size ({image_size} bytes) exceeds maximum allowed "
                f"({self.config.max_image_bytes} bytes). "
                f"Consider reducing DPI or increasing max_image_bytes config.",
                field="image_bytes",
                value=image_size,
            )

    def analyze_page(
        self,
        *,
        image_bytes: bytes,
        mode: ExtractionMode,
        structured_schema: dict[str, Any] | None = None,
        correlation_id: str | None = None,
        page_number: int | None = None,
    ) -> str | dict[str, Any]:
        """Analyze a single page image."""
        self._validate_image_bytes(image_bytes)

        # Generate correlation ID if not provided
        cid = correlation_id or str(uuid.uuid4())[:8]
        extra = {
            "correlation_id": cid,
            "page_number": page_number,
            "mode": mode.value,
            "provider": self.provider.provider_name,
            "model": self.config.get_primary_model(),
        }

        self._logger.info("Starting page analysis", extra=extra)
        start_time = time.time()

        prompt = self._build_prompt(mode=mode, structured_schema=structured_schema)

        try:
            raw = self._run_with_retries(
                prompt=prompt,
                image_bytes=image_bytes,
                correlation_id=cid,
                page_number=page_number,
            )

            duration_ms = (time.time() - start_time) * 1000
            self._logger.info(
                "Page analysis completed successfully",
                extra={**extra, "duration_ms": round(duration_ms, 2)},
            )

            if mode == ExtractionMode.STRUCTURED:
                return self._extract_json_object(raw)
            return raw.strip()

        except AnalysisError as err:
            duration_ms = (time.time() - start_time) * 1000
            self._logger.error(
                "Page analysis failed after all retries: %s",
                err,
                extra={**extra, "duration_ms": round(duration_ms, 2)},
            )
            raise

    async def analyze_page_async(
        self,
        *,
        image_bytes: bytes,
        mode: ExtractionMode,
        structured_schema: dict[str, Any] | None = None,
        correlation_id: str | None = None,
        page_number: int | None = None,
        rate_limit_coro: Callable[[], Awaitable[None]] | None = None,
    ) -> str | dict[str, Any]:
        """Analyze a single page image asynchronously."""
        self._validate_image_bytes(image_bytes)

        cid = correlation_id or str(uuid.uuid4())[:8]
        extra = {
            "correlation_id": cid,
            "page_number": page_number,
            "mode": mode.value,
            "provider": self.provider.provider_name,
            "model": self.config.get_primary_model(),
        }

        self._logger.info("Starting async page analysis", extra=extra)
        start_time = time.time()

        prompt = self._build_prompt(mode=mode, structured_schema=structured_schema)

        try:
            raw = await self._run_with_retries_async(
                prompt=prompt,
                image_bytes=image_bytes,
                correlation_id=cid,
                page_number=page_number,
                rate_limit_coro=rate_limit_coro,
            )

            duration_ms = (time.time() - start_time) * 1000
            self._logger.info(
                "Async page analysis completed successfully",
                extra={**extra, "duration_ms": round(duration_ms, 2)},
            )

            if mode == ExtractionMode.STRUCTURED:
                return self._extract_json_object(raw)
            return raw.strip()

        except AnalysisError as err:
            duration_ms = (time.time() - start_time) * 1000
            self._logger.error(
                "Async page analysis failed after all retries: %s",
                err,
                extra={**extra, "duration_ms": round(duration_ms, 2)},
            )
            raise

    def repair_structured_output(
        self,
        *,
        candidate: dict[str, Any],
        validation_error: str,
        structured_schema: dict[str, Any] | None,
        correlation_id: str | None = None,
    ) -> dict[str, Any]:
        """Repair structured output that failed validation."""
        cid = correlation_id or str(uuid.uuid4())[:8]

        if not isinstance(candidate, dict):
            raise AnalysisError(f"candidate must be a dict, got {type(candidate).__name__}")

        # Prevent overly large candidates from creating huge prompts
        candidate_json = json.dumps(candidate, indent=2)
        max_candidate_size = 100_000  # 100KB limit
        if len(candidate_json) > max_candidate_size:
            candidate_json = json.dumps(candidate)  # Compact format
        if len(candidate_json) > max_candidate_size:
            raise AnalysisError(
                f"Candidate JSON exceeds maximum size of {max_candidate_size} bytes"
            )

        self._logger.info(
            "Attempting to repair structured output",
            extra={
                "correlation_id": cid,
                "candidate_size": len(candidate_json),
                "validation_error": validation_error[:200],
            },
        )

        schema_text = json.dumps(structured_schema, indent=2) if structured_schema else "{}"
        prompt = (
            "You must return only valid JSON that matches the schema. "
            "Do not include markdown or extra text. "
            "Fix the validation errors while preserving valid data.\n\n"
            f"Schema:\n{schema_text}\n\n"
            f"Validation error:\n{validation_error}\n\n"
            f"Candidate JSON to repair:\n{candidate_json}\n\n"
            "Return only the corrected JSON."
        )

        start_time = time.time()
        repaired = self._run_with_retries(
            prompt=prompt,
            image_bytes=None,
            correlation_id=cid,
        )
        duration_ms = (time.time() - start_time) * 1000

        self._logger.info(
            "Structured output repair completed",
            extra={
                "correlation_id": cid,
                "duration_ms": round(duration_ms, 2),
            },
        )

        return self._extract_json_object(repaired)

    async def repair_structured_output_async(
        self,
        *,
        candidate: dict[str, Any],
        validation_error: str,
        structured_schema: dict[str, Any] | None,
        correlation_id: str | None = None,
        rate_limit_coro: Callable[[], Awaitable[None]] | None = None,
    ) -> dict[str, Any]:
        """Repair structured output that failed validation asynchronously."""
        cid = correlation_id or str(uuid.uuid4())[:8]

        if not isinstance(candidate, dict):
            raise AnalysisError(f"candidate must be a dict, got {type(candidate).__name__}")

        candidate_json = json.dumps(candidate, indent=2)
        max_candidate_size = 100_000
        if len(candidate_json) > max_candidate_size:
            candidate_json = json.dumps(candidate)
        if len(candidate_json) > max_candidate_size:
            raise AnalysisError(
                f"Candidate JSON exceeds maximum size of {max_candidate_size} bytes"
            )

        schema_text = json.dumps(structured_schema, indent=2) if structured_schema else "{}"
        prompt = (
            "You must return only valid JSON that matches the schema. "
            "Do not include markdown or extra text. "
            "Fix the validation errors while preserving valid data.\n\n"
            f"Schema:\n{schema_text}\n\n"
            f"Validation error:\n{validation_error}\n\n"
            f"Candidate JSON to repair:\n{candidate_json}\n\n"
            "Return only the corrected JSON."
        )

        repaired = await self._run_with_retries_async(
            prompt=prompt,
            image_bytes=None,
            correlation_id=cid,
            rate_limit_coro=rate_limit_coro,
        )
        return self._extract_json_object(repaired)

    def _build_prompt(
        self,
        *,
        mode: ExtractionMode,
        structured_schema: dict[str, Any] | None,
    ) -> str:
        if mode == ExtractionMode.FULL_TEXT:
            return (
                "Transcribe all text visible on this page. Preserve layout hints with line breaks. "
                "Do not summarize."
            )

        if mode == ExtractionMode.SUMMARY:
            return (
                "Summarize this page in 3-5 concise sentences. Include critical numbers, dates, "
                "entities, and actions."
            )

        if mode == ExtractionMode.MARKDOWN:
            return (
                "Convert this page to Markdown format. Use proper Markdown syntax:\n"
                "- Use # for headings, ## for subheadings\n"
                "- Use **bold** for emphasis where appropriate\n"
                "- Use bullet points (-) or numbered lists for items\n"
                "- Use code blocks (```) for any code or technical content\n"
                "- Preserve the document structure and hierarchy\n"
                "- Extract tables as Markdown tables where possible\n"
                "- Include all relevant content, do not summarize or omit details"
            )

        schema_text = ""
        if structured_schema is not None:
            schema_text = f"\nJSON schema to follow:\n{json.dumps(structured_schema, indent=2)}"

        return (
            "Extract structured information from this page and return JSON only. "
            "No markdown, no explanation, no code fences. "
            "Use null for unknown values."
            f"{schema_text}"
        )

    def _generation_params(self) -> GenerationParams:
        return GenerationParams(
            max_completion_tokens=self.config.max_completion_tokens,
            temperature=self.config.temperature,
            top_p=self.config.top_p,
            presence_penalty=self.config.presence_penalty,
            frequency_penalty=self.config.frequency_penalty,
        )

    def _run_with_retries(
        self,
        *,
        prompt: str,
        image_bytes: bytes | None,
        correlation_id: str | None = None,
        page_number: int | None = None,
    ) -> str:
        primary_model = self.config.get_primary_model()
        fallback_model = self.config.get_fallback_model()
        candidate_models: list[str] = [primary_model]
        if fallback_model and fallback_model != primary_model:
            candidate_models.append(fallback_model)

        last_error: Exception | None = None
        cid = correlation_id or str(uuid.uuid4())[:8]

        for model in candidate_models:
            for attempt in range(1, self.config.max_retries + 1):
                try:
                    request = LLMRequest(
                        prompt=prompt,
                        model=model,
                        image_bytes=image_bytes,
                        timeout_seconds=self.config.timeout_seconds,
                        generation=self._generation_params(),
                        metadata={
                            "correlation_id": cid,
                            "page_number": page_number,
                        },
                    )

                    self._logger.debug(
                        f"API call attempt {attempt} with model {model}",
                        extra={
                            "correlation_id": cid,
                            "page_number": page_number,
                            "provider": self.provider.provider_name,
                            "model": model,
                            "attempt": attempt,
                            "has_image": image_bytes is not None,
                        },
                    )

                    response = self.provider.generate(request)

                    self._logger.debug(
                        f"API call successful on attempt {attempt}",
                        extra={
                            "correlation_id": cid,
                            "page_number": page_number,
                            "provider": self.provider.provider_name,
                            "model": model,
                            "attempt": attempt,
                        },
                    )

                    return response.text

                except Exception as exc:
                    last_error = exc
                    # If the provider explicitly says "do not retry", respect it.
                    if isinstance(exc, ProviderError) and exc.retryable is False:
                        break
                    if attempt >= self.config.max_retries:
                        break

                    sleep_seconds = self.config.retry_backoff_seconds * (2 ** (attempt - 1))
                    self._logger.warning(
                        f"API call failed, will retry in {sleep_seconds}s",
                        extra={
                            "correlation_id": cid,
                            "page_number": page_number,
                            "provider": self.provider.provider_name,
                            "model": model,
                            "attempt": attempt,
                            "error": _format_last_error(exc)[:200],
                            "next_retry_delay": sleep_seconds,
                        },
                    )
                    time.sleep(sleep_seconds)

        _log_models_exhausted(
            self._logger,
            async_mode=False,
            candidate_models=candidate_models,
            last_error=last_error,
            extra={
                "correlation_id": cid,
                "page_number": page_number,
                "provider": self.provider.provider_name,
                "attempts": self.config.max_retries,
                "last_error": _format_last_error(last_error)[:200],
            },
        )
        raise AnalysisError(_analysis_failure_message(self.provider.provider_name, last_error))

    async def _run_with_retries_async(
        self,
        *,
        prompt: str,
        image_bytes: bytes | None,
        correlation_id: str | None = None,
        page_number: int | None = None,
        rate_limit_coro: Callable[[], Awaitable[None]] | None = None,
    ) -> str:
        primary_model = self.config.get_primary_model()
        fallback_model = self.config.get_fallback_model()
        candidate_models: list[str] = [primary_model]
        if fallback_model and fallback_model != primary_model:
            candidate_models.append(fallback_model)

        last_error: Exception | None = None
        cid = correlation_id or str(uuid.uuid4())[:8]

        for model in candidate_models:
            for attempt in range(1, self.config.max_retries + 1):
                try:
                    request = LLMRequest(
                        prompt=prompt,
                        model=model,
                        image_bytes=image_bytes,
                        timeout_seconds=self.config.timeout_seconds,
                        generation=self._generation_params(),
                        metadata={
                            "correlation_id": cid,
                            "page_number": page_number,
                        },
                    )

                    if rate_limit_coro is not None:
                        await rate_limit_coro()

                    response = await self.provider.agenerate(request)
                    return response.text

                except Exception as exc:
                    last_error = exc

                    should_retry = attempt < self.config.max_retries
                    if isinstance(exc, ProviderError) and exc.retryable is False:
                        should_retry = False

                    if not should_retry:
                        break

                    sleep_seconds = self.config.retry_backoff_seconds * (2 ** (attempt - 1))
                    self._logger.warning(
                        f"Async API call failed, will retry in {sleep_seconds}s",
                        extra={
                            "correlation_id": cid,
                            "page_number": page_number,
                            "provider": self.provider.provider_name,
                            "model": model,
                            "attempt": attempt,
                            "error": _format_last_error(exc)[:200],
                            "next_retry_delay": sleep_seconds,
                        },
                    )
                    await asyncio.sleep(sleep_seconds)

        _log_models_exhausted(
            self._logger,
            async_mode=True,
            candidate_models=candidate_models,
            last_error=last_error,
            extra={
                "correlation_id": cid,
                "page_number": page_number,
                "provider": self.provider.provider_name,
                "attempts": self.config.max_retries,
                "last_error": _format_last_error(last_error)[:200],
            },
        )
        raise AnalysisError(_analysis_failure_message(self.provider.provider_name, last_error))

    def _extract_json_object(self, text: str) -> dict[str, Any]:
        stripped = text.strip()

        # Strategy 1: Direct JSON parsing
        try:
            return json.loads(stripped)
        except json.JSONDecodeError as exc:
            logger.debug(f"Direct JSON parsing failed: {exc}")

        # Strategy 2: Extract from code fences (```json ... ```)
        if "```" in stripped:
            logger.debug("Attempting to extract JSON from code fences")
            fenced = stripped.split("```")
            for idx, block in enumerate(fenced):
                candidate = block.strip()
                if candidate.startswith("json"):
                    candidate = candidate[4:].strip()
                try:
                    result = json.loads(candidate)
                    logger.debug(f"Successfully parsed JSON from fenced block {idx}")
                    return result
                except json.JSONDecodeError:
                    continue

        # Strategy 3: Extract by finding braces
        start = stripped.find("{")
        end = stripped.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = stripped[start : end + 1]
            logger.debug(f"Attempting to parse braced content: {candidate[:100]}...")
            try:
                return json.loads(candidate)
            except json.JSONDecodeError as exc:
                logger.debug(f"Brace extraction failed: {exc}")

        # All strategies failed - provide detailed error message
        preview = stripped[:200] + "..." if len(stripped) > 200 else stripped
        raise AnalysisError(
            f"Model did not return valid JSON for structured extraction. "
            f"Attempted 3 strategies (direct, fenced blocks, brace extraction). "
            f"Text preview: {preview!r}"
        )


class ReplicateVisionAnalyzer(VisionAnalyzer):
    """Deprecated compatibility wrapper for the old analyzer name."""

    def __init__(self, config: ExtractorConfig, provider: LLMProviderPort | None = None):
        warnings.warn(
            "ReplicateVisionAnalyzer is deprecated; use VisionAnalyzer instead",
            DeprecationWarning,
            stacklevel=2,
        )
        super().__init__(config, provider=provider)

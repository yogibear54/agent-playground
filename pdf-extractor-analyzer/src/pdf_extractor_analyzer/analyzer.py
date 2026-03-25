from __future__ import annotations

import base64
import json
import logging
import time
import uuid
from typing import Any

import replicate

from .config import ExtractorConfig
from .exceptions import AnalysisError, ValidationError
from .schemas import ExtractionMode

# Module-level logger
logger = logging.getLogger(__name__)


class ReplicateVisionAnalyzer:
    def __init__(self, config: ExtractorConfig):
        self.config = config
        if config.replicate_api_token:
            self.client = replicate.Client(api_token=config.replicate_api_token)
        else:
            self.client = replicate.Client()
        
        # Setup logger with configured level
        self._logger = logging.getLogger(f"{__name__}.ReplicateVisionAnalyzer")
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
        """Analyze a single page image.
        
        Args:
            image_bytes: The image data to analyze
            mode: The extraction mode to use
            structured_schema: Optional schema for structured extraction
            correlation_id: Optional ID for tracking related operations
            page_number: Optional page number for logging context
            
        Returns:
            Extracted content as string or dict
        """
        self._validate_image_bytes(image_bytes)
        
        # Generate correlation ID if not provided
        cid = correlation_id or str(uuid.uuid4())[:8]
        extra = {
            "correlation_id": cid,
            "page_number": page_number,
            "mode": mode.value,
            "model": self.config.model,
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
            
        except AnalysisError:
            duration_ms = (time.time() - start_time) * 1000
            self._logger.error(
                "Page analysis failed after all retries",
                extra={**extra, "duration_ms": round(duration_ms, 2)},
                exc_info=True,
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
        """Repair structured output that failed validation.
        
        Args:
            candidate: The invalid output to repair
            validation_error: The validation error message
            structured_schema: The expected schema
            correlation_id: Optional ID for tracking
            
        Returns:
            Repaired valid JSON dict
        """
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
                "validation_error": validation_error[:200],  # Truncate for log
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

        schema_text = ""
        if structured_schema is not None:
            schema_text = f"\nJSON schema to follow:\n{json.dumps(structured_schema, indent=2)}"

        return (
            "Extract structured information from this page and return JSON only. "
            "No markdown, no explanation, no code fences. "
            "Use null for unknown values."
            f"{schema_text}"
        )

    def _run_with_retries(
        self, 
        *, 
        prompt: str, 
        image_bytes: bytes | None,
        correlation_id: str | None = None,
        page_number: int | None = None,
    ) -> str:
        candidate_models: list[str] = [self.config.model]
        if self.config.fallback_model and self.config.fallback_model != self.config.model:
            candidate_models.append(self.config.fallback_model)

        last_error: Exception | None = None
        cid = correlation_id or str(uuid.uuid4())[:8]

        for model in candidate_models:
            for attempt in range(1, self.config.max_retries + 1):
                try:
                    input_payload = self._build_input_payload(prompt=prompt, image_bytes=image_bytes)
                    
                    self._logger.debug(
                        f"API call attempt {attempt} with model {model}",
                        extra={
                            "correlation_id": cid,
                            "page_number": page_number,
                            "model": model,
                            "attempt": attempt,
                            "has_image": image_bytes is not None,
                        },
                    )
                    
                    try:
                        output = self.client.run(
                            model,
                            input=input_payload,
                            wait=self.config.timeout_seconds,
                        )
                    except TypeError:
                        output = self.client.run(model, input=input_payload)
                    
                    self._logger.debug(
                        f"API call successful on attempt {attempt}",
                        extra={
                            "correlation_id": cid,
                            "page_number": page_number,
                            "model": model,
                            "attempt": attempt,
                        },
                    )
                    
                    return self._normalize_output(output)
                    
                except Exception as exc:
                    last_error = exc
                    if attempt >= self.config.max_retries:
                        break
                    
                    sleep_seconds = self.config.retry_backoff_seconds * (2 ** (attempt - 1))
                    self._logger.warning(
                        f"API call failed, will retry in {sleep_seconds}s",
                        extra={
                            "correlation_id": cid,
                            "page_number": page_number,
                            "model": model,
                            "attempt": attempt,
                            "error": str(exc)[:200],
                            "next_retry_delay": sleep_seconds,
                        },
                    )
                    time.sleep(sleep_seconds)

        self._logger.error(
            f"All {len(candidate_models)} models failed after retries",
            extra={
                "correlation_id": cid,
                "page_number": page_number,
                "attempts": self.config.max_retries,
                "last_error": str(last_error)[:200],
            },
        )
        raise AnalysisError(f"Replicate analysis failed: {last_error}")

    def _build_input_payload(self, *, prompt: str, image_bytes: bytes | None) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "prompt": prompt,
            "max_completion_tokens": 4096,
            "temperature": 0.0,
            "top_p": 1.0,
            "presence_penalty": 0,
            "frequency_penalty": 0,
        }

        if image_bytes is not None:
            payload["image_input"] = [self._bytes_to_data_url(image_bytes)]

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

    def _extract_json_object(self, text: str) -> dict[str, Any]:
        stripped = text.strip()
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            pass

        if "```" in stripped:
            fenced = stripped.split("```")
            for block in fenced:
                candidate = block.strip()
                if candidate.startswith("json"):
                    candidate = candidate[4:].strip()
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    continue

        start = stripped.find("{")
        end = stripped.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = stripped[start : end + 1]
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass

        raise AnalysisError("Model did not return valid JSON for structured extraction")

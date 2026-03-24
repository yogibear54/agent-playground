from __future__ import annotations

import base64
import json
import time
from typing import Any

import replicate

from .config import ExtractorConfig
from .exceptions import AnalysisError
from .schemas import ExtractionMode


class ReplicateVisionAnalyzer:
    def __init__(self, config: ExtractorConfig):
        self.config = config
        if config.replicate_api_token:
            self.client = replicate.Client(api_token=config.replicate_api_token)
        else:
            self.client = replicate.Client()

    def analyze_page(
        self,
        *,
        image_bytes: bytes,
        mode: ExtractionMode,
        structured_schema: dict[str, Any] | None = None,
    ) -> str | dict[str, Any]:
        prompt = self._build_prompt(mode=mode, structured_schema=structured_schema)
        raw = self._run_with_retries(prompt=prompt, image_bytes=image_bytes)

        if mode == ExtractionMode.STRUCTURED:
            return self._extract_json_object(raw)
        return raw.strip()

    def repair_structured_output(
        self,
        *,
        candidate: dict[str, Any],
        validation_error: str,
        structured_schema: dict[str, Any] | None,
    ) -> dict[str, Any]:
        schema_text = json.dumps(structured_schema, indent=2) if structured_schema else "{}"
        prompt = (
            "You must return only valid JSON that matches the schema. "
            "Do not include markdown or extra text.\n\n"
            f"Schema:\n{schema_text}\n\n"
            f"Validation error:\n{validation_error}\n\n"
            f"Candidate JSON:\n{json.dumps(candidate, indent=2)}"
        )
        repaired = self._run_with_retries(prompt=prompt, image_bytes=None)
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

    def _run_with_retries(self, *, prompt: str, image_bytes: bytes | None) -> str:
        candidate_models: list[str] = [self.config.model]
        if self.config.fallback_model and self.config.fallback_model != self.config.model:
            candidate_models.append(self.config.fallback_model)

        last_error: Exception | None = None

        for model in candidate_models:
            for attempt in range(1, self.config.max_retries + 1):
                try:
                    input_payload = self._build_input_payload(prompt=prompt, image_bytes=image_bytes)
                    try:
                        output = self.client.run(
                            model,
                            input=input_payload,
                            wait=self.config.timeout_seconds,
                        )
                    except TypeError:
                        output = self.client.run(model, input=input_payload)
                    return self._normalize_output(output)
                except Exception as exc:
                    last_error = exc
                    if attempt >= self.config.max_retries:
                        break
                    sleep_seconds = self.config.retry_backoff_seconds * (2 ** (attempt - 1))
                    time.sleep(sleep_seconds)

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

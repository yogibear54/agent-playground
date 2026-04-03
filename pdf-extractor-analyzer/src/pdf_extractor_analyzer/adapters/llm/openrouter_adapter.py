from __future__ import annotations

import asyncio
import base64
import json
from typing import Any, Callable
from urllib import error as urlerror
from urllib import request as urlrequest

from ...config import ExtractorConfig
from ...ports.llm_provider import (
    LLMProviderPort,
    LLMRequest,
    LLMResponse,
    ProviderError,
    ProviderErrorCode,
)

JsonPost = Callable[[str, dict[str, Any], dict[str, str], int], dict[str, Any]]


class OpenRouterLLMAdapter(LLMProviderPort):
    """OpenRouter implementation of the LLM provider port."""

    def __init__(self, config: ExtractorConfig, *, post_json: JsonPost | None = None):
        self.config = config
        self._post_json = post_json or self._default_post_json

    @property
    def provider_name(self) -> str:
        return "openrouter"

    def generate(self, request: LLMRequest) -> LLMResponse:
        api_key = self.config.get_openrouter_api_key()
        if not api_key:
            raise ProviderError(
                "OpenRouter API key is required",
                provider=self.provider_name,
                code=ProviderErrorCode.AUTHENTICATION,
                model=request.model,
                retryable=False,
            )

        timeout_seconds = request.timeout_seconds or self.config.timeout_seconds
        url = f"{self.config.openrouter.base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = self._build_payload(request)

        try:
            raw = self._post_json(url, payload, headers, timeout_seconds)
            text = self._extract_text(raw)
            return LLMResponse(
                text=text,
                provider=self.provider_name,
                model=request.model,
                raw_output=raw,
            )
        except ProviderError:
            raise
        except Exception as exc:
            raise self._to_provider_error(exc, model=request.model) from exc

    async def agenerate(self, request: LLMRequest) -> LLMResponse:
        return await asyncio.to_thread(self.generate, request)

    def _build_payload(self, request: LLMRequest) -> dict[str, Any]:
        content: list[dict[str, Any]] = [{"type": "text", "text": request.prompt}]
        if request.image_bytes is not None:
            content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": self._bytes_to_data_url(request.image_bytes)},
                }
            )

        return {
            "model": request.model,
            "messages": [{"role": "user", "content": content}],
            "max_tokens": request.generation.max_completion_tokens,
            "temperature": request.generation.temperature,
            "top_p": request.generation.top_p,
            "presence_penalty": request.generation.presence_penalty,
            "frequency_penalty": request.generation.frequency_penalty,
        }

    @staticmethod
    def _default_post_json(
        url: str,
        payload: dict[str, Any],
        headers: dict[str, str],
        timeout_seconds: int,
    ) -> dict[str, Any]:
        req = urlrequest.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        with urlrequest.urlopen(req, timeout=timeout_seconds) as response:
            body = response.read().decode("utf-8")
            return json.loads(body)

    @staticmethod
    def _bytes_to_data_url(image_bytes: bytes, mime_type: str = "image/png") -> str:
        encoded = base64.b64encode(image_bytes).decode("ascii")
        return f"data:{mime_type};base64,{encoded}"

    @staticmethod
    def _extract_text(raw: dict[str, Any]) -> str:
        choices = raw.get("choices", [])
        if not choices:
            return ""

        message = choices[0].get("message", {})
        content = message.get("content", "")

        if isinstance(content, str):
            return content
        if isinstance(content, list):
            chunks: list[str] = []
            for part in content:
                if isinstance(part, dict):
                    if part.get("type") == "text" and "text" in part:
                        chunks.append(str(part["text"]))
                    elif "content" in part:
                        chunks.append(str(part["content"]))
                else:
                    chunks.append(str(part))
            return "".join(chunks)

        return str(content)

    def _to_provider_error(self, exc: Exception, *, model: str) -> ProviderError:
        if isinstance(exc, urlerror.HTTPError):
            status = exc.code
            reason_phrase = exc.reason if exc.reason else f"HTTP {status}"
            body_full = ""
            try:
                if exc.fp is not None:
                    body_full = exc.fp.read().decode("utf-8", errors="replace")
            except OSError:
                body_full = ""

            api_detail = ""
            if body_full:
                try:
                    parsed = json.loads(body_full)
                    err_obj = parsed.get("error")
                    if isinstance(err_obj, dict):
                        raw_msg = err_obj.get("message")
                        if isinstance(raw_msg, str) and raw_msg.strip():
                            api_detail = raw_msg.strip()
                except json.JSONDecodeError:
                    pass

            message = api_detail or reason_phrase

            if status == 401:
                code = ProviderErrorCode.AUTHENTICATION
                retryable = False
            elif status == 403:
                # OpenRouter uses HTTP 403 for model access/availability issues (e.g.
                # model not available in region); these are not expected to succeed
                # with retries.
                code = ProviderErrorCode.INVALID_REQUEST
                retryable = False
            elif status == 429:
                code = ProviderErrorCode.RATE_LIMIT
                retryable = True
            elif status in (400, 404, 422):
                code = ProviderErrorCode.INVALID_REQUEST
                retryable = False
            elif status in (502, 503, 504):
                code = ProviderErrorCode.SERVICE_UNAVAILABLE
                retryable = True
            else:
                code = ProviderErrorCode.UNKNOWN
                retryable = None

            return ProviderError(
                str(message),
                provider=self.provider_name,
                code=code,
                model=model,
                retryable=retryable,
                cause=exc,
            )

        message = str(exc).strip() or type(exc).__name__
        lower = message.lower()
        if "timeout" in lower:
            code = ProviderErrorCode.TIMEOUT
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

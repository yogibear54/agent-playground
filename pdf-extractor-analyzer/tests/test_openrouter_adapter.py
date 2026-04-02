from __future__ import annotations

import asyncio
from urllib.error import HTTPError

import pytest

from pdf_extractor_analyzer.adapters.llm.openrouter_adapter import OpenRouterLLMAdapter
from pdf_extractor_analyzer.config import ExtractorConfig, OpenRouterProviderConfig
from pdf_extractor_analyzer.ports.llm_provider import (
    GenerationParams,
    LLMRequest,
    ProviderError,
    ProviderErrorCode,
)


def _cfg(api_key: str | None = "key") -> ExtractorConfig:
    return ExtractorConfig(
        provider="openrouter",
        openrouter=OpenRouterProviderConfig(api_key=api_key, base_url="https://openrouter.ai/api/v1"),
        timeout_seconds=12,
    )


def test_generate_builds_text_payload_and_returns_content():
    captured = {}

    def fake_post(url, payload, headers, timeout):
        captured.update({"url": url, "payload": payload, "headers": headers, "timeout": timeout})
        return {"choices": [{"message": {"content": "hello"}}]}

    adapter = OpenRouterLLMAdapter(_cfg(), post_json=fake_post)
    req = LLMRequest(
        prompt="extract",
        model="openrouter/auto",
        generation=GenerationParams(max_completion_tokens=1000, temperature=0.4, top_p=0.9),
    )

    resp = adapter.generate(req)

    assert resp.text == "hello"
    assert resp.provider == "openrouter"
    assert captured["url"].endswith("/chat/completions")
    assert captured["headers"]["Authorization"].startswith("Bearer ")
    assert captured["timeout"] == 12
    assert captured["payload"]["messages"][0]["content"][0]["text"] == "extract"


def test_generate_includes_image_data_url_when_image_present():
    captured = {}

    def fake_post(url, payload, headers, timeout):
        captured["payload"] = payload
        return {"choices": [{"message": {"content": "ok"}}]}

    adapter = OpenRouterLLMAdapter(_cfg(), post_json=fake_post)
    req = LLMRequest(prompt="see", model="openrouter/auto", image_bytes=b"img")
    adapter.generate(req)

    parts = captured["payload"]["messages"][0]["content"]
    assert parts[1]["type"] == "image_url"
    assert parts[1]["image_url"]["url"].startswith("data:image/png;base64,")


def test_generate_parses_list_content_response():
    def fake_post(url, payload, headers, timeout):
        return {
            "choices": [
                {
                    "message": {
                        "content": [
                            {"type": "text", "text": "one"},
                            {"type": "text", "text": " two"},
                        ]
                    }
                }
            ]
        }

    adapter = OpenRouterLLMAdapter(_cfg(), post_json=fake_post)
    resp = adapter.generate(LLMRequest(prompt="x", model="openrouter/auto"))
    assert resp.text == "one two"


def test_generate_without_api_key_raises_authentication_error(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    adapter = OpenRouterLLMAdapter(_cfg(api_key=None), post_json=lambda *_: {})

    with pytest.raises(ProviderError) as exc:
        adapter.generate(LLMRequest(prompt="x", model="openrouter/auto"))

    assert exc.value.code == ProviderErrorCode.AUTHENTICATION


def test_generate_maps_http_429_to_rate_limit_error():
    def fake_post(url, payload, headers, timeout):
        raise HTTPError(url=url, code=429, msg="rate limit", hdrs=None, fp=None)

    adapter = OpenRouterLLMAdapter(_cfg(), post_json=fake_post)

    with pytest.raises(ProviderError) as exc:
        adapter.generate(LLMRequest(prompt="x", model="openrouter/auto"))

    assert exc.value.code == ProviderErrorCode.RATE_LIMIT
    assert exc.value.retryable is True


def test_agenerate_uses_sync_generate_via_thread():
    calls = {"count": 0}

    def fake_post(url, payload, headers, timeout):
        calls["count"] += 1
        return {"choices": [{"message": {"content": "async-ok"}}]}

    adapter = OpenRouterLLMAdapter(_cfg(), post_json=fake_post)
    resp = asyncio.run(adapter.agenerate(LLMRequest(prompt="x", model="openrouter/auto")))
    assert resp.text == "async-ok"
    assert calls["count"] == 1

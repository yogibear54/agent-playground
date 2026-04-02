import asyncio

from pdf_extractor_analyzer.adapters.llm.replicate_adapter import ReplicateLLMAdapter
from pdf_extractor_analyzer.config import ExtractorConfig
from pdf_extractor_analyzer.ports.llm_provider import (
    GenerationParams,
    LLMRequest,
    ProviderError,
    ProviderErrorCode,
)


class FakeSyncClient:
    def __init__(self, outputs):
        self.outputs = list(outputs)
        self.calls = []

    def run(self, model, input, wait=None):
        self.calls.append({"model": model, "input": input, "wait": wait})
        item = self.outputs.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


class FakeAsyncClient:
    def __init__(self, outputs):
        self.outputs = list(outputs)
        self.calls = []

    async def run(self, model, input, wait=None):
        self.calls.append({"model": model, "input": input, "wait": wait})
        await asyncio.sleep(0)
        item = self.outputs.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


def _make_adapter(sync_outputs, async_outputs=None, config=None):
    cfg = config or ExtractorConfig(timeout_seconds=42, max_concurrent_replicate_calls=1)
    sync_client = FakeSyncClient(sync_outputs)
    async_client = FakeAsyncClient(async_outputs) if async_outputs is not None else None
    adapter = ReplicateLLMAdapter(cfg, client=sync_client, async_client=async_client)
    return adapter, sync_client, async_client


def test_generate_builds_payload_and_returns_normalized_response():
    adapter, sync_client, _ = _make_adapter(["ok"])

    req = LLMRequest(
        prompt="extract",
        model="openai/gpt-4o",
        image_bytes=b"img",
        timeout_seconds=15,
        generation=GenerationParams(
            max_completion_tokens=1000,
            temperature=0.5,
            top_p=0.8,
            presence_penalty=0.1,
            frequency_penalty=0.2,
        ),
    )

    response = adapter.generate(req)

    assert response.text == "ok"
    assert response.provider == "replicate"
    assert response.model == "openai/gpt-4o"

    call = sync_client.calls[0]
    assert call["model"] == "openai/gpt-4o"
    assert call["wait"] == 15
    assert call["input"]["prompt"] == "extract"
    assert call["input"]["max_completion_tokens"] == 1000
    assert call["input"]["temperature"] == 0.5
    assert call["input"]["top_p"] == 0.8
    assert call["input"]["presence_penalty"] == 0.1
    assert call["input"]["frequency_penalty"] == 0.2
    assert "image_input" in call["input"]
    assert call["input"]["image_input"][0].startswith("data:image/png;base64,")


def test_generate_falls_back_when_wait_not_supported():
    # First run fails due to wait kwarg, second run succeeds without wait.
    adapter, sync_client, _ = _make_adapter(
        [TypeError("run() got an unexpected keyword argument 'wait'"), "ok"]
    )

    req = LLMRequest(prompt="extract", model="openai/gpt-4o-mini")
    response = adapter.generate(req)

    assert response.text == "ok"
    assert len(sync_client.calls) == 2
    assert sync_client.calls[0]["wait"] == 42
    assert sync_client.calls[1]["wait"] is None


def test_agenerate_uses_async_client_when_available():
    adapter, _, async_client = _make_adapter(["unused-sync"], async_outputs=["async-ok"])
    assert async_client is not None

    req = LLMRequest(prompt="hello", model="openai/gpt-4o")
    response = asyncio.run(adapter.agenerate(req))

    assert response.text == "async-ok"
    assert len(async_client.calls) == 1
    assert async_client.calls[0]["wait"] == 42


def test_agenerate_falls_back_to_sync_client_in_thread_when_no_async_client():
    adapter, sync_client, _ = _make_adapter(["sync-ok"], async_outputs=None)

    req = LLMRequest(prompt="hello", model="openai/gpt-4o")
    response = asyncio.run(adapter.agenerate(req))

    assert response.text == "sync-ok"
    assert len(sync_client.calls) == 1
    assert sync_client.calls[0]["wait"] == 42


def test_generate_raises_normalized_provider_error():
    adapter, _, _ = _make_adapter([RuntimeError("429 rate limit exceeded")])

    req = LLMRequest(prompt="extract", model="openai/gpt-4o")

    try:
        adapter.generate(req)
        assert False, "Expected ProviderError"
    except ProviderError as exc:
        assert exc.provider == "replicate"
        assert exc.code == ProviderErrorCode.RATE_LIMIT
        assert exc.model == "openai/gpt-4o"
        assert exc.retryable is True

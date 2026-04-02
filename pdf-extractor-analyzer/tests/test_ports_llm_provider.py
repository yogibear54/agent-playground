import asyncio

from pdf_extractor_analyzer.ports.llm_provider import (
    GenerationParams,
    LLMProviderPort,
    LLMRequest,
    LLMResponse,
    ProviderError,
    ProviderErrorCode,
)


class FakeProvider:
    @property
    def provider_name(self) -> str:
        return "fake"

    def generate(self, request: LLMRequest) -> LLMResponse:
        return LLMResponse(
            text=f"sync:{request.prompt}",
            provider=self.provider_name,
            model=request.model,
            raw_output={"ok": True},
        )

    async def agenerate(self, request: LLMRequest) -> LLMResponse:
        await asyncio.sleep(0)
        return LLMResponse(
            text=f"async:{request.prompt}",
            provider=self.provider_name,
            model=request.model,
            raw_output={"ok": True},
        )


def test_llm_request_defaults():
    req = LLMRequest(prompt="Extract", model="openai/gpt-4o")

    assert req.prompt == "Extract"
    assert req.model == "openai/gpt-4o"
    assert req.image_bytes is None
    assert req.timeout_seconds is None
    assert isinstance(req.generation, GenerationParams)
    assert req.generation.max_completion_tokens == 4096


def test_provider_error_fields_are_normalized():
    cause = RuntimeError("boom")
    err = ProviderError(
        "failed",
        provider="replicate",
        code=ProviderErrorCode.TIMEOUT,
        model="openai/gpt-4o",
        retryable=True,
        cause=cause,
    )

    assert str(err) == "failed"
    assert err.provider == "replicate"
    assert err.code == ProviderErrorCode.TIMEOUT
    assert err.model == "openai/gpt-4o"
    assert err.retryable is True
    assert err.cause is cause


def test_fake_provider_conforms_to_port_sync_and_async():
    provider = FakeProvider()
    assert isinstance(provider, LLMProviderPort)

    req = LLMRequest(prompt="hello", model="test-model")
    sync_response = provider.generate(req)
    async_response = asyncio.run(provider.agenerate(req))

    assert sync_response.text == "sync:hello"
    assert sync_response.provider == "fake"
    assert sync_response.model == "test-model"

    assert async_response.text == "async:hello"
    assert async_response.provider == "fake"
    assert async_response.model == "test-model"

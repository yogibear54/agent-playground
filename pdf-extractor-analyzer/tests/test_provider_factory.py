from dataclasses import dataclass

import pytest

from pdf_extractor_analyzer.config import ExtractorConfig
from pdf_extractor_analyzer.ports.llm_provider import LLMResponse
from pdf_extractor_analyzer.provider_factory import (
    create_llm_provider,
    register_provider_builder,
)


@dataclass
class DummyProvider:
    config: ExtractorConfig

    @property
    def provider_name(self) -> str:
        return "dummy"

    def generate(self, request):
        return LLMResponse(text="ok", provider="dummy", model=request.model)

    async def agenerate(self, request):
        return LLMResponse(text="ok", provider="dummy", model=request.model)


def test_create_llm_provider_defaults_to_replicate():
    provider = create_llm_provider(ExtractorConfig())
    assert provider.provider_name == "replicate"


def test_register_provider_builder_and_create_custom_provider():
    register_provider_builder("dummy", lambda config: DummyProvider(config))

    class Cfg:
        provider = "dummy"

    provider = create_llm_provider(Cfg())  # type: ignore[arg-type]
    assert provider.provider_name == "dummy"


def test_create_llm_provider_unknown_provider_raises():
    class Cfg:
        provider = "unknown-provider"

    with pytest.raises(ValueError, match="Unsupported provider"):
        create_llm_provider(Cfg())  # type: ignore[arg-type]

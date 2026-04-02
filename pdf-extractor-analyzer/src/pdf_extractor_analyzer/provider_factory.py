from __future__ import annotations

from typing import Callable

from .config import ExtractorConfig
from .ports.llm_provider import LLMProviderPort

ProviderBuilder = Callable[[ExtractorConfig], LLMProviderPort]


def _build_replicate_provider(config: ExtractorConfig) -> LLMProviderPort:
    from .adapters.llm import ReplicateLLMAdapter

    return ReplicateLLMAdapter(config)


def _build_openrouter_provider(config: ExtractorConfig) -> LLMProviderPort:
    from .adapters.llm import OpenRouterLLMAdapter

    return OpenRouterLLMAdapter(config)


_PROVIDER_BUILDERS: dict[str, ProviderBuilder] = {
    "replicate": _build_replicate_provider,
    "openrouter": _build_openrouter_provider,
}


def register_provider_builder(name: str, builder: ProviderBuilder) -> None:
    key = name.strip().lower()
    if not key:
        raise ValueError("Provider name cannot be empty")
    _PROVIDER_BUILDERS[key] = builder


def create_llm_provider(config: ExtractorConfig) -> LLMProviderPort:
    provider_name = getattr(config, "provider", "replicate")
    key = str(provider_name).strip().lower()

    builder = _PROVIDER_BUILDERS.get(key)
    if builder is None:
        available = ", ".join(sorted(_PROVIDER_BUILDERS.keys())) or "<none>"
        raise ValueError(f"Unsupported provider '{provider_name}'. Available providers: {available}")

    return builder(config)

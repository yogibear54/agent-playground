import os

import pytest

from pdf_extractor_analyzer.config import ExtractorConfig, OpenRouterProviderConfig, ReplicateProviderConfig


def test_default_provider_is_replicate():
    config = ExtractorConfig()
    config.validate()
    assert config.provider == "replicate"


def test_provider_validation_rejects_unknown_provider():
    config = ExtractorConfig(provider="unknown")
    with pytest.raises(ValueError, match="provider must be one of"):
        config.validate()


def test_openrouter_requires_api_key_from_config_or_env(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    config = ExtractorConfig(provider="openrouter")
    with pytest.raises(ValueError, match="OpenRouter provider requires API key"):
        config.validate()

    monkeypatch.setenv("OPENROUTER_API_KEY", "env-key")
    config = ExtractorConfig(provider="openrouter")
    config.validate()  # env fallback accepted


def test_openrouter_api_key_prefers_config_over_env(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "env-key")
    config = ExtractorConfig(
        provider="openrouter",
        openrouter=OpenRouterProviderConfig(api_key="config-key"),
    )
    assert config.get_openrouter_api_key() == "config-key"


def test_replicate_legacy_token_syncs_to_grouped_config():
    config = ExtractorConfig(replicate_api_token="legacy-token")
    assert config.replicate.api_token == "legacy-token"
    assert config.get_replicate_api_token() == "legacy-token"


def test_replicate_grouped_token_syncs_to_legacy_field():
    config = ExtractorConfig(replicate=ReplicateProviderConfig(api_token="group-token"))
    assert config.replicate_api_token == "group-token"
    assert config.get_replicate_api_token() == "group-token"


def test_replicate_legacy_concurrency_syncs_to_grouped_config():
    config = ExtractorConfig(max_concurrent_replicate_calls=3)
    assert config.replicate.max_concurrent_calls == 3
    assert config.get_replicate_max_concurrent_calls() == 3


def test_replicate_grouped_concurrency_syncs_to_legacy_field():
    config = ExtractorConfig(replicate=ReplicateProviderConfig(max_concurrent_calls=5))
    assert config.max_concurrent_replicate_calls == 5
    assert config.get_replicate_max_concurrent_calls() == 5


def test_replicate_api_token_uses_env_fallback(monkeypatch):
    monkeypatch.setenv("REPLICATE_API_TOKEN", "env-replicate-token")
    config = ExtractorConfig(replicate_api_token=None)
    assert config.get_replicate_api_token() == "env-replicate-token"


def test_openrouter_config_validation_with_explicit_api_key():
    config = ExtractorConfig(
        provider="openrouter",
        openrouter=OpenRouterProviderConfig(api_key="abc123"),
    )
    config.validate()


def test_model_resolution_defaults_are_provider_specific():
    replicate_cfg = ExtractorConfig(provider="replicate")
    assert replicate_cfg.get_primary_model() == "openai/gpt-4o"
    assert replicate_cfg.get_fallback_model() == "openai/gpt-4o-mini"

    openrouter_cfg = ExtractorConfig(
        provider="openrouter",
        openrouter=OpenRouterProviderConfig(api_key="abc123"),
    )
    assert openrouter_cfg.get_primary_model() == "openrouter/auto"
    assert openrouter_cfg.get_fallback_model() is None


def test_model_resolution_prefers_provider_specific_config():
    config = ExtractorConfig(
        provider="openrouter",
        model="legacy/model",
        fallback_model="legacy/fallback",
        openrouter=OpenRouterProviderConfig(
            api_key="abc123",
            model="openrouter/custom",
            fallback_model="openrouter/fallback",
        ),
    )
    assert config.get_primary_model() == "openrouter/custom"
    assert config.get_fallback_model() == "openrouter/fallback"

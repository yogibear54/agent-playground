# Provider Adapters Guide

This project uses a port-and-adapters architecture for LLM providers.

## Core Contract

Implement `LLMProviderPort` from:

- `src/pdf_extractor_analyzer/ports/llm_provider.py`

You must implement:

- `provider_name` property
- `generate(request: LLMRequest) -> LLMResponse`
- `agenerate(request: LLMRequest) -> LLMResponse`

## Required Request/Response Semantics

`LLMRequest` includes:
- `prompt`
- `model`
- `image_bytes` (optional)
- `timeout_seconds`
- `generation` parameters
- `metadata`

`LLMResponse` should return normalized text in `text`.

## Error Handling

Map provider-specific failures to `ProviderError` with an appropriate `ProviderErrorCode`.
This keeps retry and logging behavior uniform in the analyzer layer.

## Registering a Provider

Register a builder in `src/pdf_extractor_analyzer/provider_factory.py` using either:

- static `_PROVIDER_BUILDERS` mapping
- `register_provider_builder(name, builder)`

## Tests Checklist for New Providers

1. Adapter unit tests (payload mapping, sync/async behavior, error mapping)
2. Analyzer tests should continue to mock `LLMProviderPort`
3. Optional live integration test with a dedicated pytest marker (e.g. `live_openrouter`)
4. CLI/config tests for provider-specific flags and auth wiring

# Changelog

## Unreleased

### Added
- Provider port contract (`LLMProviderPort`) with normalized request/response/error models.
- Replicate adapter (`ReplicateLLMAdapter`) behind provider abstraction.
- Provider factory/registry for adapter composition.
- Provider-aware CLI options (`--provider`, provider-specific auth/config flags).
- Provider-aware cache invalidation params and result metadata.
- Developer guide for provider adapters (`docs/providers.md`).

### Changed
- Analyzer refactored to provider-agnostic `VisionAnalyzer` service.
- `PDFExtractor` now composes analyzer + provider via factory.
- Packaging moved provider SDKs to optional extras (`[replicate]`, `[openrouter]`).
- README updated for provider architecture, installation extras, and usage.

### Deprecated
- `ReplicateVisionAnalyzer` (use `VisionAnalyzer`).
- `ExtractorConfig.replicate_api_token` (use `ExtractorConfig.replicate.api_token`).
- `ExtractorConfig.max_concurrent_replicate_calls` (use `ExtractorConfig.replicate.max_concurrent_calls`).
- CLI flag `--max-concurrent-replicate-calls` (use `--replicate-max-concurrent-calls`).

### Migration Notes
- Existing Replicate Python and CLI usage remains supported (strict backward compatibility).
- For new integrations, use grouped provider config:
  - `replicate=ReplicateProviderConfig(...)`
  - `openrouter=OpenRouterProviderConfig(...)`

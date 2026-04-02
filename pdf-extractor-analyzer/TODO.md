# TODO: Refactor LLM Integration to Port-and-Adapters Architecture

## Goal
Decouple PDF extraction/analyzer logic from Replicate so additional LLM providers can be added without changing core pipeline logic.

## Confirmed Decisions
- First non-Replicate provider: **OpenRouter**
- Fallback policy: **same provider only**
- Backward compatibility: **strict compatibility required** (existing Python/CLI usage must continue working)
- Provider dependencies: **optional extras** (not all providers required in base install)
- Cache invalidation: **include generation params** (temperature/top_p/penalties/tokens) along with provider+model

---

## Research Findings (Current State)

### Where Replicate is hard-wired
- `src/pdf_extractor_analyzer/pipeline.py`
  - Imports and instantiates `ReplicateVisionAnalyzer` directly (`:14`, `:55`)
- `src/pdf_extractor_analyzer/analyzer.py`
  - Imports `replicate` SDK at module level
  - Class is Replicate-specific (`ReplicateVisionAnalyzer`)
  - Builds `replicate.Client` / `AsyncReplicate` (`:33`, `:35`, `:56`)
  - Calls `client.run(...)` / `async_client.run(...)` directly (`:404`, `:411`, `:516`, `:522`, `:530`, `:536`)
  - Error text is Replicate-branded (`"Replicate analysis failed"`)
- `src/pdf_extractor_analyzer/config.py`
  - Replicate-specific config fields:
    - `replicate_api_token` (`:25`)
    - `max_concurrent_replicate_calls` (`:35`)
- `src/pdf_extractor_analyzer/cli.py`
  - No provider selection
  - `--model` help text references Replicate (`:39`)
  - `--max-concurrent-replicate-calls` is Replicate-specific (`:66`)
- `pyproject.toml`
  - `replicate` is a mandatory dependency
- Tests/docs
  - Live integration test is Replicate-specific (`tests/integration/test_live_replicate.py`)
  - README is Replicate-centric

### Where LLM calls happen in the pipeline
1. **Per-page extraction (sync)**
   - `PDFExtractor.extract()` → `analyzer.analyze_page(...)` (`pipeline.py:326`)
2. **Per-page extraction (async)**
   - `PDFExtractor.extract_async()` / `extract_streaming()` → `analyzer.analyze_page_async(...)` (`:437`, `:546`)
3. **Structured-output repair pass**
   - During aggregation when schema validation fails:
     - sync: `repair_structured_output(...)` (`:652`)
     - async: `repair_structured_output_async(...)` (`:698`)

### Additional coupling concerns to address during refactor
- Cache invalidation keys currently include `mode`, `model`, `max_pages`, optional `schema` (`pipeline.py:247-259`) but **not provider identity**.
- Result metadata stores only `model`, not provider (`pipeline.py:348`, `:486`, etc.).
- Model parameter payload is currently shaped for Replicate-hosted OpenAI-style inputs (`image_input`, penalties, etc.) in `analyzer.py:541-552`.

---

## Implementation TODOs

## Phase 0 — Clarify product decisions (blocking)
- [x] Confirm initial provider list to support after Replicate: **OpenRouter**.
- [x] Confirm fallback policy: **same provider only**.
- [x] Confirm backward-compatibility requirement for existing API/CLI config fields: **strict compatibility**.
- [x] Confirm provider authentication strategy for OpenRouter: **both**, with config overriding env vars.

## Phase 1 — Define ports (core contracts)
- [x] Create provider port interface(s), e.g. `src/pdf_extractor_analyzer/ports/llm_provider.py`.
- [x] Define provider-agnostic request/response models for vision inference:
  - [x] prompt
  - [x] optional image bytes
  - [x] model identifier
  - [x] inference params (temperature, top_p, token limits, etc.)
  - [x] timeout
- [x] Define sync + async contract methods.
- [x] Define normalized error contract for provider failures.

## Phase 2 — Move Replicate logic into an adapter
- [x] Create adapter module, e.g. `src/pdf_extractor_analyzer/adapters/llm/replicate_adapter.py`.
- [x] Move SDK client construction (`Client`/`AsyncReplicate`) from analyzer into adapter.
- [x] Move `run(...)` call behavior and `wait` compatibility fallback into adapter.
- [x] Move async fallback (`to_thread` + semaphore) behavior into adapter (or a shared transport policy layer).
- [x] Keep existing behavior parity for retries/timeouts/output normalization.

## Phase 3 — Refactor analyzer into provider-agnostic application service
- [x] Replace `ReplicateVisionAnalyzer` with provider-neutral analyzer service.
- [x] Inject provider port into analyzer (constructor dependency injection).
- [x] Keep prompt-building and JSON extraction/repair logic in core analyzer.
- [x] Ensure structured repair flow uses the same provider port (text-only request).
- [x] Remove direct `import replicate` from analyzer core.

## Phase 4 — Provider factory / composition
- [x] Add provider factory/registry to instantiate adapter from config.
- [x] Wire factory into `PDFExtractor` initialization.
- [x] Ensure batch worker cloning still shares analyzer/provider safely where intended.

## Phase 5 — Config refactor
- [ ] Introduce provider selection field (e.g., `provider="replicate"`).
- [ ] Introduce provider-specific config grouping (replicate settings separated from generic LLM settings).
- [ ] Preserve current fields with deprecation shims where needed (`replicate_api_token`, `max_concurrent_replicate_calls`).
- [ ] Update config validation to enforce provider-specific requirements.

## Phase 6 — Pipeline/cache/metadata updates
- [ ] Include provider identity in extraction params used for cache invalidation.
- [ ] Include provider identity in extraction result metadata.
- [x] Include generation parameters (temperature/top_p/presence_penalty/frequency_penalty/max_completion_tokens) in cache key invalidation and implement consistently.

## Phase 7 — CLI refactor
- [ ] Add `--provider` option.
- [ ] Make provider-specific flags explicit and namespaced where needed.
- [ ] Keep existing Replicate flags working (with deprecation messaging if required).
- [ ] Update help text to be provider-neutral.

## Phase 8 — Tests
- [x] Add unit tests for provider port contract (sync + async behavior).
- [x] Add adapter tests for Replicate adapter behavior parity.
- [x] Update analyzer tests to mock provider port (not Replicate client internals).
- [ ] Update pipeline tests to assert provider appears in metadata/cache params.
- [ ] Split live integration tests by provider markers (e.g., `live_replicate`, future `live_openai`).

## Phase 9 — Docs and packaging
- [ ] Update README to describe provider architecture and configuration.
- [ ] Add docs for adding new provider adapters (developer guide).
- [x] Dependency strategy selected: move provider SDKs to optional extras.
- [ ] Implement optional extras in `pyproject.toml` (e.g., `[project.optional-dependencies]` for `replicate`, `openrouter`).
- [ ] Update usage examples for both Python API and CLI.

## Phase 10 — Migration and rollout
- [ ] Add changelog notes for config/API changes.
- [ ] Add deprecation warnings for old Replicate-only fields/names.
- [ ] Validate no regression in:
  - [ ] sync extraction
  - [ ] async extraction
  - [ ] streaming extraction
  - [ ] structured repair flow
  - [ ] caching semantics

---

## Definition of Done
- [ ] Core pipeline does not import or reference Replicate directly.
- [ ] Replicate support works through adapter implementing provider port.
- [ ] At least one non-Replicate adapter can be added without changing pipeline/analyzer core.
- [ ] Tests and docs reflect provider-agnostic architecture.

import asyncio
import json

import pytest

from pdf_extractor_analyzer.analyzer import VisionAnalyzer
from pdf_extractor_analyzer.config import ExtractorConfig
from pdf_extractor_analyzer.exceptions import AnalysisError, ValidationError
from pdf_extractor_analyzer.ports.llm_provider import LLMRequest, LLMResponse
from pdf_extractor_analyzer.schemas import ExtractionMode


class FakeProvider:
    def __init__(self, outputs_or_exc):
        self.outputs_or_exc = list(outputs_or_exc)
        self.sync_calls: list[LLMRequest] = []
        self.async_calls: list[LLMRequest] = []

    @property
    def provider_name(self) -> str:
        return "fake"

    def _next(self):
        if not self.outputs_or_exc:
            raise RuntimeError("no output configured")
        item = self.outputs_or_exc.pop(0)
        if isinstance(item, Exception):
            raise item
        return item

    def generate(self, request: LLMRequest) -> LLMResponse:
        self.sync_calls.append(request)
        output = self._next()
        return LLMResponse(text=str(output), provider=self.provider_name, model=request.model)

    async def agenerate(self, request: LLMRequest) -> LLMResponse:
        self.async_calls.append(request)
        await asyncio.sleep(0)
        output = self._next()
        return LLMResponse(text=str(output), provider=self.provider_name, model=request.model)


def _make_analyzer_with_provider(provider: FakeProvider, config: ExtractorConfig | None = None):
    cfg = config or ExtractorConfig(max_retries=2, retry_backoff_seconds=0)
    return VisionAnalyzer(cfg, provider=provider)


def test_analyze_page_full_text_uses_prompt_and_image_payload():
    provider = FakeProvider(["transcribed text"])
    analyzer = _make_analyzer_with_provider(provider)

    output = analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.FULL_TEXT)

    assert output == "transcribed text"
    call = provider.sync_calls[0]
    assert call.model == "openai/gpt-4o"
    assert call.image_bytes == b"img"


def test_analyze_page_uses_config_model_params():
    config = ExtractorConfig(
        max_completion_tokens=1000,
        temperature=0.5,
        top_p=0.8,
        presence_penalty=0.3,
        frequency_penalty=0.3,
        max_retries=1,
        retry_backoff_seconds=0,
    )
    provider = FakeProvider(["test output"])
    analyzer = _make_analyzer_with_provider(provider, config)

    analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.FULL_TEXT)

    request = provider.sync_calls[0]
    assert request.generation.max_completion_tokens == 1000
    assert request.generation.temperature == 0.5
    assert request.generation.top_p == 0.8
    assert request.generation.presence_penalty == 0.3
    assert request.generation.frequency_penalty == 0.3


def test_analyze_page_markdown_uses_markdown_prompt():
    provider = FakeProvider(["## Heading\n\nSome **bold** text"])
    analyzer = _make_analyzer_with_provider(provider)

    output = analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.MARKDOWN)

    assert output == "## Heading\n\nSome **bold** text"
    prompt = provider.sync_calls[0].prompt
    assert "Markdown" in prompt
    assert "#" in prompt
    assert "headings" in prompt


def test_analyze_page_structured_parses_json():
    provider = FakeProvider([json.dumps({"invoice_number": "INV-1"})])
    analyzer = _make_analyzer_with_provider(provider)

    output = analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.STRUCTURED)
    assert output == {"invoice_number": "INV-1"}


def test_run_with_retries_uses_fallback_model():
    config = ExtractorConfig(
        model="primary/model",
        fallback_model="fallback/model",
        max_retries=2,
        retry_backoff_seconds=0,
    )
    provider = FakeProvider([RuntimeError("fail"), RuntimeError("fail"), "ok-from-fallback"])
    analyzer = _make_analyzer_with_provider(provider, config)

    output = analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.SUMMARY)
    assert output == "ok-from-fallback"
    assert [call.model for call in provider.sync_calls] == [
        "primary/model",
        "primary/model",
        "fallback/model",
    ]


def test_structured_json_extraction_from_fenced_block():
    provider = FakeProvider(["```json\n{\"x\": 1}\n```"])
    analyzer = _make_analyzer_with_provider(provider)
    output = analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.STRUCTURED)
    assert output == {"x": 1}


def test_structured_json_extraction_failure_raises():
    provider = FakeProvider(["this is not json"])
    analyzer = _make_analyzer_with_provider(provider)
    with pytest.raises(AnalysisError, match="valid JSON"):
        analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.STRUCTURED)


def test_structured_json_extraction_failure_includes_text_preview():
    provider = FakeProvider(["not valid json output from model"])
    analyzer = _make_analyzer_with_provider(provider)

    with pytest.raises(AnalysisError) as exc_info:
        analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.STRUCTURED)

    error_msg = str(exc_info.value)
    assert "3 strategies" in error_msg
    assert "not valid json" in error_msg


def test_structured_json_extraction_failure_with_long_text():
    long_text = "x" * 500
    provider = FakeProvider([long_text])
    analyzer = _make_analyzer_with_provider(provider)

    with pytest.raises(AnalysisError) as exc_info:
        analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.STRUCTURED)

    error_msg = str(exc_info.value)
    assert "..." in error_msg
    assert long_text[:200] in error_msg
    assert long_text[200:] not in error_msg


def test_repair_structured_output_uses_text_only_call():
    provider = FakeProvider([json.dumps({"a": 1, "b": 2})])
    analyzer = _make_analyzer_with_provider(provider)
    repaired = analyzer.repair_structured_output(
        candidate={"a": 1},
        validation_error="missing b",
        structured_schema={"type": "object"},
    )
    assert repaired == {"a": 1, "b": 2}
    assert provider.sync_calls[0].image_bytes is None


def test_repair_structured_output_includes_candidate_in_prompt():
    provider = FakeProvider([json.dumps({"fixed": True})])
    analyzer = _make_analyzer_with_provider(provider)

    candidate = {"original": "data", "nested": {"key": "value"}}
    analyzer.repair_structured_output(
        candidate=candidate,
        validation_error="test error",
        structured_schema=None,
    )

    prompt = provider.sync_calls[0].prompt
    assert "Candidate JSON to repair" in prompt
    assert json.dumps(candidate) in prompt or json.dumps(candidate, indent=2) in prompt


def test_repair_structured_output_validates_candidate_type():
    provider = FakeProvider([json.dumps({"a": 1})])
    analyzer = _make_analyzer_with_provider(provider)

    with pytest.raises(AnalysisError, match="candidate must be a dict"):
        analyzer.repair_structured_output(
            candidate="not a dict",  # type: ignore
            validation_error="error",
            structured_schema=None,
        )

    with pytest.raises(AnalysisError, match="candidate must be a dict"):
        analyzer.repair_structured_output(
            candidate=["list", "not", "dict"],  # type: ignore
            validation_error="error",
            structured_schema=None,
        )


def test_repair_structured_output_handles_oversized_candidate():
    provider = FakeProvider([json.dumps({"a": 1})])
    analyzer = _make_analyzer_with_provider(provider)

    oversized_candidate = {"data": "x" * 200_000}

    with pytest.raises(AnalysisError, match="exceeds maximum size"):
        analyzer.repair_structured_output(
            candidate=oversized_candidate,
            validation_error="error",
            structured_schema=None,
        )


def test_analyze_page_validates_image_bytes_type():
    provider = FakeProvider(["output"])
    analyzer = _make_analyzer_with_provider(provider)

    with pytest.raises(ValidationError, match="image_bytes must be bytes"):
        analyzer.analyze_page(
            image_bytes="not bytes",  # type: ignore
            mode=ExtractionMode.FULL_TEXT,
        )


def test_analyze_page_async_uses_provider_agenerate():
    provider = FakeProvider(["async output"])
    analyzer = _make_analyzer_with_provider(provider)

    output = asyncio.run(
        analyzer.analyze_page_async(image_bytes=b"img", mode=ExtractionMode.FULL_TEXT)
    )

    assert output == "async output"
    assert len(provider.async_calls) == 1


def test_run_with_retries_async_uses_fallback_model():
    config = ExtractorConfig(
        model="primary/model",
        fallback_model="fallback/model",
        max_retries=2,
        retry_backoff_seconds=0,
    )
    provider = FakeProvider([RuntimeError("fail"), RuntimeError("fail"), "ok-from-fallback"])
    analyzer = _make_analyzer_with_provider(provider, config)

    output = asyncio.run(analyzer.analyze_page_async(image_bytes=b"img", mode=ExtractionMode.SUMMARY))
    assert output == "ok-from-fallback"
    assert [call.model for call in provider.async_calls] == [
        "primary/model",
        "primary/model",
        "fallback/model",
    ]

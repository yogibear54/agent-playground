import asyncio
import json

import pytest

from pdf_extractor_analyzer.analyzer import ReplicateVisionAnalyzer
from pdf_extractor_analyzer.config import ExtractorConfig
from pdf_extractor_analyzer.exceptions import AnalysisError, ValidationError
from pdf_extractor_analyzer.schemas import ExtractionMode


class FakeClient:
    def __init__(self, outputs_or_exc):
        self.outputs_or_exc = list(outputs_or_exc)
        self.calls = []

    def _next(self):
        if not self.outputs_or_exc:
            raise RuntimeError("no output configured")
        item = self.outputs_or_exc.pop(0)
        if isinstance(item, Exception):
            raise item
        return item

    def run(self, model, input, wait=None):
        self.calls.append({"model": model, "input": input, "wait": wait, "async": False})
        return self._next()

    async def async_run(self, model, input, wait=None):
        self.calls.append({"model": model, "input": input, "wait": wait, "async": True})
        await asyncio.sleep(0)
        return self._next()


def _make_analyzer_with_client(client: FakeClient, config: ExtractorConfig | None = None):
    cfg = config or ExtractorConfig(max_retries=2, retry_backoff_seconds=0)
    analyzer = ReplicateVisionAnalyzer(cfg)
    analyzer.client = client
    analyzer.async_client = None
    return analyzer


def test_analyze_page_full_text_uses_prompt_and_image_payload():
    client = FakeClient(["transcribed text"])
    analyzer = _make_analyzer_with_client(client)

    output = analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.FULL_TEXT)

    assert output == "transcribed text"
    assert client.calls[0]["model"] == "openai/gpt-4o"
    assert "image_input" in client.calls[0]["input"]


def test_analyze_page_uses_config_model_params():
    """Test that analyze_page uses configurable model parameters from ExtractorConfig."""
    from pdf_extractor_analyzer.config import ExtractorConfig

    # Create config with custom model parameters
    config = ExtractorConfig(
        max_completion_tokens=1000,
        temperature=0.5,
        top_p=0.8,
        presence_penalty=0.3,
        frequency_penalty=0.3,
        max_retries=1,
        retry_backoff_seconds=0,
    )
    client = FakeClient(["test output"])
    analyzer = _make_analyzer_with_client(client, config)

    output = analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.FULL_TEXT)

    # Verify custom parameters were used in the API call
    payload = client.calls[0]["input"]
    assert payload["max_completion_tokens"] == 1000
    assert payload["temperature"] == 0.5
    assert payload["top_p"] == 0.8
    assert payload["presence_penalty"] == 0.3
    assert payload["frequency_penalty"] == 0.3


def test_analyze_page_markdown_uses_markdown_prompt():
    """Test that markdown mode uses a prompt asking for Markdown output."""
    client = FakeClient(["## Heading\n\nSome **bold** text"])
    analyzer = _make_analyzer_with_client(client)

    output = analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.MARKDOWN)

    assert output == "## Heading\n\nSome **bold** text"
    # Verify the prompt contains markdown instructions
    prompt = client.calls[0]["input"]["prompt"]
    assert "Markdown" in prompt
    assert "#" in prompt
    assert "headings" in prompt


def test_analyze_page_structured_parses_json():
    client = FakeClient([json.dumps({"invoice_number": "INV-1"})])
    analyzer = _make_analyzer_with_client(client)

    output = analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.STRUCTURED)
    assert output == {"invoice_number": "INV-1"}


def test_run_with_retries_uses_fallback_model():
    config = ExtractorConfig(
        model="primary/model",
        fallback_model="fallback/model",
        max_retries=2,
        retry_backoff_seconds=0,
    )
    client = FakeClient([RuntimeError("fail"), RuntimeError("fail"), "ok-from-fallback"])
    analyzer = _make_analyzer_with_client(client, config)

    output = analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.SUMMARY)
    assert output == "ok-from-fallback"
    assert [call["model"] for call in client.calls] == [
        "primary/model",
        "primary/model",
        "fallback/model",
    ]


def test_structured_json_extraction_from_fenced_block():
    client = FakeClient(["```json\n{\"x\": 1}\n```"])
    analyzer = _make_analyzer_with_client(client)
    output = analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.STRUCTURED)
    assert output == {"x": 1}


def test_structured_json_extraction_failure_raises():
    client = FakeClient(["this is not json"])
    analyzer = _make_analyzer_with_client(client)
    with pytest.raises(AnalysisError, match="valid JSON"):
        analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.STRUCTURED)


def test_structured_json_extraction_failure_includes_text_preview():
    """Test that extraction failure includes a preview of the problematic text."""
    client = FakeClient(["not valid json output from model"])
    analyzer = _make_analyzer_with_client(client)

    with pytest.raises(AnalysisError) as exc_info:
        analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.STRUCTURED)

    error_msg = str(exc_info.value)
    # Should mention attempted strategies
    assert "3 strategies" in error_msg
    # Should include text preview
    assert "not valid json" in error_msg


def test_structured_json_extraction_failure_with_long_text():
    """Test that long text is truncated in the error message."""
    long_text = "x" * 500  # Very long text
    client = FakeClient([long_text])
    analyzer = _make_analyzer_with_client(client)

    with pytest.raises(AnalysisError) as exc_info:
        analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.STRUCTURED)

    error_msg = str(exc_info.value)
    # Should be truncated
    assert "..." in error_msg
    # Should still include beginning of text
    assert long_text[:200] in error_msg
    # Should not include full text
    assert long_text[200:] not in error_msg


def test_repair_structured_output_uses_text_only_call():
    client = FakeClient([json.dumps({"a": 1, "b": 2})])
    analyzer = _make_analyzer_with_client(client)
    repaired = analyzer.repair_structured_output(
        candidate={"a": 1},
        validation_error="missing b",
        structured_schema={"type": "object"},
    )
    assert repaired == {"a": 1, "b": 2}
    assert "image_input" not in client.calls[0]["input"]


def test_repair_structured_output_includes_candidate_in_prompt():
    """Verify the candidate JSON appears in the repair prompt."""
    client = FakeClient([json.dumps({"fixed": True})])
    analyzer = _make_analyzer_with_client(client)

    candidate = {"original": "data", "nested": {"key": "value"}}
    analyzer.repair_structured_output(
        candidate=candidate,
        validation_error="test error",
        structured_schema=None,
    )

    prompt = client.calls[0]["input"]["prompt"]
    assert "Candidate JSON to repair" in prompt
    assert json.dumps(candidate) in prompt or json.dumps(candidate, indent=2) in prompt


def test_repair_structured_output_validates_candidate_type():
    """Verify non-dict candidates raise AnalysisError."""
    client = FakeClient([json.dumps({"a": 1})])
    analyzer = _make_analyzer_with_client(client)

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
    """Verify oversized candidates are rejected gracefully."""
    client = FakeClient([json.dumps({"a": 1})])
    analyzer = _make_analyzer_with_client(client)

    # Create a candidate that exceeds 100KB limit
    oversized_candidate = {"data": "x" * 200_000}

    with pytest.raises(AnalysisError, match="exceeds maximum size"):
        analyzer.repair_structured_output(
            candidate=oversized_candidate,
            validation_error="error",
            structured_schema=None,
        )


def test_analyze_page_validates_image_bytes_type():
    """Verify non-bytes image_bytes raises ValidationError."""
    client = FakeClient(["output"])
    analyzer = _make_analyzer_with_client(client)

    with pytest.raises(ValidationError, match="image_bytes must be bytes"):
        analyzer.analyze_page(
            image_bytes="not bytes",  # type: ignore
            mode=ExtractionMode.FULL_TEXT,
        )


def test_analyze_page_async_without_async_replicate_uses_client_run_via_thread():
    """When AsyncReplicate is unavailable, async API uses sync client.run in a thread (not async_run)."""
    client = FakeClient(["async output"])
    analyzer = _make_analyzer_with_client(client)

    output = asyncio.run(
        analyzer.analyze_page_async(image_bytes=b"img", mode=ExtractionMode.FULL_TEXT)
    )

    assert output == "async output"
    assert client.calls[0]["async"] is False


def test_run_with_retries_async_uses_fallback_model():
    config = ExtractorConfig(
        model="primary/model",
        fallback_model="fallback/model",
        max_retries=2,
        retry_backoff_seconds=0,
    )
    client = FakeClient([RuntimeError("fail"), RuntimeError("fail"), "ok-from-fallback"])
    analyzer = _make_analyzer_with_client(client, config)

    output = asyncio.run(analyzer.analyze_page_async(image_bytes=b"img", mode=ExtractionMode.SUMMARY))
    assert output == "ok-from-fallback"
    assert [call["model"] for call in client.calls] == [
        "primary/model",
        "primary/model",
        "fallback/model",
    ]

import json

import pytest

from pdf_extractor_analyzer.analyzer import ReplicateVisionAnalyzer
from pdf_extractor_analyzer.config import ExtractorConfig
from pdf_extractor_analyzer.exceptions import AnalysisError
from pdf_extractor_analyzer.schemas import ExtractionMode


class FakeClient:
    def __init__(self, outputs_or_exc):
        self.outputs_or_exc = list(outputs_or_exc)
        self.calls = []

    def run(self, model, input, wait=None):
        self.calls.append({"model": model, "input": input, "wait": wait})
        if not self.outputs_or_exc:
            raise RuntimeError("no output configured")
        item = self.outputs_or_exc.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


def _make_analyzer_with_client(client: FakeClient, config: ExtractorConfig | None = None):
    cfg = config or ExtractorConfig(max_retries=2, retry_backoff_seconds=0)
    analyzer = ReplicateVisionAnalyzer(cfg)
    analyzer.client = client
    return analyzer


def test_analyze_page_full_text_uses_prompt_and_image_payload():
    client = FakeClient(["transcribed text"])
    analyzer = _make_analyzer_with_client(client)

    output = analyzer.analyze_page(image_bytes=b"img", mode=ExtractionMode.FULL_TEXT)

    assert output == "transcribed text"
    assert client.calls[0]["model"] == "openai/gpt-4o"
    assert "image_input" in client.calls[0]["input"]


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

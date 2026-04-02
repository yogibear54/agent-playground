from __future__ import annotations

import asyncio

from pydantic import BaseModel

from pdf_extractor_analyzer.config import CacheMode, ExtractorConfig
from pdf_extractor_analyzer.converter import PageImage
from pdf_extractor_analyzer.pipeline import PDFExtractor
from pdf_extractor_analyzer.schemas import ExtractionMode


def _fake_pages() -> list[PageImage]:
    return [
        PageImage(page_number=1, width=100, height=100, image_bytes=b"1", image_path=None),
        PageImage(page_number=2, width=100, height=100, image_bytes=b"2", image_path=None),
    ]


def test_phase10_sync_extraction_regression(monkeypatch, make_pdf):
    pdf_path = make_pdf("phase10-sync.pdf", pages=1)
    extractor = PDFExtractor(ExtractorConfig(cache_mode=CacheMode.DISABLED))

    monkeypatch.setattr(PDFExtractor, "_prepare_pages", lambda *args, **kwargs: _fake_pages())
    outputs = iter(["first", "second"])
    monkeypatch.setattr(extractor.analyzer, "analyze_page", lambda **kwargs: next(outputs))

    result = extractor.extract(pdf_path, mode=ExtractionMode.FULL_TEXT)
    assert result.content == "[Page 1]\nfirst\n\n[Page 2]\nsecond"


def test_phase10_async_and_streaming_regression(monkeypatch, make_pdf):
    pdf_path = make_pdf("phase10-async.pdf", pages=1)
    extractor = PDFExtractor(ExtractorConfig(cache_mode=CacheMode.DISABLED, max_concurrent_pages=2))

    monkeypatch.setattr(PDFExtractor, "_prepare_pages", lambda *args, **kwargs: _fake_pages())

    async def fake_analyze_page_async(**kwargs):
        return f"p{kwargs['page_number']}"

    monkeypatch.setattr(extractor.analyzer, "analyze_page_async", fake_analyze_page_async)

    async_result = asyncio.run(extractor.extract_async(pdf_path, mode=ExtractionMode.SUMMARY))
    assert async_result.content == "Page 1: p1\nPage 2: p2"

    async def collect_stream():
        events = []
        async for event in extractor.extract_streaming(pdf_path, mode=ExtractionMode.SUMMARY):
            events.append(event)
        return events

    streamed = asyncio.run(collect_stream())
    assert [e[0] for e in streamed] == [1, 2]
    assert [e[1] for e in streamed] == ["p1", "p2"]


class StructuredSchema(BaseModel):
    required_field: str


class _FakeValidationResult:
    def __init__(self, data):
        self._data = data

    def model_dump(self):
        return self._data


class _StructuredSchemaForRepairFlow:
    _first_call = True

    @classmethod
    def model_json_schema(cls):
        return {"type": "object", "properties": {"required_field": {"type": "string"}}}

    @classmethod
    def model_validate(cls, data):
        from pdf_extractor_analyzer.exceptions import ValidationError as ExtractorValidationError

        if cls._first_call:
            cls._first_call = False
            raise ExtractorValidationError("missing required_field")
        return _FakeValidationResult(data)


def test_phase10_structured_repair_regression(monkeypatch, make_pdf):
    pdf_path = make_pdf("phase10-structured.pdf", pages=1)
    extractor = PDFExtractor(ExtractorConfig(cache_mode=CacheMode.DISABLED))

    monkeypatch.setattr(PDFExtractor, "_prepare_pages", lambda *args, **kwargs: _fake_pages())
    monkeypatch.setattr(extractor.analyzer, "analyze_page", lambda **kwargs: {"other": "value"})

    repair_called = {"value": False}

    def fake_repair(**kwargs):
        repair_called["value"] = True
        return {"required_field": "ok"}

    monkeypatch.setattr(extractor.analyzer, "repair_structured_output", fake_repair)

    result = extractor.extract(
        pdf_path,
        mode=ExtractionMode.STRUCTURED,
        schema=_StructuredSchemaForRepairFlow,
    )
    assert result.content == {"required_field": "ok"}
    assert repair_called["value"] is True


def test_phase10_cache_semantics_regression(monkeypatch, make_pdf, tmp_path):
    pdf_path = make_pdf("phase10-cache.pdf", pages=1)
    cfg = ExtractorConfig(cache_mode=CacheMode.PERSISTENT, cache_dir=tmp_path / "cache")

    extractor_first = PDFExtractor(cfg)
    monkeypatch.setattr(PDFExtractor, "_prepare_pages", lambda *args, **kwargs: _fake_pages())
    monkeypatch.setattr(extractor_first.analyzer, "analyze_page", lambda **kwargs: "cached")
    first = extractor_first.extract(pdf_path, mode=ExtractionMode.SUMMARY)
    assert first.metadata.get("from_cache") is not True

    extractor_second = PDFExtractor(cfg)
    # ensure cache hit path (analyzer should not be needed)
    second = extractor_second.extract(pdf_path, mode=ExtractionMode.SUMMARY)
    assert second.metadata.get("from_cache") is True
    assert second.content == first.content

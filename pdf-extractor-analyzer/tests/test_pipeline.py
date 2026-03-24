from pathlib import Path

import pytest
from pydantic import BaseModel

from pdf_extractor_analyzer.config import CacheMode, ExtractorConfig
from pdf_extractor_analyzer.converter import PageImage
from pdf_extractor_analyzer.pipeline import PDFExtractor
from pdf_extractor_analyzer.schemas import ExtractionMode


class StructuredSchema(BaseModel):
    name: str
    count: int


def _fake_pages() -> list[PageImage]:
    return [
        PageImage(page_number=1, width=100, height=100, image_bytes=b"1", image_path=None),
        PageImage(page_number=2, width=100, height=100, image_bytes=b"2", image_path=None),
    ]


def test_extract_full_text_aggregation(monkeypatch, make_pdf):
    pdf_path = make_pdf("doc.pdf", pages=1)
    extractor = PDFExtractor(ExtractorConfig(cache_mode=CacheMode.DISABLED))

    monkeypatch.setattr(PDFExtractor, "_prepare_pages", lambda *args, **kwargs: _fake_pages())
    outputs = iter(["first", "second"])
    monkeypatch.setattr(
        extractor.analyzer,
        "analyze_page",
        lambda **kwargs: next(outputs),
    )

    result = extractor.extract(pdf_path, mode=ExtractionMode.FULL_TEXT)
    assert "[Page 1]" in result.content
    assert "first" in result.content
    assert "[Page 2]" in result.content


def test_extract_summary_aggregation(monkeypatch, make_pdf):
    pdf_path = make_pdf("doc-summary.pdf", pages=1)
    extractor = PDFExtractor(ExtractorConfig(cache_mode=CacheMode.DISABLED))

    monkeypatch.setattr(PDFExtractor, "_prepare_pages", lambda *args, **kwargs: _fake_pages())
    outputs = iter(["summary a", "summary b"])
    monkeypatch.setattr(extractor.analyzer, "analyze_page", lambda **kwargs: next(outputs))

    result = extractor.extract(pdf_path, mode=ExtractionMode.SUMMARY)
    assert result.content == "Page 1: summary a\nPage 2: summary b"


def test_extract_structured_validation_repair(monkeypatch, make_pdf):
    pdf_path = make_pdf("doc-structured.pdf", pages=1)
    extractor = PDFExtractor(ExtractorConfig(cache_mode=CacheMode.DISABLED))

    monkeypatch.setattr(PDFExtractor, "_prepare_pages", lambda *args, **kwargs: _fake_pages())
    monkeypatch.setattr(extractor.analyzer, "analyze_page", lambda **kwargs: {"name": "item"})
    monkeypatch.setattr(
        extractor.analyzer,
        "repair_structured_output",
        lambda **kwargs: {"name": "item", "count": 2},
    )

    result = extractor.extract(pdf_path, mode=ExtractionMode.STRUCTURED, schema=StructuredSchema)
    assert result.content == {"name": "item", "count": 2}


def test_extract_structured_requires_schema(make_pdf):
    pdf_path = make_pdf("doc-required-schema.pdf", pages=1)
    extractor = PDFExtractor(ExtractorConfig(cache_mode=CacheMode.DISABLED))
    with pytest.raises(ValueError, match="requires a Pydantic schema"):
        extractor.extract(pdf_path, mode=ExtractionMode.STRUCTURED)


def test_extract_many_validates_max_workers():
    extractor = PDFExtractor(ExtractorConfig())
    with pytest.raises(ValueError, match="max_workers"):
        extractor.extract_many(["/tmp/a.pdf"], mode=ExtractionMode.SUMMARY, max_workers=0)


def test_cleanup_persistent_cache_calls_manager(monkeypatch):
    extractor = PDFExtractor(ExtractorConfig())
    monkeypatch.setattr(extractor.cache, "cleanup_expired", lambda: 7)
    assert extractor.cleanup_persistent_cache() == 7


def test_extract_includes_metadata(monkeypatch, make_pdf):
    pdf_path = make_pdf("doc-meta.pdf", pages=1)
    extractor = PDFExtractor(ExtractorConfig(cache_mode=CacheMode.DISABLED, model="test-model"))
    monkeypatch.setattr(PDFExtractor, "_prepare_pages", lambda *args, **kwargs: _fake_pages())
    monkeypatch.setattr(extractor.analyzer, "analyze_page", lambda **kwargs: "x")

    result = extractor.extract(pdf_path, mode=ExtractionMode.FULL_TEXT)
    assert result.metadata["model"] == "test-model"
    assert result.metadata["cache_mode"] == CacheMode.DISABLED.value
    assert result.metadata["page_count"] == 2

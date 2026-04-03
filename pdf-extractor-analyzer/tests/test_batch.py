import asyncio
from pathlib import Path

import pytest

from pdf_extractor_analyzer.config import ExtractorConfig
from pdf_extractor_analyzer.pipeline import PDFExtractor
from pdf_extractor_analyzer.schemas import BatchItemStatus, ExtractionMode, ExtractionResult


def test_extract_many_preserves_input_order(monkeypatch):
    extractor = PDFExtractor(ExtractorConfig())

    def fake_single(self, path, mode, schema, prompt):
        return ExtractionResult(
            extraction_mode=mode,
            content=f"ok:{Path(path).name}",
            metadata={},
        )

    monkeypatch.setattr(PDFExtractor, "_run_single_batch_item", fake_single)

    results = extractor.extract_many(
        ["/tmp/a.pdf", "/tmp/b.pdf", "/tmp/c.pdf"],
        mode=ExtractionMode.FULL_TEXT,
        max_workers=2,
    )

    assert [item.pdf_path for item in results] == ["/tmp/a.pdf", "/tmp/b.pdf", "/tmp/c.pdf"]
    assert all(item.status == BatchItemStatus.SUCCESS for item in results)


def test_extract_many_continue_on_error(monkeypatch):
    extractor = PDFExtractor(ExtractorConfig())

    def fake_single(self, path, mode, schema, prompt):
        if Path(path).name == "b.pdf":
            raise RuntimeError("boom")
        return ExtractionResult(extraction_mode=mode, content="ok", metadata={})

    monkeypatch.setattr(PDFExtractor, "_run_single_batch_item", fake_single)

    results = extractor.extract_many(
        ["/tmp/a.pdf", "/tmp/b.pdf"],
        mode=ExtractionMode.SUMMARY,
        continue_on_error=True,
    )

    assert results[0].status == BatchItemStatus.SUCCESS
    assert results[1].status == BatchItemStatus.ERROR
    assert results[1].error is not None


def test_extract_many_async_preserves_input_order(monkeypatch):
    extractor = PDFExtractor(ExtractorConfig())

    async def fake_single_async(self, path, mode, schema, prompt):
        await asyncio.sleep(0)
        return ExtractionResult(
            extraction_mode=mode,
            content=f"ok:{Path(path).name}",
            metadata={},
        )

    monkeypatch.setattr(PDFExtractor, "_run_single_batch_item_async", fake_single_async)

    results = asyncio.run(
        extractor.extract_many_async(
            ["/tmp/a.pdf", "/tmp/b.pdf", "/tmp/c.pdf"],
            mode=ExtractionMode.FULL_TEXT,
            max_workers=2,
        )
    )

    assert [item.pdf_path for item in results] == ["/tmp/a.pdf", "/tmp/b.pdf", "/tmp/c.pdf"]
    assert all(item.status == BatchItemStatus.SUCCESS for item in results)


def test_extract_many_async_continue_on_error(monkeypatch):
    extractor = PDFExtractor(ExtractorConfig())

    async def fake_single_async(self, path, mode, schema, prompt):
        if Path(path).name == "b.pdf":
            raise RuntimeError("boom")
        return ExtractionResult(extraction_mode=mode, content="ok", metadata={})

    monkeypatch.setattr(PDFExtractor, "_run_single_batch_item_async", fake_single_async)

    results = asyncio.run(
        extractor.extract_many_async(
            ["/tmp/a.pdf", "/tmp/b.pdf"],
            mode=ExtractionMode.SUMMARY,
            continue_on_error=True,
        )
    )

    assert results[0].status == BatchItemStatus.SUCCESS
    assert results[1].status == BatchItemStatus.ERROR


def test_extract_many_stop_on_error(monkeypatch):
    extractor = PDFExtractor(ExtractorConfig())

    def fake_single(self, path, mode, schema, prompt):
        raise RuntimeError("boom")

    monkeypatch.setattr(PDFExtractor, "_run_single_batch_item", fake_single)

    with pytest.raises(RuntimeError):
        extractor.extract_many(
            ["/tmp/a.pdf", "/tmp/b.pdf"],
            mode=ExtractionMode.SUMMARY,
            continue_on_error=False,
        )

from __future__ import annotations

import os

import pytest

from pdf_extractor_analyzer.config import CacheMode, ExtractorConfig
from pdf_extractor_analyzer.pipeline import PDFExtractor
from pdf_extractor_analyzer.schemas import ExtractionMode


@pytest.mark.live_replicate
def test_live_replicate_summary(make_pdf):
    if os.getenv("PDF_EXTRACTOR_LIVE_TEST") != "1":
        pytest.skip("Set PDF_EXTRACTOR_LIVE_TEST=1 to run live Replicate integration test")
    if not os.getenv("REPLICATE_API_TOKEN"):
        pytest.skip("Set REPLICATE_API_TOKEN to run live Replicate integration test")

    model = os.getenv("PDF_EXTRACTOR_LIVE_MODEL", "openai/gpt-4o-mini")
    pdf_path = make_pdf("live.pdf", pages=1, text_prefix="Live integration")
    extractor = PDFExtractor(
        ExtractorConfig(
            model=model,
            fallback_model=None,
            cache_mode=CacheMode.DISABLED,
            timeout_seconds=120,
            max_retries=1,
        )
    )

    result = extractor.extract(pdf_path, mode=ExtractionMode.SUMMARY)
    assert result.extraction_mode == ExtractionMode.SUMMARY
    assert isinstance(result.content, str)
    assert result.content.strip() != ""

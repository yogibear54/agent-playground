from __future__ import annotations

import os

import pytest

from pdf_extractor_analyzer.config import CacheMode, ExtractorConfig, OpenRouterProviderConfig
from pdf_extractor_analyzer.pipeline import PDFExtractor
from pdf_extractor_analyzer.schemas import ExtractionMode


@pytest.mark.live_openrouter
def test_live_openrouter_summary(make_pdf):
    if os.getenv("PDF_EXTRACTOR_LIVE_TEST") != "1":
        pytest.skip("Set PDF_EXTRACTOR_LIVE_TEST=1 to run live OpenRouter integration test")
    if not os.getenv("OPENROUTER_API_KEY"):
        pytest.skip("Set OPENROUTER_API_KEY to run live OpenRouter integration test")

    model = os.getenv("PDF_EXTRACTOR_LIVE_MODEL", "openai/gpt-4o-mini")
    pdf_path = make_pdf("live-openrouter.pdf", pages=1, text_prefix="Live integration OR")
    extractor = PDFExtractor(
        ExtractorConfig(
            provider="openrouter",
            model=model,
            fallback_model=None,
            openrouter=OpenRouterProviderConfig(api_key=os.getenv("OPENROUTER_API_KEY")),
            cache_mode=CacheMode.DISABLED,
            timeout_seconds=120,
            max_retries=1,
        )
    )

    result = extractor.extract(pdf_path, mode=ExtractionMode.SUMMARY)
    assert result.extraction_mode == ExtractionMode.SUMMARY
    assert isinstance(result.content, str)
    assert result.content.strip() != ""

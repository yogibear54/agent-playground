import json

from pdf_extractor_analyzer.config import CacheMode, ExtractorConfig
from pdf_extractor_analyzer.pipeline import PDFExtractor
from pdf_extractor_analyzer.schemas import ExtractionMode


def test_get_extraction_params_includes_provider_and_generation():
    extractor = PDFExtractor(
        ExtractorConfig(
            cache_mode=CacheMode.DISABLED,
            provider="replicate",
            model="openai/gpt-4o-mini",
            max_completion_tokens=1234,
            temperature=0.6,
            top_p=0.7,
            presence_penalty=0.2,
            frequency_penalty=0.1,
        )
    )

    params = extractor._get_extraction_params(ExtractionMode.SUMMARY, schema=None)

    assert params["provider"] == "replicate"
    assert params["model"] == "openai/gpt-4o-mini"
    assert params["generation"] == {
        "max_completion_tokens": 1234,
        "temperature": 0.6,
        "top_p": 0.7,
        "presence_penalty": 0.2,
        "frequency_penalty": 0.1,
    }


def test_extract_metadata_includes_provider(monkeypatch, make_pdf):
    from pdf_extractor_analyzer.converter import PageImage

    pdf_path = make_pdf("provider-meta.pdf", pages=1)
    extractor = PDFExtractor(
        ExtractorConfig(cache_mode=CacheMode.DISABLED, provider="replicate", model="test-model")
    )

    fake_pages = [PageImage(page_number=1, width=100, height=100, image_bytes=b"img", image_path=None)]
    monkeypatch.setattr(PDFExtractor, "_prepare_pages", lambda *args, **kwargs: fake_pages)
    monkeypatch.setattr(extractor.analyzer, "analyze_page", lambda **kwargs: "x")

    result = extractor.extract(pdf_path, mode=ExtractionMode.FULL_TEXT)
    assert result.metadata["provider"] == "replicate"
    assert result.metadata["model"] == "test-model"


def test_cached_content_invalidation_includes_generation_params(monkeypatch, make_pdf, tmp_path):
    from pdf_extractor_analyzer.converter import PageImage

    pdf_path = make_pdf("cache-gen-params.pdf", pages=1)
    cache_dir = tmp_path / "cache"

    # First run writes cache
    extractor_one = PDFExtractor(
        ExtractorConfig(
            cache_mode=CacheMode.PERSISTENT,
            cache_dir=cache_dir,
            temperature=0.0,
        )
    )
    fake_pages = [PageImage(page_number=1, width=100, height=100, image_bytes=b"img", image_path=None)]
    monkeypatch.setattr(PDFExtractor, "_prepare_pages", lambda *args, **kwargs: fake_pages)
    monkeypatch.setattr(extractor_one.analyzer, "analyze_page", lambda **kwargs: "first")
    first = extractor_one.extract(pdf_path, mode=ExtractionMode.SUMMARY)
    assert first.content == "Page 1: first"

    # Second run changes generation param; should not hit previous cached content
    extractor_two = PDFExtractor(
        ExtractorConfig(
            cache_mode=CacheMode.PERSISTENT,
            cache_dir=cache_dir,
            temperature=0.9,
        )
    )

    calls = {"count": 0}

    def analyze_second(**kwargs):
        calls["count"] += 1
        return "second"

    monkeypatch.setattr(extractor_two.analyzer, "analyze_page", analyze_second)
    second = extractor_two.extract(pdf_path, mode=ExtractionMode.SUMMARY)

    assert calls["count"] == 1
    assert second.content == "Page 1: second"

    # Verify cache file contains generation params in extraction_params.
    source_hash = first.metadata["source_hash"]
    content_json = cache_dir / source_hash[:32] / "content.json"
    payload = json.loads(content_json.read_text())
    assert "generation" in payload["extraction_params"]

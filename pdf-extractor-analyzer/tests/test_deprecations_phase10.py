from __future__ import annotations

import warnings

from pdf_extractor_analyzer import cli
from pdf_extractor_analyzer.analyzer import ReplicateVisionAnalyzer
from pdf_extractor_analyzer.config import ExtractorConfig


class FakeExtractor:
    def __init__(self, config):
        self.config = config

    def extract(self, pdf_path, *, mode, schema=None, prompt=None):
        from pdf_extractor_analyzer.schemas import ExtractionResult

        return ExtractionResult(extraction_mode=mode, content="ok", metadata={})


def test_replicate_vision_analyzer_deprecation_warning():
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        ReplicateVisionAnalyzer(ExtractorConfig())

    assert any("ReplicateVisionAnalyzer is deprecated" in str(w.message) for w in caught)


def test_cli_deprecated_replicate_flag_warns(monkeypatch):
    monkeypatch.setattr(cli, "PDFExtractor", FakeExtractor)

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        code = cli.main([
            "/tmp/a.pdf",
            "--mode",
            "summary",
            "--max-concurrent-replicate-calls",
            "2",
        ])

    assert code == 0
    assert any("--max-concurrent-replicate-calls is deprecated" in str(w.message) for w in caught)

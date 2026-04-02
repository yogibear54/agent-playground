from pdf_extractor_analyzer.config import ExtractorConfig
from pdf_extractor_analyzer.pipeline import PDFExtractor


class FakeProvider:
    @property
    def provider_name(self) -> str:
        return "fake"

    def generate(self, request):
        raise NotImplementedError

    async def agenerate(self, request):
        raise NotImplementedError


def test_pdf_extractor_uses_provider_factory(monkeypatch):
    import pdf_extractor_analyzer.pipeline as pipeline_module

    captured = {"provider": None, "config": None}

    def fake_create_provider(config):
        captured["config"] = config
        return FakeProvider()

    class FakeAnalyzer:
        def __init__(self, config, provider=None):
            self.config = config
            self.provider = provider
            captured["provider"] = provider

    monkeypatch.setattr(pipeline_module, "create_llm_provider", fake_create_provider)
    monkeypatch.setattr(pipeline_module, "VisionAnalyzer", FakeAnalyzer)

    config = ExtractorConfig()
    extractor = PDFExtractor(config)

    assert captured["config"] is config
    assert captured["provider"] is not None
    assert extractor.analyzer.provider is captured["provider"]


def test_batch_worker_shares_same_analyzer_instance():
    extractor = PDFExtractor(ExtractorConfig())
    worker = extractor._make_worker()

    assert worker.analyzer is extractor.analyzer
    assert worker.analyzer.provider is extractor.analyzer.provider

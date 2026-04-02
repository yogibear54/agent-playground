from pdf_extractor_analyzer import OpenRouterProviderConfig, ReplicateProviderConfig


def test_provider_config_exports_available():
    assert ReplicateProviderConfig is not None
    assert OpenRouterProviderConfig is not None

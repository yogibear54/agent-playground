import pytest

from pdf_extractor_analyzer.config import ExtractorConfig


def test_default_config_is_valid():
    config = ExtractorConfig()
    config.validate()


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("dpi", 0, "dpi must be > 0"),
        ("cache_ttl_days", -1, "cache_ttl_days cannot be negative"),
        ("max_retries", 0, "max_retries must be >= 1"),
        ("retry_backoff_seconds", -0.1, "retry_backoff_seconds cannot be negative"),
        ("timeout_seconds", 0, "timeout_seconds must be > 0"),
    ],
)
def test_config_validation_errors(field, value, message):
    config = ExtractorConfig()
    setattr(config, field, value)
    with pytest.raises(ValueError, match=message):
        config.validate()

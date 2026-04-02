from pathlib import Path

import pytest

from pdf_extractor_analyzer.config import CacheMode, ExtractorConfig
from pdf_extractor_analyzer.exceptions import ValidationError
from pdf_extractor_analyzer.pipeline import PDFExtractor
from pdf_extractor_analyzer.schemas import ExtractionMode


def test_validation_error_includes_field_and_value():
    """Test that ValidationError captures field and value information."""
    error = ValidationError("test message", field="test_field", value="test_value")
    assert error.field == "test_field"
    assert error.value == "test_value"
    assert str(error) == "test message"


def test_extract_validates_pdf_magic_bytes(make_pdf, tmp_path: Path):
    """Test that non-PDF files are rejected."""
    # Create a file that looks like text but has PDF extension
    fake_pdf = tmp_path / "fake.pdf"
    fake_pdf.write_text("This is not a PDF file")

    extractor = PDFExtractor(ExtractorConfig())
    with pytest.raises(ValidationError, match="does not appear to be a valid PDF"):
        extractor.extract(fake_pdf, mode=ExtractionMode.FULL_TEXT)


def test_extract_validates_max_pdf_file_size(make_pdf, tmp_path: Path):
    """Test that PDFs exceeding max file size are rejected."""
    pdf_path = make_pdf("large.pdf", pages=1)

    # Set very small max file size
    config = ExtractorConfig(max_pdf_file_size=1)  # 1 byte
    extractor = PDFExtractor(config)

    with pytest.raises(ValidationError, match="exceeds maximum allowed"):
        extractor.extract(pdf_path, mode=ExtractionMode.FULL_TEXT)


def test_extract_accepts_valid_pdf(make_pdf, monkeypatch):
    """Test that valid PDFs pass validation."""
    pdf_path = make_pdf("valid.pdf", pages=1)

    config = ExtractorConfig(
        max_pdf_file_size=10_000_000,  # 10MB
        cache_mode=CacheMode.DISABLED,
    )
    extractor = PDFExtractor(config)

    # Mock the analyzer to avoid needing API
    from pdf_extractor_analyzer import converter

    fake_pages = [
        converter.PageImage(
            page_number=1, width=100, height=100, image_bytes=b"img", image_path=None
        )
    ]
    monkeypatch.setattr(extractor, "_prepare_pages", lambda **_: fake_pages)
    monkeypatch.setattr(extractor.analyzer, "analyze_page", lambda **_: "test output")

    result = extractor.extract(pdf_path, mode=ExtractionMode.FULL_TEXT)
    assert result.extraction_mode == ExtractionMode.FULL_TEXT


def test_config_validates_image_limits():
    """Test that config validates image limit settings."""
    # Valid config should not raise
    config = ExtractorConfig()
    config.validate()

    config = ExtractorConfig(image_max_long_edge=2048)
    config.validate()

    config = ExtractorConfig(image_max_long_edge=0)
    with pytest.raises(ValueError, match="image_max_long_edge must be > 0 or None"):
        config.validate()

    # Invalid max_image_width
    config = ExtractorConfig()
    config.max_image_width = 0
    with pytest.raises(ValueError, match="max_image_width must be > 0"):
        config.validate()

    # Invalid max_image_height
    config = ExtractorConfig()
    config.max_image_height = -1
    with pytest.raises(ValueError, match="max_image_height must be > 0"):
        config.validate()

    # Invalid max_image_bytes
    config = ExtractorConfig()
    config.max_image_bytes = 0
    with pytest.raises(ValueError, match="max_image_bytes must be > 0"):
        config.validate()


def test_config_validates_log_level():
    """Test that config validates log_level."""
    config = ExtractorConfig(log_level="DEBUG")
    config.validate()

    config = ExtractorConfig(log_level="INFO")
    config.validate()

    config = ExtractorConfig(log_level="INVALID")
    with pytest.raises(ValueError, match="log_level must be one of"):
        config.validate()


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("dpi", 0, "dpi must be > 0"),
        ("cache_ttl_days", -1, "cache_ttl_days cannot be negative"),
        ("max_retries", 0, "max_retries must be >= 1"),
        ("retry_backoff_seconds", -0.1, "retry_backoff_seconds cannot be negative"),
        ("timeout_seconds", 0, "timeout_seconds must be > 0"),
        ("max_concurrent_pages", 0, "max_concurrent_pages must be > 0"),
        ("async_requests_per_second", 0.0, "async_requests_per_second must be > 0"),
    ],
)
def test_config_validation_errors(field, value, message):
    config = ExtractorConfig()
    setattr(config, field, value)
    with pytest.raises(ValueError, match=message):
        config.validate()


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("max_completion_tokens", 0, "max_completion_tokens must be > 0"),
        ("temperature", -0.1, "temperature must be between"),
        ("temperature", 2.1, "temperature must be between"),
        ("top_p", -0.1, "top_p must be between"),
        ("top_p", 1.1, "top_p must be between"),
        ("presence_penalty", -2.1, "presence_penalty must be between"),
        ("presence_penalty", 2.1, "presence_penalty must be between"),
        ("frequency_penalty", -2.1, "frequency_penalty must be between"),
        ("frequency_penalty", 2.1, "frequency_penalty must be between"),
    ],
)
def test_config_model_params_validation_errors(field, value, message):
    """Test validation of model API parameters."""
    config = ExtractorConfig()
    setattr(config, field, value)
    with pytest.raises(ValueError, match=message):
        config.validate()


def test_config_model_params_defaults():
    """Test that model API parameters have correct defaults."""
    config = ExtractorConfig()
    config.validate()  # Should not raise

    assert config.max_completion_tokens == 4096
    assert config.temperature == 0.0
    assert config.top_p == 1.0
    assert config.presence_penalty == 0.0
    assert config.frequency_penalty == 0.0
    assert config.max_concurrent_pages == 4
    assert config.async_requests_per_second == 8.0


def test_config_model_params_custom_values():
    """Test that model API parameters can be customized."""
    config = ExtractorConfig(
        max_completion_tokens=2000,
        temperature=0.7,
        top_p=0.9,
        presence_penalty=0.5,
        frequency_penalty=0.5,
        max_concurrent_pages=8,
        async_requests_per_second=12.5,
    )
    config.validate()  # Should not raise

    assert config.max_completion_tokens == 2000
    assert config.temperature == 0.7
    assert config.top_p == 0.9
    assert config.presence_penalty == 0.5
    assert config.frequency_penalty == 0.5
    assert config.max_concurrent_pages == 8
    assert config.async_requests_per_second == 12.5

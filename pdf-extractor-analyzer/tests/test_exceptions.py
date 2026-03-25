"""Tests for the exceptions module.

This module tests that the exceptions module properly imports and that
all exception types are correctly defined with type annotations.
"""
from __future__ import annotations

from pdf_extractor_analyzer.exceptions import (
    AnalysisError,
    CacheError,
    ConversionError,
    PDFExtractorError,
    SchemaValidationError,
    ValidationError,
)


def test_all_exceptions_importable():
    """Test that all exception types can be imported."""
    assert PDFExtractorError is not None
    assert CacheError is not None
    assert ConversionError is not None
    assert AnalysisError is not None
    assert SchemaValidationError is not None
    assert ValidationError is not None


def test_exception_hierarchy():
    """Test that exceptions follow proper inheritance hierarchy."""
    # All exceptions should derive from PDFExtractorError
    assert issubclass(CacheError, PDFExtractorError)
    assert issubclass(ConversionError, PDFExtractorError)
    assert issubclass(AnalysisError, PDFExtractorError)
    assert issubclass(SchemaValidationError, PDFExtractorError)
    assert issubclass(ValidationError, PDFExtractorError)


def test_validation_error_with_field_and_value():
    """Test that ValidationError properly stores field and value."""
    error = ValidationError("Test error message", field="test_field", value="test_value")

    assert str(error) == "Test error message"
    assert error.field == "test_field"
    assert error.value == "test_value"


def test_validation_error_without_field_and_value():
    """Test that ValidationError works without optional field and value."""
    error = ValidationError("Simple error message")

    assert str(error) == "Simple error message"
    assert error.field is None
    assert error.value is None


def test_validation_error_with_none_values():
    """Test ValidationError with explicit None values."""
    error = ValidationError("Error with None", field=None, value=None)

    assert error.field is None
    assert error.value is None


def test_validation_error_with_complex_types():
    """Test ValidationError with complex value types (list, dict)."""
    error_list = ValidationError("List value error", field="items", value=[1, 2, 3])
    assert error_list.value == [1, 2, 3]

    error_dict = ValidationError("Dict value error", field="data", value={"key": "val"})
    assert error_dict.value == {"key": "val"}


def test_other_exceptions_can_be_raised():
    """Test that other exceptions can be instantiated."""
    assert CacheError("cache error") is not None
    assert ConversionError("conversion error") is not None
    assert AnalysisError("analysis error") is not None
    assert SchemaValidationError("schema validation error") is not None

class PDFExtractorError(Exception):
    """Base exception for the package."""


class CacheError(PDFExtractorError):
    """Raised when cache operations fail."""


class ConversionError(PDFExtractorError):
    """Raised when PDF conversion fails."""


class AnalysisError(PDFExtractorError):
    """Raised when model analysis fails."""


class SchemaValidationError(PDFExtractorError):
    """Raised when structured output cannot be validated."""

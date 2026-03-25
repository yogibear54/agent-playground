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


class ValidationError(PDFExtractorError):
    """Raised when input validation fails.

    This includes:
    - Invalid PDF paths (path traversal, non-existent files)
    - Invalid file formats (non-PDF files)
    - Image size limits exceeded
    - Payload size limits exceeded
    """

    def __init__(self, message: str, *, field: str | None = None, value: object = None) -> None:
        super().__init__(message)
        self.field = field
        self.value = value

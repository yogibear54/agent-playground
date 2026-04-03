from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ExtractionMode(str, Enum):
    FULL_TEXT = "full_text"
    STRUCTURED = "structured"
    SUMMARY = "summary"
    MARKDOWN = "markdown"
    PROMPT = "prompt"


class ExtractionResult(BaseModel):
    extraction_mode: ExtractionMode
    content: str | dict[str, Any]
    metadata: dict[str, Any] = Field(default_factory=dict)


class BatchItemStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"


class BatchExtractionItem(BaseModel):
    pdf_path: str
    status: BatchItemStatus
    result: ExtractionResult | None = None
    error: str | None = None

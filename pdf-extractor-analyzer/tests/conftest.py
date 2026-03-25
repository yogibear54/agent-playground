from __future__ import annotations

import os
from pathlib import Path

import fitz
import pytest


@pytest.fixture(autouse=True)
def change_to_tmp_path(tmp_path: Path, monkeypatch):
    """Change to tmp_path for all tests so path validation works correctly."""
    monkeypatch.chdir(tmp_path)


@pytest.fixture
def make_pdf(tmp_path: Path):
    def _make_pdf(name: str, pages: int = 1, text_prefix: str = "Page") -> Path:
        path = tmp_path / name
        doc = fitz.open()
        for idx in range(1, pages + 1):
            page = doc.new_page()
            page.insert_text((72, 72), f"{text_prefix} {idx}")
        doc.save(path)
        doc.close()
        return path

    return _make_pdf

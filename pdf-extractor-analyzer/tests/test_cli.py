import json

import pytest
from pydantic import BaseModel

from pdf_extractor_analyzer import cli
from pdf_extractor_analyzer.schemas import (
    BatchExtractionItem,
    BatchItemStatus,
    ExtractionMode,
    ExtractionResult,
)


class DummySchema(BaseModel):
    value: str


class FakeExtractor:
    def __init__(self, config):
        self.config = config

    def extract(self, pdf_path, *, mode, schema=None):
        return ExtractionResult(
            extraction_mode=mode,
            content=f"single:{pdf_path}",
            metadata={"ok": True},
        )

    def extract_many(self, pdf_paths, *, mode, schema=None, max_workers=4, continue_on_error=True):
        return [
            BatchExtractionItem(
                pdf_path=str(path),
                status=BatchItemStatus.SUCCESS,
                result=ExtractionResult(extraction_mode=mode, content=f"multi:{path}", metadata={}),
            )
            for path in pdf_paths
        ]


def test_cli_single_output(monkeypatch, capsys):
    monkeypatch.setattr(cli, "PDFExtractor", FakeExtractor)
    code = cli.main(["/tmp/a.pdf", "--mode", "summary"])
    assert code == 0

    payload = json.loads(capsys.readouterr().out)
    assert payload["extraction_mode"] == ExtractionMode.SUMMARY.value
    assert payload["content"] == "single:/tmp/a.pdf"


def test_cli_batch_output(monkeypatch, capsys):
    monkeypatch.setattr(cli, "PDFExtractor", FakeExtractor)
    code = cli.main(["/tmp/a.pdf", "/tmp/b.pdf", "--mode", "full_text"])
    assert code == 0

    payload = json.loads(capsys.readouterr().out)
    assert isinstance(payload, list)
    assert len(payload) == 2
    assert payload[0]["status"] == BatchItemStatus.SUCCESS.value


def test_cli_structured_requires_schema_import(monkeypatch):
    monkeypatch.setattr(cli, "PDFExtractor", FakeExtractor)
    with pytest.raises(SystemExit):
        cli.main(["/tmp/a.pdf", "--mode", "structured"])


def test_cli_structured_with_schema_import(monkeypatch, capsys):
    monkeypatch.setattr(cli, "PDFExtractor", FakeExtractor)
    monkeypatch.setattr(cli, "_schema_from_import", lambda _: DummySchema)

    code = cli.main(
        ["/tmp/a.pdf", "--mode", "structured", "--schema-import", "x.y:DummySchema"]
    )
    assert code == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["extraction_mode"] == ExtractionMode.STRUCTURED.value

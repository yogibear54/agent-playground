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
    last_config = None

    def __init__(self, config):
        self.config = config
        FakeExtractor.last_config = config

    def extract(self, pdf_path, *, mode, schema=None, prompt=None):
        return ExtractionResult(
            extraction_mode=mode,
            content=f"single:{pdf_path}",
            metadata={"ok": True},
        )

    async def extract_async(self, pdf_path, *, mode, schema=None, prompt=None):
        return self.extract(pdf_path, mode=mode, schema=schema, prompt=prompt)

    def extract_many(self, pdf_paths, *, mode, schema=None, prompt=None, max_workers=4, continue_on_error=True):
        return [
            BatchExtractionItem(
                pdf_path=str(path),
                status=BatchItemStatus.SUCCESS,
                result=ExtractionResult(extraction_mode=mode, content=f"multi:{path}", metadata={}),
            )
            for path in pdf_paths
        ]

    async def extract_many_async(self, pdf_paths, *, mode, schema=None, prompt=None, max_workers=4, continue_on_error=True):
        return self.extract_many(
            pdf_paths,
            mode=mode,
            schema=schema,
            prompt=prompt,
            max_workers=max_workers,
            continue_on_error=continue_on_error,
        )


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


def test_cli_async_single_output(monkeypatch, capsys):
    monkeypatch.setattr(cli, "PDFExtractor", FakeExtractor)
    code = cli.main(["/tmp/a.pdf", "--mode", "summary", "--async"])
    assert code == 0

    payload = json.loads(capsys.readouterr().out)
    assert payload["content"] == "single:/tmp/a.pdf"


def test_cli_async_batch_output(monkeypatch, capsys):
    monkeypatch.setattr(cli, "PDFExtractor", FakeExtractor)
    code = cli.main(["/tmp/a.pdf", "/tmp/b.pdf", "--mode", "full_text", "--async"])
    assert code == 0

    payload = json.loads(capsys.readouterr().out)
    assert isinstance(payload, list)
    assert len(payload) == 2


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


class FailingExtractor:
    """Extractor that raises exceptions for testing error handling."""

    def __init__(self, config):
        self.config = config

    def extract(self, pdf_path, *, mode, schema=None, prompt=None):
        raise RuntimeError("Simulated extraction failure")


def test_cli_returns_exit_code_1_on_unexpected_error(monkeypatch, capsys):
    """Test that unexpected exceptions return exit code 1."""
    monkeypatch.setattr(cli, "PDFExtractor", FailingExtractor)

    code = cli.main(["/tmp/a.pdf", "--mode", "summary"])

    assert code == 1
    captured = capsys.readouterr()
    assert "Simulated extraction failure" in captured.err


def test_cli_returns_exit_code_2_on_validation_error(monkeypatch, capsys):
    """Test that ValueError returns exit code 2 for validation errors."""

    class RaisingExtractor:
        def __init__(self, config):
            config.validate()  # This will raise if validation fails

        def extract(self, pdf_path, *, mode, schema=None, prompt=None):
            raise ValueError("Invalid configuration")

    monkeypatch.setattr(cli, "PDFExtractor", RaisingExtractor)

    # This will fail validation (dpi=0 is invalid)
    code = cli.main(["/tmp/a.pdf", "--mode", "summary", "--dpi", "0"])

    assert code == 2
    captured = capsys.readouterr()
    assert "Error:" in captured.err


def test_cli_returns_exit_code_130_on_keyboard_interrupt(monkeypatch, capsys):
    """Test that KeyboardInterrupt returns exit code 130."""

    class InterruptExtractor:
        def __init__(self, config):
            self.config = config

        def extract(self, pdf_path, *, mode, schema=None, prompt=None):
            raise KeyboardInterrupt()

    monkeypatch.setattr(cli, "PDFExtractor", InterruptExtractor)

    code = cli.main(["/tmp/a.pdf", "--mode", "summary"])

    assert code == 130
    captured = capsys.readouterr()
    assert captured.err == ""  # No error message on SIGINT


def test_cli_successful_extraction_returns_0(monkeypatch, capsys):
    """Test that successful extraction returns exit code 0."""
    monkeypatch.setattr(cli, "PDFExtractor", FakeExtractor)

    code = cli.main(["/tmp/a.pdf", "--mode", "summary"])

    assert code == 0


def test_cli_provider_and_openrouter_flags_map_to_config(monkeypatch, capsys):
    monkeypatch.setattr(cli, "PDFExtractor", FakeExtractor)

    code = cli.main(
        [
            "/tmp/a.pdf",
            "--mode",
            "summary",
            "--provider",
            "openrouter",
            "--openrouter-api-key",
            "key-123",
            "--openrouter-base-url",
            "https://example.com/or",
            "--model",
            "openrouter/auto",
        ]
    )

    assert code == 0
    cfg = FakeExtractor.last_config
    assert cfg is not None
    assert cfg.provider == "openrouter"
    assert cfg.openrouter.api_key == "key-123"
    assert cfg.openrouter.base_url == "https://example.com/or"
    assert cfg.model == "openrouter/auto"


def test_cli_openrouter_omitted_model_uses_openrouter_default_primary(monkeypatch, capsys):
    """Omitting --model with --provider openrouter must not inject replicate's gpt-4o default."""
    from pdf_extractor_analyzer.config import ExtractorConfig

    monkeypatch.setattr(cli, "PDFExtractor", FakeExtractor)

    code = cli.main(
        [
            "/tmp/a.pdf",
            "--mode",
            "summary",
            "--provider",
            "openrouter",
            "--openrouter-api-key",
            "key-123",
        ]
    )

    assert code == 0
    cfg = FakeExtractor.last_config
    assert cfg is not None
    assert cfg.model == ExtractorConfig.LEGACY_DEFAULT_MODEL
    assert cfg.get_primary_model() == ExtractorConfig.OPENROUTER_DEFAULT_MODEL


def test_cli_replicate_omitted_model_keeps_historical_gpt4o_default(monkeypatch, capsys):
    monkeypatch.setattr(cli, "PDFExtractor", FakeExtractor)

    code = cli.main(["/tmp/a.pdf", "--mode", "summary"])

    assert code == 0
    cfg = FakeExtractor.last_config
    assert cfg is not None
    assert cfg.provider == "replicate"
    assert cfg.model == "openai/gpt-4o"
    assert cfg.get_primary_model() == "openai/gpt-4o"


def test_cli_legacy_replicate_flags_still_work(monkeypatch, capsys):
    monkeypatch.setattr(cli, "PDFExtractor", FakeExtractor)

    code = cli.main(
        [
            "/tmp/a.pdf",
            "--mode",
            "summary",
            "--max-concurrent-replicate-calls",
            "3",
            "--replicate-api-token",
            "rep-token",
        ]
    )

    assert code == 0
    cfg = FakeExtractor.last_config
    assert cfg is not None
    assert cfg.max_concurrent_replicate_calls == 3
    assert cfg.replicate.max_concurrent_calls == 3
    assert cfg.replicate_api_token == "rep-token"
    assert cfg.replicate.api_token == "rep-token"


def test_cli_prompt_mode_requires_prompt(monkeypatch):
    """Test that prompt mode requires --prompt argument."""
    monkeypatch.setattr(cli, "PDFExtractor", FakeExtractor)
    
    with pytest.raises(SystemExit) as exc_info:
        cli.main(["/tmp/a.pdf", "--mode", "prompt"])
    assert exc_info.value.code == 2  # Validation error


def test_cli_prompt_mode_with_prompt(monkeypatch, capsys):
    """Test that prompt mode works with --prompt argument."""
    monkeypatch.setattr(cli, "PDFExtractor", FakeExtractor)
    
    code = cli.main([
        "/tmp/a.pdf",
        "--mode", "prompt",
        "--prompt", "Extract all dates from this document"
    ])
    assert code == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["extraction_mode"] == ExtractionMode.PROMPT.value

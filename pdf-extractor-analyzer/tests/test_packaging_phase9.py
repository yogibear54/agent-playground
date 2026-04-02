from __future__ import annotations

from pathlib import Path
import tomllib


def _pyproject_path() -> Path:
    return Path(__file__).resolve().parent.parent / "pyproject.toml"


def test_pyproject_uses_optional_provider_dependencies():
    pyproject = _pyproject_path()
    data = tomllib.loads(pyproject.read_text(encoding="utf-8"))

    dependencies = data["project"]["dependencies"]
    optional = data["project"]["optional-dependencies"]

    assert all("replicate" not in dep for dep in dependencies)
    assert "replicate" in optional
    assert any("replicate" in dep for dep in optional["replicate"])


def test_pyproject_contains_openrouter_optional_group():
    pyproject = _pyproject_path()
    data = tomllib.loads(pyproject.read_text(encoding="utf-8"))

    optional = data["project"]["optional-dependencies"]
    assert "openrouter" in optional

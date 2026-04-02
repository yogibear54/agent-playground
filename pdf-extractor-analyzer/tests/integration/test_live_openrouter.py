from __future__ import annotations

import os

import pytest


@pytest.mark.live_openrouter
def test_live_openrouter_summary_placeholder():
    """Placeholder for future OpenRouter live integration.

    This keeps live integrations split by provider marker as the architecture
    evolves. A full OpenRouter live test will be enabled once the OpenRouter
    adapter is implemented.
    """
    if os.getenv("PDF_EXTRACTOR_LIVE_TEST") != "1":
        pytest.skip("Set PDF_EXTRACTOR_LIVE_TEST=1 to run live OpenRouter integration test")
    if not os.getenv("OPENROUTER_API_KEY"):
        pytest.skip("Set OPENROUTER_API_KEY to run live OpenRouter integration test")

    pytest.skip("OpenRouter live integration test pending OpenRouter adapter implementation")

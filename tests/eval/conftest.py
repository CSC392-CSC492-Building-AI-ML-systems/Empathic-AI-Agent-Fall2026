import pytest

from backend.src.eval.mock import MockLLMClient

LLM_ENV_VARS = ["PROVIDER", "MODEL", "LLM_API_KEY", "LLM_BASE_URL"]


@pytest.fixture(autouse=True)
def clean_llm_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep anything set in your shell from leaking into the tests"""
    for name in LLM_ENV_VARS:
        monkeypatch.delenv(name, raising=False)


@pytest.fixture
def mock_llm() -> MockLLMClient:
    """A fake LLM client with no replies yet; add some with add_replies()"""
    return MockLLMClient()

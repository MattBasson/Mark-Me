from langchain_anthropic import ChatAnthropic
from apps.api.config import settings


def build_llm(streaming: bool = True) -> ChatAnthropic:
    return ChatAnthropic(
        model="claude-sonnet-4-6",
        api_key=settings.anthropic_api_key,
        streaming=streaming,
    )

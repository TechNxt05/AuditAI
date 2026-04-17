class BaseModelProvider:
    def generate_response(self, prompt: str, system_prompt: str = None) -> str:
        raise NotImplementedError("Must implement generate_response")

    def get_embeddings(self, text: list[str]) -> list[list[float]]:
        raise NotImplementedError("Must implement get_embeddings")


class OpenAIProvider(BaseModelProvider):
    def generate_response(self, prompt: str, system_prompt: str = None) -> str:
        return "Mock response from OpenAI Provider."

    def get_embeddings(self, text: list[str]) -> list[list[float]]:
        return [[0.0] * 384 for _ in text]


class ClaudeProvider(BaseModelProvider):
    def generate_response(self, prompt: str, system_prompt: str = None) -> str:
        return "Mock response from Claude Provider."

    def get_embeddings(self, text: list[str]) -> list[list[float]]:
        return [[0.0] * 384 for _ in text]


class GeminiProvider(BaseModelProvider):
    def generate_response(self, prompt: str, system_prompt: str = None) -> str:
        return "Mock response from Gemini Provider."

    def get_embeddings(self, text: list[str]) -> list[list[float]]:
        return [[0.0] * 384 for _ in text]


class LocalLLMProvider(BaseModelProvider):
    def generate_response(self, prompt: str, system_prompt: str = None) -> str:
        return "Mock response from Local LLM Provider."

    def get_embeddings(self, text: list[str]) -> list[list[float]]:
        return [[0.0] * 384 for _ in text]


def get_provider(model_name: str) -> BaseModelProvider:
    """Factory to get the right provider."""
    if not model_name:
        return LocalLLMProvider()
        
    model = model_name.lower()
    if "gpt" in model:
        return OpenAIProvider()
    elif "claude" in model:
        return ClaudeProvider()
    elif "gemini" in model:
        return GeminiProvider()
    else:
        return LocalLLMProvider()

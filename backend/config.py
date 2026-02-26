from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = ""  # Required: set via environment variable
    REDIS_URL: Optional[str] = None
    SECRET_KEY: str = ""  # Required: set via environment variable
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    OPENAI_KEY: Optional[str] = None
    GEMINI_KEY: Optional[str] = None

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Quotas
    FREE_TIER_EXECUTIONS: int = 100
    PRO_TIER_EXECUTIONS: int = 10000
    ENTERPRISE_TIER_EXECUTIONS: int = 1000000

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    REPO_PATH: str = "."
    BASE_BRANCH: str = "main"
    REMOTE_NAME: str = "origin"
    COMMIT_PREFIX: str = "fix:"
    MAX_RETRIES: int = 3

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

config = Settings()

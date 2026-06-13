from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    # Campos que Pydantic leerá automáticamente de tu archivo .env o variables de entorno de Render
    secret_key: str
    admin_default_password: str
    allowed_origins: str 
    database_url: str  
    
    model_config = SettingsConfigDict(env_file=".env")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]

settings = Settings()
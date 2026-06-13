from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    secret_key: str
    admin_default_password: str
    allowed_origins: str 
    database_url: str  
    
    model_config = SettingsConfigDict(env_file=".env")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]

settings = Settings()

# ================= CONSTANTES DE APLICACIÓN =================
MAX_EXCEL_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_EXCEL_MIME_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel"
}
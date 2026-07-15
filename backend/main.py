from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
import logging

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import settings
from database import engine, Base, SessionLocal
from models import UserModel
from security import hash_password

# ================= IMPORTACIÓN DE MÓDULOS (ROUTERS) =================
from routers import auth, geography, inventory, cabezales, microondas

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Inicialización de Base de Datos y Auto-Migraciones
Base.metadata.create_all(bind=engine)

# Parche automático para usuarios
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE sys_usuarios ADD COLUMN must_change_password INTEGER DEFAULT 1"))
        conn.commit()
except Exception:
    pass

# === SOLUCIÓN: PARCHE AUTOMÁTICO PARA MICROONDAS ===
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE inventario_microondas_ubq ADD COLUMN ap_id INTEGER REFERENCES inventario_microondas_ap(id) ON DELETE SET NULL"))
        conn.commit()
except Exception:
    pass
# ===================================================

try:
    db_init = SessionLocal()
    if db_init.query(UserModel).count() == 0:
        db_init.add(UserModel(username="admin", password_hash=hash_password(settings.admin_default_password), role="ADMIN", plazas="*", pestanas="*", nombre_completo="Administrador", must_change_password=0))
        db_init.commit()
    db_init.close()
except Exception: pass

# Instancia FastAPI
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="MT_DB Enterprise API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware, 
    allow_origins=settings.cors_origins_list,
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# ================= CONEXIÓN DE ROUTERS AL SERVIDOR =================
app.include_router(auth.router)
app.include_router(geography.router)
app.include_router(inventory.router)
app.include_router(cabezales.router)
app.include_router(microondas.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
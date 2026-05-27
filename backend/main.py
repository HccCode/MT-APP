from fastapi import FastAPI, Query, Request, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import bcrypt
import pandas as pd
import io
import os

# ================= CONFIGURACIÓN DE ENTORNO =================
class Settings(BaseSettings):
    secret_key: str
    admin_default_password: str
    allowed_origins: str 
    
    model_config = SettingsConfigDict(env_file=".env")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]

settings = Settings()

# ================= CONFIGURACIÓN DE BASE DE DATOS =================
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mt_db_xzmz_user:JH0jb1qWIb045Fglcs5UC4Cv9ZyEFYIb@dpg-d8asns1kh4rs73fk30hg-a/mt_db_xzmz")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ================= SEGURIDAD Y JWT =================
SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try: 
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception: 
        return False

# ================= MODELOS DE BASE DE DATOS =================
class RegionModel(Base):
    __tablename__ = "regiones"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)

class CityModel(Base):
    __tablename__ = "ciudades"
    id = Column(String(20), primary_key=True, index=True)  
    nombre = Column(String(100), nullable=False)
    region_id = Column(Integer, ForeignKey("regiones.id", ondelete="CASCADE"), nullable=False)

class HubMappingModel(Base):
    __tablename__ = "hubs_config"
    id = Column(String(50), primary_key=True, index=True) 
    nombre = Column(String(100), nullable=False)
    ciudad_id = Column(String(20), ForeignKey("ciudades.id", ondelete="CASCADE"), nullable=False)  
    direccion = Column(Text, nullable=True)
    coordenadas = Column(String(100), nullable=True)

class UserModel(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="RNOC")
    plazas = Column(String(500), default="*")
    nombre_completo = Column(String(150), nullable=False)
    
    num_empleado = Column(String(50), nullable=True)
    correo = Column(String(100), nullable=True)
    area_org = Column(String(100), nullable=True)
    region_asignacion = Column(String(100), nullable=True)
    puesto = Column(String(100), nullable=True)

class PortModel(Base):
    __tablename__ = "inventario_puertos"
    id = Column(Integer, primary_key=True, index=True)
    region = Column(String(50), index=True)
    ciudad = Column(String(50), index=True)
    hub_id = Column(String(50), index=True, nullable=False)
    
    estatus = Column(String(50))
    puerto = Column(String(100), nullable=False)
    equipo_hotel_id = Column(String(100))
    ip_hub = Column(String(50))
    nombre_corto = Column(String(100))
    id_mca = Column(String(100))
    servicio = Column(String(100))
    potencia_hub = Column(String(50))
    potencia_cpe = Column(String(50))
    tipo_servicio = Column(String(100))
    mbps = Column(String(50))
    ip_gestion = Column(String(50))
    ip_cliente = Column(String(50))
    bdi = Column(String(100))
    ruta = Column(Text)
    buffer = Column(String(50))
    hilos = Column(String(50))
    parcheo = Column(String(100))
    lambdas = Column(String(50))
    distancia_cliente = Column(String(50))
    marca_cpe = Column(String(100))
    modelo_cpe = Column(String(100))
    serie_cpe = Column(String(100))
    fecha_entrega = Column(String(100))
    serie_sfp_hub = Column(String(100))
    serie_sfp_client = Column(String(100))
    equipamiento = Column(String(150))
    serie = Column(String(100))
    direccion = Column(Text, nullable=True)  
    coordenadas = Column(String(100), nullable=True)  
    comentarios = Column(Text)
    contacto_nombre = Column(String(150), nullable=True)
    contacto_telefono = Column(String(50), nullable=True)

# ================= MODELOS NUEVOS: CABEZALES =================
class CabezalModel(Base):
    __tablename__ = "cabezales"
    id = Column(Integer, primary_key=True, index=True)
    id_equipo = Column(String(50), index=True, nullable=False)
    ciudad = Column(String(50), index=True, nullable=False)
    servicio = Column(String(100), index=True)
    gestion_qam = Column(String(100))
    marca = Column(String(100))
    modelo = Column(String(100))
    serie = Column(String(100))

class AlineacionCabezalModel(Base):
    __tablename__ = "cabezales_alineacion"
    id = Column(Integer, primary_key=True, index=True)
    cabezal_id = Column(Integer, ForeignKey("cabezales.id", ondelete="CASCADE"), nullable=False)
    portadora = Column(String(50))
    formato = Column(String(50))
    canal_num = Column(String(50))
    nombre_canal = Column(String(100))
    mcast_ip = Column(String(50))
    source_ip = Column(String(50))
    udp = Column(String(50))
    sid = Column(String(50))

# Crea las tablas
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(status_code=401, detail="Token inválido o vencido")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None: raise credentials_exception
    except JWTError: raise credentials_exception
    user = db.query(UserModel).filter(UserModel.username == username).first()
    if user is None: raise credentials_exception
    return user

def is_admin(user: UserModel):
    return user.username.lower() == "admin" or str(user.role).strip().upper() == "ADMIN"

def can_edit_ports(user: UserModel):
    return is_admin(user) or str(user.role).strip().upper() in ["MCM NOC", "MCM INGENIERIA"]

def can_upload_excel(user: UserModel):
    return is_admin(user) or str(user.role).strip().upper() == "MCM INGENIERIA"

# ================= ESQUEMAS PYDANTIC (Resto del código omitido para brevedad) =================
class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    password: str
    role: str
    nombre_completo: str
    plazas: str = "*"
    num_empleado: str = None
    correo: str = None
    area_org: str = None
    region_asignacion: str = None
    puesto: str = None

class UserUpdate(BaseModel):
    username: str = None
    password: str = None
    role: str = None
    nombre_completo: str = None
    plazas: str = None
    num_empleado: str = None
    correo: str = None
    area_org: str = None
    region_asignacion: str = None
    puesto: str = None

class GeographyRegionCreate(BaseModel):
    nombre: str

class GeographyCityCreate(BaseModel):
    id: str  
    nombre: str
    region_id: int

class GeographyHubCreate(BaseModel):
    id: str
    nombre: str
    ciudad_id: str  
    direccion: str = None
    coordenadas: str = None

class PortUpdate(BaseModel):
    ESTATUS: str = None
    # ... resto de atributos ... (Omitidos en esta respuesta para no sobrepasar el límite, pero mantén tus esquemas tal cual están)

try:
    db_init = SessionLocal()
    if db_init.query(UserModel).count() == 0:
        db_init.add(UserModel(
            username="admin", 
            password_hash=hash_password(settings.admin_default_password), 
            role="ADMIN", 
            plazas="*",
            nombre_completo="Administrador del Sistema"
        ))
        db_init.commit()
    db_init.close()
except Exception as e:
    print("Nota: El seed de administrador falló o no era necesario en este punto:", e)


app = FastAPI(title="MT_DB Enterprise API")

app.add_middleware(
    CORSMiddleware, 
    allow_origins=settings.cors_origins_list,
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# RUTAS DE AUTH Y USUARIOS
@app.post("/api/auth/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        return JSONResponse(status_code=400, content={"status": "error", "detail": "Credenciales inválidas"})
    access_token = jwt.encode({"sub": user.username, "role": user.role, "plazas": user.plazas, "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"status": "success", "token": access_token, "user": {"username": user.username, "role": user.role, "plazas": user.plazas,"nombre_completo": user.nombre_completo}}

# (MANTEN TUS RUTAS de Usuarios, Geografía y Puertos aquí) ...

# ================= RUTAS PARA CABEZALES =================
@app.get("/api/cabezales")
def get_cabezales(ciudad: str = None, id_equipo: str = None, db: Session = Depends(get_db)):
    query = db.query(CabezalModel)
    if ciudad:
        query = query.filter(CabezalModel.ciudad.ilike(f"%{ciudad}%"))
    if id_equipo:
        query = query.filter(CabezalModel.id_equipo.ilike(f"%{id_equipo}%"))
    
    cabezales = query.all()
    return {"status": "success", "data": cabezales}

@app.get("/api/cabezales/{cabezal_id}/alineacion")
def get_alineacion(cabezal_id: int, db: Session = Depends(get_db)):
    alineaciones = db.query(AlineacionCabezalModel).filter(AlineacionCabezalModel.cabezal_id == cabezal_id).all()
    return {"status": "success", "data": alineaciones}

MAX_EXCEL_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_EXCEL_MIME_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel"
}

@app.post("/api/cabezales/upload-excel")
def upload_cabezales_excel(
    id_equipo: str = Query(...), 
    servicio: str = Query(...), 
    ciudad: str = Query("Ciudad General"),
    file: UploadFile = File(...), 
    current_user: UserModel = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if not can_upload_excel(current_user): 
        raise HTTPException(status_code=403, detail="Permisos insuficientes")
        
    is_valid_mime = file.content_type in ALLOWED_EXCEL_MIME_TYPES
    is_valid_ext = file.filename.lower().endswith(('.xlsx', '.xls'))
    
    if not (is_valid_mime or is_valid_ext):
        return JSONResponse(status_code=400, content={"status": "error", "detail": "El archivo debe ser un Excel válido."})
        
    try:
        contents = file.file.read()
        if len(contents) > MAX_EXCEL_FILE_SIZE:
            return JSONResponse(status_code=400, content={"status": "error", "detail": "El archivo supera 5MB."})
            
        df = pd.read_excel(io.BytesIO(contents)).fillna("")
        column_headers = [str(col).upper().strip() for col in df.columns]

        # 1. Buscar o Crear Cabezal por ID y SERVICIO
        cabezal = db.query(CabezalModel).filter(
            CabezalModel.id_equipo == id_equipo,
            CabezalModel.servicio == servicio
        ).first()

        if not cabezal:
            cabezal = CabezalModel(id_equipo=id_equipo, servicio=servicio, ciudad=ciudad)
            db.add(cabezal)
            db.commit()
            db.refresh(cabezal)
        else:
            cabezal.ciudad = ciudad
            db.commit()

        # Limpiamos alineación anterior de este cabezal
        db.query(AlineacionCabezalModel).filter(AlineacionCabezalModel.cabezal_id == cabezal.id).delete()
        
        def get_index(targets):
            for t in targets:
                if t in column_headers: return column_headers.index(t)
            return -1

        idx_portadora = get_index(["PORTADORA"])
        idx_formato = get_index(["FORMATO"])
        idx_canal = get_index(["# CANAL", "CANAL NUM"])
        idx_nombre = get_index(["NOMBRE DE CANAL", "NOMBRE CANAL"])
        idx_mcast = get_index(["MCAST IP", "MCAST_IP"])
        idx_source = get_index(["SOURCE IP", "SOURCE_IP"])
        idx_udp = get_index(["UDP"])
        idx_sid = get_index(["SID"])

        for _, row in df.iterrows():
            vals = list(row.values)
            def read_val(idx):
                return str(vals[idx]).strip() if idx != -1 and idx < len(vals) else ""
            
            db.add(AlineacionCabezalModel(
                cabezal_id=cabezal.id,
                portadora=read_val(idx_portadora),
                formato=read_val(idx_formato),
                canal_num=read_val(idx_canal),
                nombre_canal=read_val(idx_nombre),
                mcast_ip=read_val(idx_mcast),
                source_ip=read_val(idx_source),
                udp=read_val(idx_udp),
                sid=read_val(idx_sid)
            ))
            
        db.commit()
        return {"status": "success", "detail": "Cabezal y Alineación cargados exitosamente."}
    except Exception as e: 
        db.rollback()
        return JSONResponse(status_code=500, content={"status": "error", "detail": f"Fallo en importación: {str(e)}"})
    finally:
        file.file.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
from fastapi import FastAPI, Query, Request, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, Boolean, text
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
import logging

# IMPORTS DE SEGURIDAD (RATE LIMITING)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# IMPORTS PARA EXCEL AVANZADO
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.chart import PieChart, Reference
from openpyxl.chart.label import DataLabelList

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

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

DATABASE_URL = settings.database_url
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

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

# ================= MODELOS DE BD =================
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
    __tablename__ = "sys_usuarios"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    must_change_password = Column(Boolean, default=True) # <-- ESTA ES LA COLUMNA CRITICA
    role = Column(String(50), default="LECTURA")
    plazas = Column(String(500), default="*")
    pestanas = Column(String(500), default="*") 
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

class CabezalModel(Base):
    __tablename__ = "inventario_cabezales"
    id = Column(Integer, primary_key=True, index=True)
    id_equipo = Column(String(50), index=True, nullable=False)
    ciudad = Column(String(50), index=True, nullable=False)
    servicio = Column(String(100), index=True, nullable=False)
    gestion_qam = Column(String(100), nullable=True)
    marca = Column(String(100), nullable=True)
    modelo = Column(String(100), nullable=True)
    serie = Column(String(100), nullable=True)

class AlineacionCabezalModel(Base):
    __tablename__ = "inventario_alineacion_cabezales"
    id = Column(Integer, primary_key=True, index=True)
    cabezal_id = Column(Integer, ForeignKey("inventario_cabezales.id", ondelete="CASCADE"), nullable=False)
    portadora = Column(String(50), nullable=True)
    formato = Column(String(50), nullable=True)
    canal_num = Column(String(50), nullable=True)
    nombre_canal = Column(String(100), nullable=True)
    mcast_ip = Column(String(50), nullable=True)
    source_ip = Column(String(50), nullable=True)
    udp = Column(String(50), nullable=True)
    sid = Column(String(50), nullable=True)

class ConfigCiudadModel(Base):
    __tablename__ = "config_ciudades"
    ciudad_nombre = Column(String(100), primary_key=True, index=True)
    ancho_banda_total = Column(String(50), nullable=True)

class AuditLogModel(Base):
    __tablename__ = "sys_audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    usuario = Column(String(50), index=True)
    accion = Column(String(100))
    modulo = Column(String(100))
    detalle = Column(Text)
    fecha = Column(String(50))

Base.metadata.create_all(bind=engine)

# Fuerza la existencia de la columna si no estaba
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE sys_usuarios ADD COLUMN must_change_password BOOLEAN DEFAULT 1"))
        conn.commit()
except Exception:
    pass

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def get_current_user(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Falta la cabecera de autorizacion")
    token = auth_header.replace("Bearer ", "").strip()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None: raise HTTPException(status_code=401)
    except JWTError: 
        raise HTTPException(status_code=401, detail="Token invalido")
        
    user = db.query(UserModel).filter(UserModel.username == username).first()
    if user is None: raise HTTPException(status_code=401)
    return user

def is_admin(user: UserModel):
    roles = [r.strip().upper() for r in str(user.role).split(",")]
    return user.username.lower() == "admin" or "ADMIN" in roles

def can_edit_ports(user: UserModel):
    if is_admin(user): return True
    roles = [r.strip().upper() for r in str(user.role).split(",")]
    return "ESCRITURA" in roles or any(r in roles for r in ["MCM NOC", "MCM INGENIERIA"])

def can_upload_excel(user: UserModel):
    if is_admin(user): return True
    roles = [r.strip().upper() for r in str(user.role).split(",")]
    return "CARGA" in roles or "MCM INGENIERIA" in roles

def registrar_auditoria(db: Session, usuario: str, accion: str, modulo: str, detalle: str):
    try:
        ahora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log = AuditLogModel(usuario=usuario, accion=accion, modulo=modulo, detalle=detalle, fecha=ahora)
        db.add(log)
        db.commit()
    except Exception: pass

class UserLogin(BaseModel):
    username: str
    password: str

class PasswordChangeReq(BaseModel):
    new_password: str

class UserRegister(BaseModel):
    username: str
    password: str
    role: str
    nombre_completo: str
    plazas: str = "*"
    pestanas: str = "*"
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
    pestanas: str = None
    num_empleado: str = None
    correo: str = None
    area_org: str = None
    region_asignacion: str = None
    puesto: str = None

class GeographyRegionCreate(BaseModel): nombre: str
class GeographyCityCreate(BaseModel): id: str; nombre: str; region_id: int
class GeographyHubCreate(BaseModel): id: str; nombre: str; ciudad_id: str; direccion: str = None; coordenadas: str = None

class PortUpdate(BaseModel):
    ESTATUS: str = None; PUERTO: str = None; EQUIPO_HOTEL_ID: str = None; IP_HUB: str = None
    NOMBRE_CORTO: str = None; ID_MCA: str = None; SERVICIO: str = None; POTENCIA_HUB: str = None
    POTENCIA_CPE: str = None; TIPO_SERVICIO: str = None; MBPS: str = None; IP_GESTION: str = None
    IP_CLIENTE: str = None; BDI: str = None; RUTA: str = None; BUFFER: str = None; HILOS: str = None
    PARCHEO: str = None; LAMBDAS: str = None; DISTANCIA_CLIENTE: str = None; MARCA_CPE: str = None
    MODELO_CPE: str = None; SERIE_CPE: str = None; FECHA_DE_ENTREGA: str = None; SERIE_SFP_HUB: str = None
    SERIE_SFP_CLIENTE: str = None; EQUIPAMIENTO: str = None; SERIE: str = None; DIRECCION: str = None  
    COORDENADAS: str = None; COMENTARIOS: str = None; CONTACTO_NOMBRE: str = None; CONTACTO_TELEFONO: str = None

class PortBulkUpdate(BaseModel): port_ids: List[int]; updates: PortUpdate

class CabezalUpdate(BaseModel):
    id_equipo: str = None; ciudad: str = None; servicio: str = None; gestion_qam: str = None
    marca: str = None; modelo: str = None; serie: str = None

class AlineacionUpdate(BaseModel):
    portadora: str = None; formato: str = None; canal_num: str = None; nombre_canal: str = None
    mcast_ip: str = None; source_ip: str = None; udp: str = None; sid: str = None

class ConfigCiudadUpdate(BaseModel): ancho_banda_total: str
class HubStatItem(BaseModel): nombre: str; disp_gi: int; total_gi: int; disp_te: int; total_te: int; disp_25: int; total_25: int; disp_100: int; total_100: int; activos: int; suspendidos: int; troncales: int; total_disp: int; pct_libres: str; total: int
class ResumenExportReq(BaseModel): ciudad: str; capacidad_total: str; trafico_gbps: str; disponibilidad_pct: str; stats_activos: int; stats_suspendidos: int; stats_troncales: int; stats_total_disp: int; hubs: List[HubStatItem]

MAX_EXCEL_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_EXCEL_MIME_TYPES = {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"}

try:
    db_init = SessionLocal()
    if db_init.query(UserModel).count() == 0:
        db_init.add(UserModel(username="admin", password_hash=hash_password(settings.admin_default_password), role="ADMIN", plazas="*", pestanas="*", nombre_completo="Administrador", must_change_password=False))
        db_init.commit()
    db_init.close()
except Exception: pass

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="MT_DB Enterprise API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins_list, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ================= LOGIN Y CONTRASEÑAS =================
@app.post("/api/auth/login")
@limiter.limit("5/minute")
def login(request: Request, data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        return JSONResponse(status_code=400, content={"status": "error", "detail": "Credenciales inválidas"})
    
    access_token = jwt.encode({"sub": user.username, "role": user.role, "plazas": user.plazas, "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)}, SECRET_KEY, algorithm=ALGORITHM)
    
    # ASEGURAMOS EL BOOLEANO
    debe_cambiar = True if user.must_change_password else False
    
    return {
        "status": "success", 
        "token": access_token, 
        "user": {
            "username": user.username, 
            "role": user.role, 
            "plazas": user.plazas, 
            "pestanas": user.pestanas, 
            "nombre_completo": user.nombre_completo,
            "must_change_password": debe_cambiar
        }
    }

@app.post("/api/auth/change-password")
def change_password(data: PasswordChangeReq, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    current_user.password_hash = hash_password(data.new_password)
    current_user.must_change_password = False
    db.commit()
    return {"status": "success"}

@app.post("/api/auth/register")
def register(data: UserRegister, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    if db.query(UserModel).filter(UserModel.username == data.username.strip()).first(): raise HTTPException(status_code=400)
    db.add(UserModel(
        username=data.username.strip(), password_hash=hash_password(data.password), role=data.role, plazas=data.plazas, 
        pestanas=data.pestanas, nombre_completo=data.nombre_completo.strip(), num_empleado=data.num_empleado, 
        correo=data.correo, area_org=data.area_org, region_asignacion=data.region_asignacion, puesto=data.puesto,
        must_change_password=True # <-- SE FUERZA AL CREAR
    ))
    db.commit()
    return {"status": "success"}

@app.get("/api/users")
def list_all_users(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    return [{
        "id": u.id, "username": u.username, "role": u.role, "plazas": u.plazas, "pestanas": u.pestanas,
        "nombre_completo": u.nombre_completo,"num_empleado": u.num_empleado, "correo": u.correo, "area_org": u.area_org,
        "region_asignacion": u.region_asignacion, "puesto": u.puesto, "must_change_password": bool(u.must_change_password)
    } for u in db.query(UserModel).all()]

@app.put("/api/users/{user_id}")
def update_user_profile(user_id: int, data: UserUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user: raise HTTPException(status_code=404)
    
    if data.username: user.username = data.username.strip()
    if data.role: user.role = data.role
    if data.nombre_completo: user.nombre_completo = data.nombre_completo.strip()
    if data.plazas is not None: user.plazas = data.plazas
    if data.pestanas is not None: user.pestanas = data.pestanas
    if data.num_empleado is not None: user.num_empleado = data.num_empleado
    if data.correo is not None: user.correo = data.correo
    if data.area_org is not None: user.area_org = data.area_org
    if data.region_asignacion is not None: user.region_asignacion = data.region_asignacion
    if data.puesto is not None: user.puesto = data.puesto
    
    # <-- SE FUERZA AL EDITAR LA CONTRASEÑA
    if data.password and data.password.strip() != "": 
        user.password_hash = hash_password(data.password)
        user.must_change_password = True
        
    db.commit()
    return {"status": "success"}

@app.delete("/api/users/{user_id}")
def delete_user_profile(user_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user) or current_user.id == user_id: raise HTTPException(status_code=400)
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if user: db.delete(user)
    db.commit()
    return {"status": "success"}

# ================= RESTO DE LA API INTACTO =================
@app.get("/api/geography")
def get_geography_tree(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        ids_permitidos = None if is_admin(current_user) or current_user.plazas == "*" else [x.strip().upper() for x in current_user.plazas.split(",") if x.strip()]
        regiones = db.query(RegionModel).all()
        query_ciudades = db.query(CityModel)
        if ids_permitidos is not None: query_ciudades = query_ciudades.filter(CityModel.id.in_(ids_permitidos))
        ciudades = query_ciudades.all()
        ids_ciudades_filtradas = [c.id for c in ciudades]
        hubs = []
        if ids_ciudades_filtradas or ids_permitidos is None:
            query_hubs = db.query(HubMappingModel)
            if ids_permitidos is not None: query_hubs = query_hubs.filter(HubMappingModel.ciudad_id.in_(ids_ciudades_filtradas))
            hubs = query_hubs.all()
        hubs_por_ciudad = {}
        for h in hubs:
            if h.ciudad_id not in hubs_por_ciudad: hubs_por_ciudad[h.ciudad_id] = []
            hubs_por_ciudad[h.ciudad_id].append({"id": h.id, "nombre": h.nombre, "direccion": h.direccion, "coordenadas": h.coordenadas})
        ciudades_por_region = {}
        for c in ciudades:
            if c.region_id not in ciudades_por_region: ciudades_por_region[c.region_id] = []
            ciudades_por_region[c.region_id].append({"id": c.id, "nombre": c.nombre, "hubs": hubs_por_ciudad.get(c.id, [])})
        tree = {}
        for r in regiones:
            ciudades_region = ciudades_por_region.get(r.id, [])
            if ids_permitidos is not None and not ciudades_region: continue
            tree[r.nombre] = {"id": r.id, "ciudades": {c["nombre"]: {"id": c["id"], "hubs": c["hubs"]} for c in ciudades_region}}
        return tree
    except Exception as e: return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})

@app.post("/api/geography/regions")
def create_region(data: GeographyRegionCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    if db.query(RegionModel).filter(RegionModel.nombre.ilike(data.nombre.strip())).first(): raise HTTPException(status_code=400)
    nueva = RegionModel(nombre=data.nombre.strip()); db.add(nueva); db.commit()
    return {"status": "success", "id": nueva.id}

@app.put("/api/geography/regions/{region_id}")
def update_region(region_id: int, data: GeographyRegionCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    region = db.query(RegionModel).filter(RegionModel.id == region_id).first()
    if not region: raise HTTPException(status_code=404)
    region.nombre = data.nombre.strip(); db.commit()
    return {"status": "success"}

@app.delete("/api/geography/regions/{region_id}")
def delete_region(region_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    region = db.query(RegionModel).filter(RegionModel.id == region_id).first()
    if region:
        for c in db.query(CityModel).filter(CityModel.region_id == region_id).all():
            for h in db.query(HubMappingModel).filter(HubMappingModel.ciudad_id == c.id).all():
                db.query(PortModel).filter(PortModel.hub_id == h.id).delete()
            db.query(HubMappingModel).filter(HubMappingModel.ciudad_id == c.id).delete()
        db.query(CityModel).filter(CityModel.region_id == region_id).delete()
        db.delete(region); db.commit()
    return {"status": "success"}

@app.post("/api/geography/cities")
def create_city(data: GeographyCityCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    id_l, nom_l = data.id.upper().strip(), data.nombre.strip()
    if db.query(CityModel).filter(CityModel.id == id_l).first() or db.query(CityModel).filter(CityModel.nombre.ilike(nom_l)).first(): raise HTTPException(status_code=400)
    db.add(CityModel(id=id_l, nombre=nom_l, region_id=data.region_id)); db.commit()
    return {"status": "success"}

@app.put("/api/geography/cities/{city_id}")
def update_city(city_id: str, data: GeographyCityCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    ciudad = db.query(CityModel).filter(CityModel.id == city_id).first()
    if not ciudad: raise HTTPException(status_code=404)
    ciudad.nombre = data.nombre.strip(); ciudad.region_id = data.region_id; db.commit()
    return {"status": "success"}

@app.delete("/api/geography/cities/{city_id}")
def delete_city(city_id: str, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):  
    if not is_admin(current_user): raise HTTPException(status_code=403)
    ciudad = db.query(CityModel).filter(CityModel.id == city_id).first()
    if ciudad:
        for h in db.query(HubMappingModel).filter(HubMappingModel.ciudad_id == city_id).all():
            db.query(PortModel).filter(PortModel.hub_id == h.id).delete()
        db.delete(ciudad); db.commit()
    return {"status": "success"}

@app.post("/api/geography/hubs")
def assign_or_create_hub(data: GeographyHubCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    pestanas = [p.strip().lower() for p in str(current_user.pestanas).split(",")]
    if not is_admin(current_user) and "*" not in pestanas and "geografia" not in pestanas: raise HTTPException(status_code=403)
    id_nodo = data.id.upper().strip()
    hub = db.query(HubMappingModel).filter(HubMappingModel.id == id_nodo).first()
    if hub: hub.ciudad_id = data.ciudad_id.upper().strip(); hub.nombre = data.nombre; hub.direccion = data.direccion; hub.coordenadas = data.coordenadas
    else: db.add(HubMappingModel(id=id_nodo, nombre=data.nombre, ciudad_id=data.ciudad_id.upper().strip(), direccion=data.direccion, coordenadas=data.coordenadas))
    db.commit()
    return {"status": "success"}

@app.delete("/api/geography/hubs/{hub_id}")
def delete_hub(hub_id: str, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    pestanas = [p.strip().lower() for p in str(current_user.pestanas).split(",")]
    if not is_admin(current_user) and "*" not in pestanas and "geografia" not in pestanas: raise HTTPException(status_code=403)
    hub = db.query(HubMappingModel).filter(HubMappingModel.id == hub_id.upper().strip()).first()
    if hub: db.query(PortModel).filter(PortModel.hub_id == hub.id).delete(); db.delete(hub); db.commit()
    return {"status": "success"}

@app.get("/api/ports/search")
def search_ports(q: str = Query(...), current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        termino = q.strip().lower()
        query = db.query(PortModel)
        if not is_admin(current_user) and current_user.plazas != "*":
            ids = [x.strip().upper() for x in str(current_user.plazas).split(",") if x.strip()]
            ciudades = [c.nombre for c in db.query(CityModel).filter(CityModel.id.in_(ids)).all()]
            query = query.filter(PortModel.ciudad.in_(ciudades))
        resultados = []
        for p in query.all():
            if termino in str(p.servicio or '').lower() or termino in str(p.puerto or '').lower() or termino in str(p.ip_gestion or '').lower() or termino in str(p.ip_cliente or '').lower() or termino in str(p.contacto_nombre or '').lower():
                resultados.append({"ID": p.id, "ESTATUS": p.estatus, "PUERTO": p.puerto, "SERVICIO": p.servicio, "IP_GESTION": p.ip_gestion, "IP_CLIENTE": p.ip_cliente, "BDI": p.bdi, "POTENCIA_HUB": p.potencia_hub, "POTENCIA_CPE": p.potencia_cpe, "RUTA": p.ruta, "DISTANCIA_CLIENTE": p.distancia_cliente, "LAMBDAS": p.lambdas, "BUFFER": p.buffer, "HILOS": p.hilos, "COORDENADAS": p.coordenadas, "CONTACTO_NOMBRE": p.contacto_nombre, "CONTACTO_TELEFONO": p.contacto_telefono})
                if len(resultados) >= 40: break
        return {"status": "success", "data": resultados}
    except Exception as e: return JSONResponse(status_code=500, content={"status": "error", "data": [], "detail": str(e)})

@app.get("/api/hubs")
def get_hub_ports(id_hub: str = Query("CTC"), db: Session = Depends(get_db)):
    try:
        puertos = [{"ID": p.id, "REGION": p.region, "CIUDAD": p.ciudad, "ESTATUS": p.estatus, "PUERTO": p.puerto, "EQUIPO_HOTEL_ID": p.equipo_hotel_id, "IP_HUB": p.ip_hub, "NOMBRE_CORTO": p.nombre_corto, "ID_MCA": p.id_mca, "SERVICIO": p.servicio, "POTENCIA_HUB": p.potencia_hub, "POTENCIA_CPE": p.potencia_cpe, "TIPO_SERVICIO": p.tipo_servicio, "MBPS": p.mbps, "IP_GESTION": p.ip_gestion, "IP_CLIENTE": p.ip_cliente, "BDI": p.bdi, "RUTA": p.ruta, "BUFFER": p.buffer, "HILOS": p.hilos, "PARCHEO": p.parcheo, "LAMBDAS": p.lambdas, "DISTANCIA_CLIENTE": p.distancia_cliente, "MARCA_CPE": p.marca_cpe, "MODELO_CPE": p.modelo_cpe, "SERIE_CPE": p.serie_cpe, "FECHA_DE_ENTREGA": p.fecha_entrega, "SERIE_SFP_HUB": p.serie_sfp_hub, "SERIE_SFP_CLIENTE": p.serie_sfp_client, "EQUIPAMIENTO": p.equipamiento, "SERIE": p.serie, "DIRECCION": p.direccion, "COORDENADAS": p.coordenadas, "COMENTARIOS": p.comentarios, "CONTACTO_NOMBRE": p.contacto_nombre, "CONTACTO_TELEFONO": p.contacto_telefono} for p in db.query(PortModel).filter(PortModel.hub_id == str(id_hub).strip()).all()]
        return {"status": "success", "hub": id_hub, "resumen": {"total": len(puertos), "disponibles": sum(1 for x in puertos if "DISPONIBLE" in str(x["ESTATUS"]).upper()), "activos": sum(1 for x in puertos if "ACTIVO" in str(x["ESTATUS"]).upper()), "suspendidos": sum(1 for x in puertos if "SUSPENDIDO" in str(x["ESTATUS"]).upper()), "troncales": sum(1 for x in puertos if "TRONCAL" in str(x["ESTATUS"]).upper())}, "puertos": puertos}
    except Exception as e: return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})

@app.put("/api/ports/bulk-update")
def bulk_update_ports(data: PortBulkUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    update_data = data.updates.model_dump(exclude_unset=True)
    if not update_data: return {"status": "success"}
    mapped = {}
    for k, v in update_data.items():
        k = "fecha_entrega" if k.lower() == "fecha_de_entrega" else "serie_sfp_client" if k.lower() == "serie_sfp_cliente" else k.lower()
        mapped[k] = v
    db.query(PortModel).filter(PortModel.id.in_(data.port_ids)).update(mapped, synchronize_session=False); db.commit()
    registrar_auditoria(db, current_user.username, "EDICIÓN MASIVA", "INVENTARIO", f"Edición a {len(data.port_ids)} puertos.")
    return {"status": "success"}

@app.put("/api/ports/{port_id}")
def update_port_data(port_id: int, data: PortUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    p = db.query(PortModel).filter(PortModel.id == port_id).first()
    if not p: raise HTTPException(status_code=404)
    for k, v in data.model_dump(exclude_unset=True).items(): 
        k = "fecha_entrega" if k.lower() == "fecha_de_entrega" else "serie_sfp_client" if k.lower() == "serie_sfp_cliente" else k.lower()
        setattr(p, k, v)
    db.commit()
    registrar_auditoria(db, current_user.username, "EDICIÓN DE PUERTO", "INVENTARIO", f"Modificó el puerto {p.puerto}.")
    return {"status": "success"}

@app.post("/api/hubs/upload-excel")
async def upload_hub_excel(id_hub: str = Query(...), mode: str = Query("preview"), file: UploadFile = File(...), current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_upload_excel(current_user): raise HTTPException(status_code=403)
    if not (file.content_type in ALLOWED_EXCEL_MIME_TYPES or file.filename.lower().endswith(('.xlsx', '.xls'))): return JSONResponse(status_code=400, content={"status": "error", "detail": "Excel inválido."})
    try:
        contents = await file.read()
        if len(contents) > MAX_EXCEL_FILE_SIZE: return JSONResponse(status_code=400, content={"status": "error", "detail": "Supera 5MB."})
        df = pd.read_excel(io.BytesIO(contents), header=None).fillna("")
        header_row = next((i for i, r in df.iterrows() if "PUERTO" in [str(c).upper().strip() for c in r.values]), 0)
        col_heads = [str(c).upper().strip() for c in df.iloc[header_row].values]
        df_data = df.iloc[header_row + 1:]
        hub = db.query(HubMappingModel).filter(HubMappingModel.id == str(id_hub).upper().strip()).first()
        if not hub: return JSONResponse(status_code=400, content={"status": "error", "detail": "El HUB no existe."})
        city = db.query(CityModel).filter(CityModel.id == hub.ciudad_id).first()
        reg = db.query(RegionModel).filter(RegionModel.id == city.region_id).first()

        def gi(targs): return next((col_heads.index(t) for t in targs if t in col_heads), -1)
        i_s, i_p, i_c, i_sh, i_mb, i_ig, i_ic, i_b, i_ph, i_pc = gi(["STATUS","ESTATUS"]), gi(["PUERTO"]), gi(["CLIENTE / SERVICIO","SERVICIO"]), gi(["IP HUB"]), gi(["MBPS"]), gi(["IP GESTIÓN","IP GESTION"]), gi(["IP CLIENTE"]), gi(["BDI"]), gi(["POTENCIA HUB"]), gi(["POTENCIA CPE"])
        
        if i_p == -1: return JSONResponse(status_code=400, content={"status": "error", "detail": "Falta PUERTO"})
        preview = []; errs = False; vistos = set()
        for _, r in df_data.iterrows():
            v = list(r.values)
            if i_p >= len(v): continue
            p_v = str(v[i_p]).strip()
            if not p_v or p_v.upper() == "NAN": continue
            st = str(v[i_s]).strip().upper() if i_s != -1 and i_s < len(v) else "DISPONIBLE GI"
            sv = str(v[i_c]).strip() if i_c != -1 and i_c < len(v) else ""
            ig = str(v[i_ig]).strip() if i_ig != -1 and i_ig < len(v) else ""
            ef = []
            if p_v in vistos: ef.append("Duplicado.")
            vistos.add(p_v)
            if "ACTIVO" in st and not sv: ef.append("ACTIVO requiere CLIENTE.")
            if ig and ig.count('.') != 3: ef.append("IP inválida.")
            preview.append({"PUERTO": p_v, "ESTATUS": st, "SERVICIO": sv, "IP_GESTION": ig, "_errores": ef, "_valido": len(ef) == 0})
            if ef: errs = True

        if mode == "preview": return {"status": "success", "data": preview, "has_errors": errs}

        db.query(PortModel).filter(PortModel.hub_id == hub.id).delete()
        for _, r in df_data.iterrows():
            v = list(r.values)
            if i_p >= len(v): continue
            p_v = str(v[i_p]).strip()
            if not p_v or p_v.upper() == "NAN": continue
            def rv(idx): return str(v[idx]).strip() if idx != -1 and idx < len(v) and str(v[idx]).upper() != "NAN" else ""
            db.add(PortModel(region=reg.nombre, ciudad=city.nombre, hub_id=hub.id, estatus=rv(i_s) or "DISPONIBLE GI", puerto=p_v, ip_hub=rv(i_sh), servicio=rv(i_c), mbps=rv(i_mb), ip_gestion=rv(i_ig), ip_cliente=rv(i_ic), bdi=rv(i_b), potencia_hub=rv(i_ph), potencia_cpe=rv(i_pc)))
        db.commit()
        registrar_auditoria(db, current_user.username, "APROVISIONAMIENTO", "CARGA EXCEL", f"Archivo cargado en HUB {id_hub}")
        return {"status": "success", "detail": "Aprovisionamiento masivo completado."}
    except Exception as e: return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})

@app.post("/api/hubs/upload-json")
async def upload_json_chasis(request: Request, id_hub: str = Query(...), current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_upload_excel(current_user): raise HTTPException(status_code=403)
    try:
        p_list = (await request.json()).get("puertos", [])
        hub = db.query(HubMappingModel).filter(HubMappingModel.id == str(id_hub).upper().strip()).first()
        if not hub: return JSONResponse(status_code=400, content={"status": "error", "detail": "No existe el HUB."})
        c = db.query(CityModel).filter(CityModel.id == hub.ciudad_id).first()
        r = db.query(RegionModel).filter(RegionModel.id == c.region_id).first()
        for p in p_list: db.add(PortModel(region=r.nombre, ciudad=c.nombre, hub_id=hub.id, estatus=p.get("ESTATUS", "DISPONIBLE GI"), puerto=p.get("PUERTO"), equipo_hotel_id=p.get("EQUIPO_HOTEL_ID", ""), ip_hub=p.get("IP_HUB", ""), servicio=""))
        db.commit()
        return {"status": "success", "detail": f"{len(p_list)} puertos creados."}
    except Exception as e: return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})

@app.get("/api/hubs/exportar-excel")
def exportar_inventario_excel(region: str = None, ciudad: str = None, id_hub: str = None, db: Session = Depends(get_db)):
    try:
        q = db.query(PortModel)
        if region: q = q.filter(PortModel.region == region)
        if ciudad: q = q.filter(PortModel.ciudad == ciudad)
        if id_hub and id_hub != "TODOS": q = q.filter(PortModel.hub_id == id_hub)
        puertos = q.all()
        wb = Workbook()
        ws = wb.active; ws.title = "Matriz"
        headers = ["REGION", "CIUDAD", "NODO", "ESTATUS", "PUERTO", "IP GESTION", "SERVICIO"]
        ws.append(headers)
        for p in puertos: ws.append([p.region, p.ciudad, p.hub_id, p.estatus, p.puerto, p.ip_gestion, p.servicio])
        output = io.BytesIO(); wb.save(output); output.seek(0)
        return StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=Inventario.xlsx"})
    except Exception as e: return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})

@app.get("/api/cabezales")
def get_cabezales(ciudad: str = None, id_equipo: str = None, db: Session = Depends(get_db)):
    q = db.query(CabezalModel)
    if ciudad: q = q.filter(CabezalModel.ciudad.ilike(f"%{ciudad}%"))
    if id_equipo: q = q.filter(CabezalModel.id_equipo.ilike(f"%{id_equipo}%"))
    return {"status": "success", "data": q.all()}

@app.get("/api/cabezales/{cabezal_id}/alineacion")
def get_alineacion(cabezal_id: int, db: Session = Depends(get_db)):
    return {"status": "success", "data": db.query(AlineacionCabezalModel).filter(AlineacionCabezalModel.cabezal_id == cabezal_id).all()}

@app.put("/api/cabezales/{cabezal_id}")
def update_cabezal(cabezal_id: int, data: CabezalUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    cab = db.query(CabezalModel).filter(CabezalModel.id == cabezal_id).first()
    if not cab: raise HTTPException(status_code=404)
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(cab, k, v)
    db.commit()
    return {"status": "success"}

@app.delete("/api/cabezales/{cabezal_id}")
def delete_cabezal(cabezal_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    cab = db.query(CabezalModel).filter(CabezalModel.id == cabezal_id).first()
    if cab: db.delete(cab); db.commit()
    return {"status": "success"}

@app.put("/api/alineaciones/{alineacion_id}")
def update_alineacion(alineacion_id: int, data: AlineacionUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    al = db.query(AlineacionCabezalModel).filter(AlineacionCabezalModel.id == alineacion_id).first()
    if not al: raise HTTPException(status_code=404)
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(al, k, v)
    db.commit()
    return {"status": "success"}

@app.delete("/api/alineaciones/{alineacion_id}")
def delete_alineacion(alineacion_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    al = db.query(AlineacionCabezalModel).filter(AlineacionCabezalModel.id == alineacion_id).first()
    if al: db.delete(al); db.commit()
    return {"status": "success"}

@app.get("/api/config-ciudades/{ciudad_nombre}")
def get_config_ciudad(ciudad_nombre: str, db: Session = Depends(get_db)):
    cfg = db.query(ConfigCiudadModel).filter(ConfigCiudadModel.ciudad_nombre == ciudad_nombre).first()
    return {"status": "success", "data": {"ancho_banda_total": cfg.ancho_banda_total if cfg else None}}

@app.put("/api/config-ciudades/{ciudad_nombre}")
def update_config_ciudad(ciudad_nombre: str, data: ConfigCiudadUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    cfg = db.query(ConfigCiudadModel).filter(ConfigCiudadModel.ciudad_nombre == ciudad_nombre).first()
    if cfg: cfg.ancho_banda_total = data.ancho_banda_total
    else: db.add(ConfigCiudadModel(ciudad_nombre=ciudad_nombre, ancho_banda_total=data.ancho_banda_total))
    db.commit()
    return {"status": "success"}

@app.get("/api/auditoria")
def get_audit_logs(limit: int = 150, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    return {"status": "success", "data": [{"id": l.id, "usuario": l.usuario, "accion": l.accion, "modulo": l.modulo, "detalle": l.detalle, "fecha": l.fecha} for l in db.query(AuditLogModel).order_by(AuditLogModel.id.desc()).limit(limit).all()]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
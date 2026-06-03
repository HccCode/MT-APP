from fastapi import FastAPI, Query, Request, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
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
import subprocess
import platform

# IMPORTS PARA EXCEL AVANZADO (OPENPYXL)
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.chart import PieChart, Reference
from openpyxl.chart.label import DataLabelList

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
    __tablename__ = "sys_usuarios"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
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
    except Exception as e:
        print("Error al guardar log de auditoría:", e)

# ================= ESQUEMAS PYDANTIC =================
class UserLogin(BaseModel):
    username: str
    password: str

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
    PUERTO: str = None
    EQUIPO_HOTEL_ID: str = None
    IP_HUB: str = None
    NOMBRE_CORTO: str = None
    ID_MCA: str = None
    SERVICIO: str = None
    POTENCIA_HUB: str = None
    POTENCIA_CPE: str = None
    TIPO_SERVICIO: str = None
    MBPS: str = None
    IP_GESTION: str = None
    IP_CLIENTE: str = None
    BDI: str = None
    RUTA: str = None
    BUFFER: str = None
    HILOS: str = None
    PARCHEO: str = None
    LAMBDAS: str = None
    DISTANCIA_CLIENTE: str = None
    MARCA_CPE: str = None
    MODELO_CPE: str = None
    SERIE_CPE: str = None
    FECHA_DE_ENTREGA: str = None
    SERIE_SFP_HUB: str = None
    SERIE_SFP_CLIENTE: str = None
    EQUIPAMIENTO: str = None
    SERIE: str = None
    DIRECCION: str = None  
    COORDENADAS: str = None  
    COMENTARIOS: str = None
    CONTACTO_NOMBRE: str = None
    CONTACTO_TELEFONO: str = None

class PortBulkUpdate(BaseModel):
    port_ids: List[int]
    updates: PortUpdate

class CabezalUpdate(BaseModel):
    id_equipo: str = None
    ciudad: str = None
    servicio: str = None
    gestion_qam: str = None
    marca: str = None
    modelo: str = None
    serie: str = None

class AlineacionUpdate(BaseModel):
    portadora: str = None
    formato: str = None
    canal_num: str = None
    nombre_canal: str = None
    mcast_ip: str = None
    source_ip: str = None
    udp: str = None
    sid: str = None

class ConfigCiudadUpdate(BaseModel):
    ancho_banda_total: str

class HubStatItem(BaseModel):
    nombre: str
    id: str
    disp_gi: int
    total_gi: int
    disp_te: int
    total_te: int
    disp_25: int
    total_25: int
    disp_100: int
    total_100: int
    activos: int
    suspendidos: int
    troncales: int
    total_disp: int
    pct_libres: str
    total: int

class ResumenExportReq(BaseModel):
    ciudad: str
    capacidad_total: str
    trafico_gbps: str
    disponibilidad_pct: str
    stats_activos: int
    stats_suspendidos: int
    stats_troncales: int
    stats_total_disp: int
    hubs: List[HubStatItem]

MAX_EXCEL_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_EXCEL_MIME_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel"
}

try:
    db_init = SessionLocal()
    if db_init.query(UserModel).count() == 0:
        db_init.add(UserModel(
            username="admin", 
            password_hash=hash_password(settings.admin_default_password), 
            role="ADMIN", 
            plazas="*",
            pestanas="*",
            nombre_completo="Administrador del Sistema"
        ))
        db_init.commit()
    db_init.close()
except Exception as e:
    print("Nota: Semilla de administrador omitida:", e)

# ================= INICIALIZACIÓN API =================
app = FastAPI(title="MT_DB Enterprise API")

app.add_middleware(
    CORSMiddleware, 
    allow_origins=settings.cors_origins_list,
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# ================= RUTAS DE AUTENTICACIÓN Y USUARIOS =================
@app.post("/api/auth/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        return JSONResponse(status_code=400, content={"status": "error", "detail": "Credenciales inválidas"})
    access_token = jwt.encode({"sub": user.username, "role": user.role, "plazas": user.plazas, "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"status": "success", "token": access_token, "user": {"username": user.username, "role": user.role, "plazas": user.plazas, "pestanas": user.pestanas, "nombre_completo": user.nombre_completo}}

@app.post("/api/auth/register")
def register(data: UserRegister, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    if db.query(UserModel).filter(UserModel.username == data.username.strip()).first(): raise HTTPException(status_code=400, detail="El usuario ya existe")
    db.add(UserModel(
        username=data.username.strip(), password_hash=hash_password(data.password), role=data.role, plazas=data.plazas, pestanas=data.pestanas,
        nombre_completo=data.nombre_completo.strip(),num_empleado=data.num_empleado, correo=data.correo, area_org=data.area_org,
        region_asignacion=data.region_asignacion, puesto=data.puesto
    ))
    db.commit()
    return {"status": "success"}

@app.get("/api/users")
def list_all_users(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    return [{
        "id": u.id, "username": u.username, "role": u.role, "plazas": u.plazas, "pestanas": u.pestanas,
        "nombre_completo": u.nombre_completo,"num_empleado": u.num_empleado, "correo": u.correo, "area_org": u.area_org,
        "region_asignacion": u.region_asignacion, "puesto": u.puesto
    } for u in db.query(UserModel).all()]

@app.put("/api/users/{user_id}")
def update_user_profile(user_id: int, data: UserUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
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
    if data.password and data.password.strip() != "": user.password_hash = hash_password(data.password)
    db.commit()
    return {"status": "success"}

@app.delete("/api/users/{user_id}")
def delete_user_profile(user_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user) or current_user.id == user_id: raise HTTPException(status_code=400, detail="Operación no permitida")
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if user: db.delete(user)
    db.commit()
    return {"status": "success"}

# ================= TOPOLOGÍA DE RED Y GEOGRAFÍA =================
@app.get("/api/geography")
def get_geography_tree(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        if is_admin(current_user) or current_user.plazas == "*":
            ids_permitidos = None
        else:
            ids_permitidos = [x.strip().upper() for x in current_user.plazas.split(",") if x.strip()]
            
        regiones = db.query(RegionModel).all()
        query_ciudades = db.query(CityModel)
        
        if ids_permitidos is not None: 
            query_ciudades = query_ciudades.filter(CityModel.id.in_(ids_permitidos))
            
        ciudades = query_ciudades.all()
        ids_ciudades_filtradas = [c.id for c in ciudades]
        
        hubs = []
        if ids_ciudades_filtradas or ids_permitidos is None:
            query_hubs = db.query(HubMappingModel)
            if ids_permitidos is not None:
                query_hubs = query_hubs.filter(HubMappingModel.ciudad_id.in_(ids_ciudades_filtradas))
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
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "detail": f"Error leyendo topología: {str(e)}"})

@app.post("/api/geography/regions")
def create_region(data: GeographyRegionCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    region_existente = db.query(RegionModel).filter(RegionModel.nombre.ilike(data.nombre.strip())).first()
    if region_existente: raise HTTPException(status_code=400, detail=f"La región '{data.nombre}' ya se encuentra registrada.")

    nueva = RegionModel(nombre=data.nombre.strip())
    db.add(nueva)
    db.commit()
    return {"status": "success", "id": nueva.id}

@app.put("/api/geography/regions/{region_id}")
def update_region(region_id: int, data: GeographyRegionCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    region = db.query(RegionModel).filter(RegionModel.id == region_id).first()
    if not region: raise HTTPException(status_code=404)
    region.nombre = data.nombre.strip()
    db.commit()
    return {"status": "success"}

@app.delete("/api/geography/regions/{region_id}")
def delete_region(region_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    region = db.query(RegionModel).filter(RegionModel.id == region_id).first()
    if region:
        ciudades = db.query(CityModel).filter(CityModel.region_id == region_id).all()
        for c in ciudades:
            hubs = db.query(HubMappingModel).filter(HubMappingModel.ciudad_id == c.id).all()
            for h in hubs: db.query(PortModel).filter(PortModel.hub_id == h.id).delete()
            db.query(HubMappingModel).filter(HubMappingModel.ciudad_id == c.id).delete()
        db.query(CityModel).filter(CityModel.region_id == region_id).delete()
        db.delete(region)
        db.commit()
    return {"status": "success"}

@app.post("/api/geography/cities")
def create_city(data: GeographyCityCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    id_limpio = data.id.upper().strip()
    nombre_limpio = data.nombre.strip()
    
    if db.query(CityModel).filter(CityModel.id == id_limpio).first(): 
        raise HTTPException(status_code=400, detail=f"El ID de Ciudad '{id_limpio}' ya se encuentra registrado.")
    if db.query(CityModel).filter(CityModel.nombre.ilike(nombre_limpio)).first():
        raise HTTPException(status_code=400, detail=f"El nombre de Ciudad '{nombre_limpio}' ya se encuentra registrado.")
    
    db.add(CityModel(id=id_limpio, nombre=nombre_limpio, region_id=data.region_id))
    db.commit()
    return {"status": "success"}

@app.put("/api/geography/cities/{city_id}")
def update_city(city_id: str, data: GeographyCityCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    ciudad = db.query(CityModel).filter(CityModel.id == city_id).first()
    if not ciudad: raise HTTPException(status_code=404)
    ciudad.nombre = data.nombre.strip()
    ciudad.region_id = data.region_id
    db.commit()
    return {"status": "success"}

@app.delete("/api/geography/cities/{city_id}")
def delete_city(city_id: str, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):  
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    ciudad = db.query(CityModel).filter(CityModel.id == city_id).first()
    if ciudad:
        hubs = db.query(HubMappingModel).filter(HubMappingModel.ciudad_id == city_id).all()
        for h in hubs: db.query(PortModel).filter(PortModel.hub_id == h.id).delete()
        db.delete(ciudad)
        db.commit()
    return {"status": "success"}

@app.post("/api/geography/hubs")
def assign_or_create_hub(data: GeographyHubCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    id_nodo = data.id.upper().strip()
    hub = db.query(HubMappingModel).filter(HubMappingModel.id == id_nodo).first()
    if hub:
        hub.ciudad_id = data.ciudad_id.upper().strip()
        hub.nombre = data.nombre
        hub.direccion = data.direccion
        hub.coordenadas = data.coordenadas
    else:
        db.add(HubMappingModel(id=id_nodo, nombre=data.nombre, ciudad_id=data.ciudad_id.upper().strip(), direccion=data.direccion, coordenadas=data.coordenadas))
    db.commit()
    return {"status": "success"}

@app.delete("/api/geography/hubs/{hub_id}")
def delete_hub(hub_id: str, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    hub = db.query(HubMappingModel).filter(HubMappingModel.id == hub_id.upper().strip()).first()
    if hub:
        db.query(PortModel).filter(PortModel.hub_id == hub.id).delete()
        db.delete(hub)
        db.commit()
    return {"status": "success"}

# ================= ENDPOINT DE BÚSQUEDA GLOBAL (MODO CUADRILLA) =================
@app.get("/api/ports/search")
def search_ports(q: str = Query(...), current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    from fastapi.responses import JSONResponse
    from fastapi.encoders import jsonable_encoder
    
    try:
        termino = q.strip().lower()
        todos_los_puertos = db.query(PortModel).all()
        
        resultados = []
        for p in todos_los_puertos:
            dic = dict(p.__dict__)
            dic.pop('_sa_instance_state', None)
            
            # 1. Extraemos de forma ESTRICTA solo los campos que identifican a un servicio real
            servicio = str(dic.get('SERVICIO', '') or '').lower()
            puerto = str(dic.get('PUERTO', '') or '').lower()
            equipo = str(dic.get('EQUIPO_HOTEL_ID', '') or '').lower()
            ip_gestion = str(dic.get('IP_GESTION', '') or '').lower()
            ip_cliente = str(dic.get('IP_CLIENTE', '') or '').lower()
            contacto = str(dic.get('CONTACTO_NOMBRE', '') or '').lower()
            
            # 2. Validamos que la palabra buscada esté ÚNICAMENTE en esos campos
            if (termino in servicio) or (termino in puerto) or (termino in equipo) or (termino in ip_gestion) or (termino in ip_cliente) or (termino in contacto):
                resultados.append(dic)
                
                if len(resultados) >= 40:
                    break
                    
        return {"status": "success", "data": jsonable_encoder(resultados)}
        
    except Exception as e:
        print(f"Error en buscador estricto: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "data": [], "detail": str(e)})

# ================= INTERFAZ DE PUERTOS =================
@app.get("/api/hubs")
def get_hub_ports(id_hub: str = Query("CTC"), db: Session = Depends(get_db)):
    try:
        query_ports = db.query(PortModel).filter(PortModel.hub_id == str(id_hub).strip()).all()
        puertos_lista = []
        for p in query_ports:
            puertos_lista.append({
                "ID": p.id, "REGION": p.region, "CIUDAD": p.ciudad, "ESTATUS": p.estatus, "PUERTO": p.puerto, 
                "EQUIPO_HOTEL_ID": p.equipo_hotel_id, "IP_HUB": p.ip_hub, "NOMBRE_CORTO": p.nombre_corto, 
                "ID_MCA": p.id_mca, "SERVICIO": p.servicio, "POTENCIA_HUB": p.potencia_hub, 
                "POTENCIA_CPE": p.potencia_cpe, "TIPO_SERVICIO": p.tipo_servicio, "MBPS": p.mbps, 
                "IP_GESTION": p.ip_gestion, "IP_CLIENTE": p.ip_cliente, "BDI": p.bdi, "RUTA": p.ruta, 
                "BUFFER": p.buffer, "HILOS": p.hilos, "PARCHEO": p.parcheo, "LAMBDAS": p.lambdas, 
                "DISTANCIA_CLIENTE": p.distancia_cliente, "MARCA_CPE": p.marca_cpe, "MODELO_CPE": p.modelo_cpe, 
                "SERIE_CPE": p.serie_cpe, "FECHA_DE_ENTREGA": p.fecha_entrega, "SERIE_SFP_HUB": p.serie_sfp_hub, 
                "SERIE_SFP_CLIENTE": p.serie_sfp_client, "EQUIPAMIENTO": p.equipamiento, "SERIE": p.serie, 
                "DIRECCION": p.direccion, "COORDENADAS": p.coordenadas, "COMENTARIOS": p.comentarios,
                "CONTACTO_NOMBRE": p.contacto_nombre, "CONTACTO_TELEFONO": p.contacto_telefono
            })
        total_disp = sum(1 for x in puertos_lista if str(x["ESTATUS"]).strip().upper() in ["DISPONIBLE GI", "DISPONIBLE TE"])
        return {
            "status": "success", "hub": id_hub, 
            "resumen": {
                "total": len(puertos_lista), "disponibles": total_disp, 
                "activos": sum(1 for x in puertos_lista if "ACTIVO" in str(x["ESTATUS"]).upper()), 
                "suspendidos": sum(1 for x in puertos_lista if "SUSPENDIDO" in str(x["ESTATUS"]).upper()), 
                "troncales": sum(1 for x in puertos_lista if "TRONCAL" in str(x["ESTATUS"]).upper())
            }, 
            "puertos": puertos_lista
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})

@app.put("/api/ports/bulk-update")
def bulk_update_ports(data: PortBulkUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): 
        raise HTTPException(status_code=403, detail="Permisos insuficientes")
    
    update_data = data.updates.model_dump(exclude_unset=True)
    if not update_data:
        return {"status": "success", "detail": "Nada que actualizar"}
        
    mapped_updates = {}
    cambios_desc = []
    
    for key, val in update_data.items():
        attr_name = key.lower()
        if attr_name == "fecha_de_entrega": attr_name = "fecha_entrega"
        if attr_name == "serie_sfp_cliente": attr_name = "serie_sfp_client"
        mapped_updates[attr_name] = val
        
        v_nuevo = str(val).strip() if val is not None else "(Vacío)"
        cambios_desc.append(f"[{key.upper()} ➔ '{v_nuevo}']")
        
    db.query(PortModel).filter(PortModel.id.in_(data.port_ids)).update(mapped_updates, synchronize_session=False)
    db.commit()
    
    detalle_log = f"Edición Masiva a {len(data.port_ids)} puertos (IDs afectados: {', '.join(map(str, data.port_ids))}). Se forzaron los siguientes valores: " + " | ".join(cambios_desc)
    registrar_auditoria(db, current_user.username, "EDICIÓN MASIVA", "INVENTARIO", detalle_log)
    return {"status": "success", "detail": f"{len(data.port_ids)} puertos actualizados"}

@app.put("/api/ports/{port_id}")
def update_port_data(port_id: int, data: PortUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    
    db_port = db.query(PortModel).filter(PortModel.id == port_id).first()
    if not db_port: raise HTTPException(status_code=404)
    
    cambios_realizados = []
    for key, val in data.model_dump(exclude_unset=True).items(): 
        attr_name = key.lower()
        if attr_name == "fecha_de_entrega": attr_name = "fecha_entrega"
        if attr_name == "serie_sfp_cliente": attr_name = "serie_sfp_client"
        
        valor_antiguo = getattr(db_port, attr_name)
        v_antiguo = str(valor_antiguo).strip() if valor_antiguo is not None else ""
        v_nuevo = str(val).strip() if val is not None else ""
        
        if v_antiguo != v_nuevo: cambios_realizados.append(f"[{key.upper()}: '{v_antiguo}' ➔ '{v_nuevo}']")
        setattr(db_port, attr_name, val)
        
    db.commit()
    if cambios_realizados:
        detalle_log = f"Modificó el puerto {db_port.puerto} (ID {port_id}). Cambios exactos: " + " | ".join(cambios_realizados)
    else:
        detalle_log = f"Abrió y guardó el puerto {db_port.puerto} (ID {port_id}) sin alterar ningún valor."
        
    registrar_auditoria(db, current_user.username, "EDICIÓN DE PUERTO", "INVENTARIO", detalle_log)
    return {"status": "success"}

# ================= MOTOR AVANZADO DE CARGA Y STAGING AREA =================
@app.post("/api/hubs/upload-excel")
async def upload_hub_excel(id_hub: str = Query(...), mode: str = Query("preview"), file: UploadFile = File(...), current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_upload_excel(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    filename = file.filename or ""
    if not (file.content_type in ALLOWED_EXCEL_MIME_TYPES or filename.lower().endswith(('.xlsx', '.xls'))):
        return JSONResponse(status_code=400, content={"status": "error", "detail": "El archivo debe ser un Excel válido."})
    try:
        contents = await file.read()
        if len(contents) > MAX_EXCEL_FILE_SIZE: return JSONResponse(status_code=400, content={"status": "error", "detail": "El archivo supera los 5MB."})
        df = pd.read_excel(io.BytesIO(contents), header=None).fillna("")
        header_row_idx = 0
        
        for idx, row in df.iterrows():
            if "PUERTO" in [str(cell).upper().strip() for cell in row.values]:
                header_row_idx = idx
                break
                
        column_headers = [str(cell).upper().strip() for cell in df.iloc[header_row_idx].values]
        df_data = df.iloc[header_row_idx + 1:]
        
        hub_cfg = db.query(HubMappingModel).filter(HubMappingModel.id == str(id_hub).upper().strip()).first()
        if not hub_cfg: return JSONResponse(status_code=400, content={"status": "error", "detail": f"El HUB '{id_hub}' no existe."})
        
        ciudad_obj = db.query(CityModel).filter(CityModel.id == hub_cfg.ciudad_id).first()
        region_obj = db.query(RegionModel).filter(RegionModel.id == ciudad_obj.region_id).first()
        
        def get_index(targets, headers):
            for t in targets:
                if t in headers: return headers.index(t)
            return -1

        idx_status = get_index(["STATUS", "ESTATUS", "ESTADO"], column_headers)
        idx_puerto = get_index(["PUERTO"], column_headers)
        idx_equipo = get_index(["EQUIPO ID (CHASIS)", "EQUIPO/HOTEL ID", "EQUIPO", "HOTEL ID", "EQUIPO ID"], column_headers)
        idx_iphub = get_index(["IP HUB", "IP_HUB"], column_headers)
        idx_serv = get_index(["CLIENTE / SERVICIO", "SERVICIO", "CLIENTE"], column_headers)
        idx_mbps = get_index(["ANCHO BANDA (MBPS)", "MBPS", "ANCHO BANDA"], column_headers)
        idx_ipgest = get_index(["IP GESTIÓN", "IP GESTION", "IP_GESTION"], column_headers)
        idx_ipcli = get_index(["IP CLIENTE", "IP_CLIENTE"], column_headers)
        idx_bdi = get_index(["BDI"], column_headers)
        idx_potcpe = get_index(["POTENCIA CPE"], column_headers)
        idx_pothub = get_index(["POTENCIA HUB"], column_headers)
        idx_id_mca = get_index(["ID MCA", "ID_MCA"], column_headers)
        idx_ruta = get_index(["RUTA"], column_headers)
        idx_distancia = get_index(["DIST. CLIENTE", "DISTANCIA CLIENTE", "DISTANCIA"], column_headers)
        idx_lambdas = get_index(["LAMBDAS", "LAMBDA"], column_headers)
        idx_buffer = get_index(["BUFFER"], column_headers)
        idx_hilos = get_index(["HILOS", "HILO"], column_headers)
        idx_parcheo = get_index(["PARCHEO"], column_headers)
        idx_serie_sfp_hub = get_index(["SERIE SFP HUB", "SFP HUB"], column_headers)
        idx_serie_sfp_cpe = get_index(["SERIE SFP CPE", "SERIE SFP CLIENTE", "SFP CPE"], column_headers)
        idx_marca = get_index(["MARCA", "MARCA CPE"], column_headers)
        idx_modelo = get_index(["MODELO", "MODELO CPE"], column_headers)
        idx_serie_cpe = get_index(["SERIE CPE", "SERIE"], column_headers)
        idx_tipo_servicio = get_index(["TIPO SERVICIO", "TIPO DE SERVICIO"], column_headers)
        idx_direccion = get_index(["DIRECCIÓN SERVICIO", "DIRECCION SERVICIO", "DIRECCIÓN", "DIRECCION"], column_headers)
        idx_coordenadas = get_index(["COORDENADAS"], column_headers)
        idx_contacto_nombre = get_index(["NOMBRE CONTACTO", "CONTACTO", "CONTACTO NOMBRE"], column_headers)
        idx_contacto_telefono = get_index(["TELÉFONO CONTACTO", "TELEFONO CONTACTO", "TELEFONO", "TELÉFONO"], column_headers)
        idx_fecha_entrega = get_index(["FECHA DE ENTREGA", "FECHA ENTREGA", "FECHA"], column_headers)
        idx_comentarios = get_index(["COMENTARIOS", "OBSERVACIONES"], column_headers)

        if idx_puerto == -1: return JSONResponse(status_code=400, content={"status": "error", "detail": "Falta columna PUERTO"})
        
        # LÓGICA DE VALIDACIÓN (STAGING AREA)
        preview_data = []
        has_errors = False
        puertos_vistos = set()
        
        for _, row in df_data.iterrows():
            vals = list(row.values)
            if idx_puerto >= len(vals): continue
            p_val = str(vals[idx_puerto]).strip()
            if not p_val or p_val.upper() == "NAN" or p_val == "": continue
            def read_val(idx): return str(vals[idx]).strip() if (idx != -1 and idx < len(vals) and str(vals[idx]).upper() != "NAN") else ""
            
            est = read_val(idx_status).upper() or "DISPONIBLE GI"
            serv = read_val(idx_serv)
            ip_gest = read_val(idx_ipgest)
            eq_id = read_val(idx_equipo)
            
            errores_fila = []
            
            # REGLA 1: Duplicidad interna de interfaces en el Excel
            clave_unica = f"{p_val}_{eq_id}"
            if clave_unica in puertos_vistos:
                errores_fila.append(f"El puerto {p_val} está duplicado en el equipo {eq_id or 'Sin ID'}.")
            puertos_vistos.add(clave_unica)
            
            # REGLA 2: Cliente Omitido
            if "ACTIVO" in est and not serv:
                errores_fila.append("Un puerto ACTIVO debe tener un CLIENTE asignado.")
                
            # REGLA 3: Formato de IP Gestión
            if ip_gest and ip_gest.count('.') != 3:
                errores_fila.append("Formato de IP de Gestión inválido.")
            
            fila_obj = {
                "PUERTO": p_val,
                "ESTATUS": est,
                "SERVICIO": serv,
                "EQUIPO_ID": eq_id,
                "IP_GESTION": ip_gest,
                "_errores": errores_fila,
                "_valido": len(errores_fila) == 0
            }
            if not fila_obj["_valido"]: has_errors = True
            preview_data.append(fila_obj)

        if mode == "preview":
            return {"status": "success", "data": preview_data, "has_errors": has_errors}

        # LÓGICA DE ESCRITURA FINAL EN LA BASE DE DATOS
        db.query(PortModel).filter(PortModel.hub_id == str(id_hub).upper().strip()).delete()
        
        for _, row in df_data.iterrows():
            vals = list(row.values)
            if idx_puerto >= len(vals): continue
            p_val = str(vals[idx_puerto]).strip()
            if not p_val or p_val.upper() == "NAN" or p_val == "": continue
            def read_val(idx): return str(vals[idx]).strip() if (idx != -1 and idx < len(vals) and str(vals[idx]).upper() != "NAN") else ""
            
            db.add(PortModel(
                region=region_obj.nombre, ciudad=ciudad_obj.nombre, hub_id=str(id_hub).upper().strip(), 
                estatus=read_val(idx_status) or "DISPONIBLE GI", puerto=p_val, equipo_hotel_id=read_val(idx_equipo), 
                ip_hub=read_val(idx_iphub), servicio=read_val(idx_serv), mbps=read_val(idx_mbps), 
                ip_gestion=read_val(idx_ipgest), ip_cliente=read_val(idx_ipcli), bdi=read_val(idx_bdi), 
                potencia_hub=read_val(idx_pothub), potencia_cpe=read_val(idx_potcpe), id_mca=read_val(idx_id_mca), 
                contacto_nombre=read_val(idx_contacto_nombre), contacto_telefono=read_val(idx_contacto_telefono),
                serie_sfp_hub=read_val(idx_serie_sfp_hub), serie_sfp_client=read_val(idx_serie_sfp_cpe),
                ruta=read_val(idx_ruta), distancia_cliente=read_val(idx_distancia), lambdas=read_val(idx_lambdas),
                buffer=read_val(idx_buffer), hilos=read_val(idx_hilos), parcheo=read_val(idx_parcheo),
                marca_cpe=read_val(idx_marca), modelo_cpe=read_val(idx_modelo), serie_cpe=read_val(idx_serie_cpe),
                tipo_servicio=read_val(idx_tipo_servicio), direccion=read_val(idx_direccion), coordenadas=read_val(idx_coordenadas),
                fecha_entrega=read_val(idx_fecha_entrega), comentarios=read_val(idx_comentarios)
            ))
        db.commit()
        registrar_auditoria(db, current_user.username, "APROVISIONAMIENTO MASIVO", "CARGA EXCEL", f"Se cargó exitosamente el archivo en el HUB {id_hub}")
        return {"status": "success", "detail": "Aprovisionamiento masivo completado."}
    except Exception as e:
        try: db.rollback() 
        except: pass
        return JSONResponse(status_code=500, content={"status": "error", "detail": f"Fallo en importación: {str(e)}"})

# ================= EXPORTACIÓN EXCEL =================
@app.get("/api/hubs/exportar-excel")
def exportar_inventario_excel(region: str = None, ciudad: str = None, id_hub: str = None, db: Session = Depends(get_db)):
    try:
        query = db.query(PortModel)
        if region: query = query.filter(PortModel.region == region)
        if ciudad: query = query.filter(PortModel.ciudad == ciudad)
        if id_hub and id_hub != "TODOS": query = query.filter(PortModel.hub_id == id_hub)
        puertos = query.all()

        wb = Workbook()
        ws_dash = wb.active
        ws_dash.title = "Dashboard MT_DB"
        ws_dash.sheet_view.showGridLines = False

        for row in range(1, 40):
            for col in range(1, 15):
                ws_dash.cell(row=row, column=col).fill = PatternFill("solid", fgColor="F8F9FA")

        scope = id_hub if id_hub and id_hub != 'TODOS' else (ciudad if ciudad else 'RED GLOBAL')
        fecha_generacion = datetime.now().strftime('%Y-%m-%d %H:%M')
        
        ws_dash['B2'] = f"📊 REPORTE EJECUTIVO DE DISPONIBILIDAD ÓPTICA"
        ws_dash['B2'].font = Font(size=20, bold=True, color="FFFFFF")
        ws_dash['B2'].fill = PatternFill("solid", fgColor="0F172A") 
        ws_dash['B2'].alignment = Alignment(horizontal="center", vertical="center")
        ws_dash.merge_cells('B2:K3')

        ws_dash['B4'] = f"Alcance: {scope}   |   Generado el: {fecha_generacion}"
        ws_dash['B4'].font = Font(size=10, italic=True, color="475569")
        ws_dash['B4'].alignment = Alignment(horizontal="right", vertical="center")
        ws_dash.merge_cells('B4:K4')

        estatus_counts = {}
        for p in puertos:
            st = str(p.estatus).upper().strip()
            estatus_counts[st] = estatus_counts.get(st, 0) + 1

        total = len(puertos)
        activos = sum(v for k, v in estatus_counts.items() if "ACTIVO" in k)
        troncales = sum(v for k, v in estatus_counts.items() if "TRONCAL" in k)
        suspendidos = sum(v for k, v in estatus_counts.items() if "SUSPENDIDO" in k)

        disp_gi = sum(v for k, v in estatus_counts.items() if "DISPONIBLE GI" in k)
        disp_te = sum(v for k, v in estatus_counts.items() if "DISPONIBLE TE" in k)
        disp_25 = sum(v for k, v in estatus_counts.items() if "DISPONIBLE 25" in k)
        disp_100 = sum(v for k, v in estatus_counts.items() if "DISPONIBLE 100" in k)

        def draw_kpi(cell_title, cell_val, title, val, color_bg, color_txt="FFFFFF", text_size=24):
            col_title_let = cell_title[0]
            row_title_num = cell_title[1:]
            col_val_let = cell_val[0]
            row_val_num = cell_val[1:]

            ws_dash[cell_title] = title.upper()
            ws_dash[cell_title].font = Font(color=color_txt, bold=True, size=9)
            ws_dash[cell_title].fill = PatternFill("solid", fgColor=color_bg)
            ws_dash[cell_title].alignment = Alignment(horizontal="center", vertical="center")
            ws_dash.merge_cells(f"{cell_title}:{chr(ord(col_title_let)+1)}{row_title_num}")
            
            ws_dash[cell_val] = val
            ws_dash[cell_val].font = Font(size=text_size, bold=True, color=color_bg)
            ws_dash[cell_val].fill = PatternFill("solid", fgColor="FFFFFF")
            ws_dash[cell_val].alignment = Alignment(horizontal="center", vertical="center")
            ws_dash.merge_cells(f"{cell_val}:{chr(ord(col_val_let)+1)}{row_val_num}")
            
            thin_border = Border(
                left=Side(style='thin', color='CBD5E1'), right=Side(style='thin', color='CBD5E1'), 
                bottom=Side(style='thin', color='CBD5E1'), top=Side(style='thin', color='CBD5E1')
            )
            ws_dash[cell_title].border = thin_border
            ws_dash[chr(ord(col_title_let)+1)+row_title_num].border = thin_border
            ws_dash[cell_val].border = thin_border
            ws_dash[chr(ord(col_val_let)+1)+row_val_num].border = thin_border

        draw_kpi('B6', 'B7', "CAPACIDAD TOTAL", total, "1E293B")       
        draw_kpi('E6', 'E7', "PUERTOS ACTIVOS", activos, "0284C7")     
        draw_kpi('H6', 'H7', "ENLACES TRONCALES", troncales, "D97706") 
        draw_kpi('K6', 'K7', "SUSPENDIDOS", suspendidos, "DC2626")     

        draw_kpi('B9', 'B10', "DISPONIBLE GI (1G)", disp_gi, "16A34A") 
        draw_kpi('E9', 'E10', "DISPONIBLE TE (10G)", disp_te, "059669") 
        draw_kpi('H9', 'H10', "DISPONIBLE 25G", disp_25, "0891B2")     
        draw_kpi('K9', 'K10', "DISPONIBLE 100G", disp_100, "0284C7")    

        ws_dash['Z1'] = "Estatus"
        ws_dash['AA1'] = "Cantidad"
        row_idx = 2
        for k, v in estatus_counts.items():
            if v > 0: 
                ws_dash.cell(row=row_idx, column=26, value=k)
                ws_dash.cell(row=row_idx, column=27, value=v)
                row_idx += 1

        if estatus_counts and row_idx > 2:
            pie = PieChart()
            pie.title = "Distribución Operativa de la Red"
            labels = Reference(ws_dash, min_col=26, min_row=2, max_row=row_idx-1)
            data = Reference(ws_dash, min_col=27, min_row=1, max_row=row_idx-1)
            pie.add_data(data, titles_from_data=True)
            pie.set_categories(labels)
            pie.dataLabels = DataLabelList()
            pie.dataLabels.showPercent = True
            pie.width = 15
            pie.height = 10
            ws_dash.add_chart(pie, "C12")

        ws_dash.column_dimensions['Z'].hidden = True
        ws_dash.column_dimensions['AA'].hidden = True

        ws_data = wb.create_sheet(title="Matriz de Inventario")
        ws_data.sheet_view.showGridLines = False 

        headers = [
            "REGIÓN", "CIUDAD", "HUB / NODO", "ESTATUS", "PUERTO", "EQUIPO ID (CHASIS)", 
            "IP HUB", "IP GESTIÓN", "IP CLIENTE", "BDI", 
            "POTENCIA HUB", "POTENCIA CPE", "SERIE SFP HUB", "SERIE SFP CPE", 
            "RUTA", "DIST. CLIENTE", "LAMBDAS", "BUFFER", "HILOS", "PARCHEO", 
            "MARCA CPE", "MODELO CPE", "SERIE CPE", 
            "CLIENTE / SERVICIO", "TIPO SERVICIO", "ANCHO BANDA (MBPS)", 
            "DIRECCIÓN SERVICIO", "COORDENADAS", "NOMBRE CONTACTO", "TELÉFONO CONTACTO", 
            "FECHA DE ENTREGA", "COMENTARIOS"
        ]
        ws_data.append(headers)

        for col_idx in range(1, len(headers)+1):
            cell = ws_data.cell(row=1, column=col_idx)
            cell.font = Font(bold=True, color="FFFFFF", size=10)
            cell.fill = PatternFill("solid", fgColor="0F172A")
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        ws_data.row_dimensions[1].height = 25 

        center_align = Alignment(horizontal="center", vertical="center")
        left_align = Alignment(horizontal="left", vertical="center")

        for r_idx, p in enumerate(puertos, 2):
            row_data = [
                p.region, p.ciudad, p.hub_id, p.estatus, p.puerto, p.equipo_hotel_id,
                p.ip_hub, p.ip_gestion, p.ip_cliente, p.bdi,
                p.potencia_hub, p.potencia_cpe, p.serie_sfp_hub, p.serie_sfp_client,
                p.ruta, p.distancia_cliente, p.lambdas, p.buffer, p.hilos, p.parcheo,
                p.marca_cpe, p.modelo_cpe, p.serie_cpe,
                p.servicio, p.tipo_servicio, p.mbps,
                p.direccion, p.coordenadas, p.contacto_nombre, p.contacto_telefono,
                p.fecha_entrega, p.comentarios
            ]
            ws_data.append(row_data)
            
            for c_idx in range(1, len(row_data)+1):
                c_cell = ws_data.cell(row=r_idx, column=c_idx)
                if c_idx in [24, 27, 32]: c_cell.alignment = left_align
                else: c_cell.alignment = center_align

            c_est = ws_data.cell(row=r_idx, column=4)
            val = str(p.estatus).upper()
            if "ACTIVO" in val:
                c_est.fill = PatternFill("solid", fgColor="DCFCE7") 
                c_est.font = Font(color="166534", bold=True, size=10)
            elif "DISPONIBLE" in val:
                c_est.fill = PatternFill("solid", fgColor="F1F5F9") 
                c_est.font = Font(color="475569", bold=True, size=10)
            elif "SUSPENDIDO" in val:
                c_est.fill = PatternFill("solid", fgColor="FEE2E2") 
                c_est.font = Font(color="991B1B", bold=True, size=10)
            elif "TRONCAL" in val:
                c_est.fill = PatternFill("solid", fgColor="FEF3C7") 
                c_est.font = Font(color="92400E", bold=True, size=10)

        for col in ws_data.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if cell.value and len(str(cell.value)) > max_length: max_length = len(str(cell.value))
                except: pass
            ws_data.column_dimensions[column].width = max(12, min(max_length + 3, 45))

        if len(puertos) > 0:
            tab = Table(displayName="InventarioFichaTecnica", ref=f"A1:AF{len(puertos)+1}")
            tab.tableStyleInfo = TableStyleInfo(name="TableStyleLight1", showRowStripes=True)
            ws_data.add_table(tab)
            
        ws_data.freeze_panes = "A2" 

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        safe_scope = str(scope).replace("/", "-").replace(" ", "_")
        
        return StreamingResponse(
            output, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
            headers={
                "Content-Disposition": f"attachment; filename=MTDB_Ingenieria_{safe_scope}.xlsx",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e: return JSONResponse(status_code=500, content={"status": "error", "detail": f"Error construyendo archivo Excel: {str(e)}"})

# ================= ENDPOINTS CABEZALES =================
@app.get("/api/cabezales")
def get_cabezales(ciudad: str = None, id_equipo: str = None, db: Session = Depends(get_db)):
    query = db.query(CabezalModel)
    if ciudad: query = query.filter(CabezalModel.ciudad.ilike(f"%{ciudad}%"))
    if id_equipo: query = query.filter(CabezalModel.id_equipo.ilike(f"%{id_equipo}%"))
    return {"status": "success", "data": query.all()}

@app.get("/api/cabezales/{cabezal_id}/alineacion")
def get_alineacion(cabezal_id: int, db: Session = Depends(get_db)):
    alineaciones = db.query(AlineacionCabezalModel).filter(AlineacionCabezalModel.cabezal_id == cabezal_id).order_by(AlineacionCabezalModel.id.asc()).all()
    return {"status": "success", "data": alineaciones}

@app.put("/api/cabezales/{cabezal_id}")
def update_cabezal(cabezal_id: int, data: CabezalUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    cabezal = db.query(CabezalModel).filter(CabezalModel.id == cabezal_id).first()
    if not cabezal: raise HTTPException(status_code=404, detail="Cabezal no encontrado")
    for key, val in data.model_dump(exclude_unset=True).items(): setattr(cabezal, key, val)
    db.commit()
    return {"status": "success"}

@app.delete("/api/cabezales/{cabezal_id}")
def delete_cabezal(cabezal_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    cabezal = db.query(CabezalModel).filter(CabezalModel.id == cabezal_id).first()
    if cabezal:
        db.delete(cabezal)
        db.commit()
    return {"status": "success"}

@app.put("/api/alineaciones/{alineacion_id}")
def update_alineacion(alineacion_id: int, data: AlineacionUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    alineacion = db.query(AlineacionCabezalModel).filter(AlineacionCabezalModel.id == alineacion_id).first()
    if not alineacion: raise HTTPException(status_code=404, detail="Renglón de canal no encontrado")
    for key, val in data.model_dump(exclude_unset=True).items(): setattr(alineacion, key, val)
    db.commit()
    return {"status": "success"}

@app.delete("/api/alineaciones/{alineacion_id}")
def delete_alineacion(alineacion_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    alineacion = db.query(AlineacionCabezalModel).filter(AlineacionCabezalModel.id == alineacion_id).first()
    if alineacion:
        db.delete(alineacion)
        db.commit()
    return {"status": "success"}

@app.post("/api/cabezales/upload-excel")
async def upload_cabezales_excel(file: UploadFile = File(...), current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_upload_excel(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    filename = file.filename or ""
    if not (file.content_type in ALLOWED_EXCEL_MIME_TYPES or filename.lower().endswith(('.xlsx', '.xls'))):
        return JSONResponse(status_code=400, content={"status": "error", "detail": "El archivo debe ser un Excel válido."})
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents)).fillna("")
        column_headers = [str(col).upper().strip() for col in df.columns]

        def get_idx(targets):
            for t in targets:
                if t in column_headers: return column_headers.index(t)
            return -1

        idx_ciudad = get_idx(["CIUDAD"])
        idx_id = get_idx(["ID", "ID EQUIPO", "ID_EQUIPO"])
        idx_servicio = get_idx(["SERVICIO"])
        idx_gestion = get_idx(["GESTION QAM", "GESTIÓN QAM"])
        idx_marca = get_idx(["MARCA"])
        idx_modelo = get_idx(["MODELO"])
        idx_serie = get_idx(["SERIE"])
        idx_portadora = get_idx(["PORTADORA"])
        idx_formato = get_idx(["FORMATO"])
        idx_canal = get_idx(["# CANAL", "CANAL NUM", "CANAL"])
        idx_nombre = get_idx(["NOMBRE DE CANAL", "NOMBRE CANAL"])
        idx_mcast = get_idx(["MCAST IP", "MCAST_IP"])
        idx_source = get_idx(["SOURCE IP", "SOURCE_IP"])
        idx_udp = get_idx(["UDP"])
        idx_sid = get_idx(["SID"])

        if idx_id == -1 or idx_servicio == -1 or idx_ciudad == -1: return JSONResponse(status_code=400, content={"status": "error", "detail": "Columnas faltantes."})

        cabezales_procesados = set()
        for _, row in df.iterrows():
            vals = list(row.values)
            def read_val(idx): return str(vals[idx]).strip() if idx != -1 and idx < len(vals) else ""
            
            val_id = read_val(idx_id)
            val_servicio = read_val(idx_servicio)
            val_ciudad = read_val(idx_ciudad)

            if not val_id or not val_servicio or not val_ciudad: continue
            cabezal_key = f"{val_id.upper()}_{val_servicio.upper()}"

            cabezal = db.query(CabezalModel).filter(CabezalModel.id_equipo == val_id, CabezalModel.servicio == val_servicio).first()
            if not cabezal:
                cabezal = CabezalModel(id_equipo=val_id, servicio=val_servicio, ciudad=val_ciudad)
                db.add(cabezal)
                db.commit()
                db.refresh(cabezal)

            if cabezal_key not in cabezales_procesados:
                cabezal.ciudad = val_ciudad
                if idx_gestion != -1: cabezal.gestion_qam = read_val(idx_gestion)
                if idx_marca != -1: cabezal.marca = read_val(idx_marca)
                if idx_modelo != -1: cabezal.modelo = read_val(idx_modelo)
                if idx_serie != -1: cabezal.serie = read_val(idx_serie)
                db.commit()
                db.query(AlineacionCabezalModel).filter(AlineacionCabezalModel.cabezal_id == cabezal.id).delete()
                db.commit()
                cabezales_procesados.add(cabezal_key)

            canal_val = read_val(idx_canal)
            nombre_val = read_val(idx_nombre)
            if canal_val or nombre_val:
                db.add(AlineacionCabezalModel(
                    cabezal_id=cabezal.id, portadora=read_val(idx_portadora), formato=read_val(idx_formato),
                    canal_num=canal_val, nombre_canal=nombre_val, mcast_ip=read_val(idx_mcast),
                    source_ip=read_val(idx_source), udp=read_val(idx_udp), sid=read_val(idx_sid)
                ))
        db.commit()
        return {"status": "success", "detail": f"Proceso completado. {len(cabezales_procesados)} cabezales."}
    except Exception as e:
        try: db.rollback() 
        except: pass
        return JSONResponse(status_code=500, content={"status": "error", "detail": f"Error: {str(e)}"})

@app.get("/api/cabezales/{cabezal_id}/exportar-excel")
def exportar_alineacion_excel(cabezal_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        cabezal = db.query(CabezalModel).filter(CabezalModel.id == cabezal_id).first()
        if not cabezal: raise HTTPException(status_code=404, detail="Cabezal no encontrado")
            
        alineaciones = db.query(AlineacionCabezalModel).filter(AlineacionCabezalModel.cabezal_id == cabezal_id).order_by(AlineacionCabezalModel.id.asc()).all()
        wb = Workbook()
        ws = wb.active
        ws.title = "Alineacion_Canales"
        
        headers = ["PORTADORA", "FORMATO", "CANAL NUM", "NOMBRE DE CANAL", "MCAST IP", "SOURCE IP", "UDP", "SID"]
        ws.append(headers)
        
        for col_idx in range(1, len(headers)+1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill("solid", fgColor="0B132B")
            
        for al in alineaciones:
            ws.append([al.portadora, al.formato, al.canal_num, al.nombre_canal, al.mcast_ip, al.source_ip, al.udp, al.sid])
            
        for col in ws.columns: ws.column_dimensions[col[0].column_letter].width = 18
            
        if len(alineaciones) > 0:
            tab = Table(displayName=f"TablaAlineacion", ref=f"A1:H{len(alineaciones)+1}")
            tab.tableStyleInfo = TableStyleInfo(name="TableStyleMedium9", showRowStripes=True)
            ws.add_table(tab)
            
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        return StreamingResponse(
            output, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
            headers={
                "Content-Disposition": f"attachment; filename=Alineacion_{cabezal.id_equipo}.xlsx",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e: return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})

# ================= ENDPOINTS ANCHO DE BANDA CIUDADES =================
@app.get("/api/config-ciudades/{ciudad_nombre}")
def get_config_ciudad(ciudad_nombre: str, db: Session = Depends(get_db)):
    config = db.query(ConfigCiudadModel).filter(ConfigCiudadModel.ciudad_nombre == ciudad_nombre).first()
    return {"status": "success", "data": {"ancho_banda_total": config.ancho_banda_total if config else None}}

@app.put("/api/config-ciudades/{ciudad_nombre}")
def update_config_ciudad(ciudad_nombre: str, data: ConfigCiudadUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    config = db.query(ConfigCiudadModel).filter(ConfigCiudadModel.ciudad_nombre == ciudad_nombre).first()
    if config: config.ancho_banda_total = data.ancho_banda_total
    else: db.add(ConfigCiudadModel(ciudad_nombre=ciudad_nombre, ancho_banda_total=data.ancho_banda_total))
    db.commit()
    return {"status": "success"}

# ================= EXPORTACIÓN EXCEL DE PESTAÑA RESUMEN (DASHBOARD) =================
@app.post("/api/resumen/exportar-excel")
def exportar_resumen_excel(req: ResumenExportReq, current_user: UserModel = Depends(get_current_user)):
    try:
        wb = Workbook()
        ws = wb.active
        ws.title = "Resumen de Nodos"
        ws.sheet_view.showGridLines = False

        for row in range(1, 40):
            for col in range(1, 18):
                ws.cell(row=row, column=col).fill = PatternFill("solid", fgColor="F8F9FA")

        fecha_generacion = datetime.now().strftime('%Y-%m-%d %H:%M')
        
        ws['B2'] = f"📊 DASHBOARD DE DISPONIBILIDAD - {req.ciudad.upper()}"
        ws['B2'].font = Font(size=20, bold=True, color="FFFFFF")
        ws['B2'].fill = PatternFill("solid", fgColor="0F172A") 
        ws['B2'].alignment = Alignment(horizontal="center", vertical="center")
        ws.merge_cells('B2:P3')

        ws['B4'] = f"Generado el: {fecha_generacion}   |   Tráfico Total: {req.trafico_gbps} Gbps   |   Capacidad Backbone: {req.capacidad_total}"
        ws['B4'].font = Font(size=10, italic=True, color="475569")
        ws['B4'].alignment = Alignment(horizontal="right", vertical="center")
        ws.merge_cells('B4:P4')

        def draw_kpi_3col(start_col_let, start_row, title, val, color_bg):
            title_cell = f"{start_col_let}{start_row}"
            val_cell = f"{start_col_let}{start_row + 1}"
            
            ws[title_cell] = title.upper()
            ws[title_cell].font = Font(color="FFFFFF", bold=True, size=9)
            ws[title_cell].fill = PatternFill("solid", fgColor=color_bg)
            ws[title_cell].alignment = Alignment(horizontal="center", vertical="center")
            ws.merge_cells(f"{title_cell}:{chr(ord(start_col_let)+2)}{start_row}")
            
            ws[val_cell] = val
            ws[val_cell].font = Font(size=22, bold=True, color=color_bg)
            ws[val_cell].fill = PatternFill("solid", fgColor="FFFFFF")
            ws[val_cell].alignment = Alignment(horizontal="center", vertical="center")
            ws.merge_cells(f"{val_cell}:{chr(ord(start_col_let)+2)}{start_row + 1}")
            
            thin_border = Border(
                left=Side(style='thin', color='CBD5E1'), right=Side(style='thin', color='CBD5E1'), 
                bottom=Side(style='thin', color='CBD5E1'), top=Side(style='thin', color='CBD5E1')
            )
            for r in [start_row, start_row + 1]:
                ws[f"{start_col_let}{r}"].border = thin_border
                ws[f"{chr(ord(start_col_let)+2)}{r}"].border = thin_border

        draw_kpi_3col('B', 6, "CAPACIDAD (PUERTOS)", sum([h.total for h in req.hubs]), "1E293B")
        draw_kpi_3col('F', 6, "CLIENTES ACTIVOS", req.stats_activos, "0284C7")
        draw_kpi_3col('J', 6, "TOTAL DISPONIBLES", req.stats_total_disp, "16A34A")
        draw_kpi_3col('N', 6, "DISPONIBILIDAD B.W.", f"{req.disponibilidad_pct}%", "8B5CF6")

        ws['B10'] = "MATRIZ ESTADÍSTICA DE DISPONIBILIDAD POR NODO"
        ws['B10'].font = Font(bold=True, size=12, color="0F172A")
        
        headers = [
            "NODO / HUB", "ID NODO", "DISP. GI", "TOTAL GI", "DISP. TE", "TOTAL TE", 
            "DISP. 25G", "TOTAL 25G", "DISP. 100G", "TOTAL 100G",
            "ACTIVOS", "SUSPENDIDOS", "TRONCALES", "TOTAL DISP.", "LIBRES %"
        ]
        
        start_row = 11
        for col_idx, h in enumerate(headers, 2):
            c = ws.cell(row=start_row, column=col_idx, value=h)
            c.font = Font(bold=True, color="FFFFFF", size=9)
            c.fill = PatternFill("solid", fgColor="0F172A")
            c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        ws.row_dimensions[start_row].height = 25
            
        r_idx = start_row + 1
        for h in req.hubs:
            row_data = [
                h.nombre, h.id, h.disp_gi, h.total_gi, h.disp_te, h.total_te,
                h.disp_25, h.total_25, h.disp_100, h.total_100,
                h.activos, h.suspendidos, h.troncales, h.total_disp, f"{h.pct_libres}%"
            ]
            for c_idx, val in enumerate(row_data, 2):
                c = ws.cell(row=r_idx, column=c_idx, value=val)
                c.alignment = Alignment(horizontal="center", vertical="center")
                
                if c_idx == 16:
                    val_num = float(str(val).replace('%',''))
                    if val_num < 20: c.font = Font(bold=True, color="DC2626") 
                    elif val_num > 50: c.font = Font(bold=True, color="16A34A") 
                    else: c.font = Font(bold=True, color="D97706") 
            r_idx += 1

        if len(req.hubs) > 0:
            tab = Table(displayName="TablaNodos", ref=f"B{start_row}:P{r_idx-1}")
            tab.tableStyleInfo = TableStyleInfo(name="TableStyleLight1", showRowStripes=True)
            ws.add_table(tab)
            
        for col in range(2, 17): ws.column_dimensions[chr(64+col)].width = 13
        ws.column_dimensions['B'].width = 25 
        ws.column_dimensions['C'].width = 12

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        safe_scope = str(req.ciudad).replace("/", "-").replace(" ", "_")
        return StreamingResponse(
            output, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
            headers={
                "Content-Disposition": f"attachment; filename=Resumen_Nodos_{safe_scope}.xlsx",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e: return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})

# ================= ENDPOINT DE LECTURA DE AUDITORIA =================
@app.get("/api/auditoria")
def get_audit_logs(limit: int = 150, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    logs = db.query(AuditLogModel).order_by(AuditLogModel.id.desc()).limit(limit).all()
    return {"status": "success", "data": [{"id": l.id, "usuario": l.usuario, "accion": l.accion, "modulo": l.modulo, "detalle": l.detalle, "fecha": l.fecha} for l in logs]}

# ================= ARRANQUE DEL SERVIDOR =================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
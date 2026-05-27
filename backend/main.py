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

# ---> NUEVAS TABLAS PARA CABEZALES Y ALINEACIONES <---
class CabezalModel(Base):
    __tablename__ = "cabezales"
    id = Column(String(100), primary_key=True, index=True) # El ID será manual
    ciudad = Column(String(150))
    servicio = Column(String(150))
    gestion_qam = Column(String(100))
    marca = Column(String(100))
    modelo = Column(String(100))
    serie = Column(String(100))

class AlineacionModel(Base):
    __tablename__ = "alineaciones"
    id = Column(Integer, primary_key=True, autoincrement=True)
    cabezal_id = Column(String(100), ForeignKey("cabezales.id", ondelete="CASCADE"), index=True)
    portadora = Column(String(100))
    formato = Column(String(100))
    canal = Column(String(100))
    nombre_servicio = Column(String(200))
    mcast_ip = Column(String(100))
    source_ip = Column(String(100))
    udp = Column(String(100))
    sid = Column(String(100))

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

# ================= ESQUEMAS PYDANTIC =================
class UserLogin(BaseModel): username: str; password: str
class UserRegister(BaseModel):
    username: str; password: str; role: str; nombre_completo: str; plazas: str = "*"; num_empleado: str = None; correo: str = None; area_org: str = None; region_asignacion: str = None; puesto: str = None
class UserUpdate(BaseModel):
    username: str = None; password: str = None; role: str = None; nombre_completo: str = None; plazas: str = None; num_empleado: str = None; correo: str = None; area_org: str = None; region_asignacion: str = None; puesto: str = None
class GeographyRegionCreate(BaseModel): nombre: str
class GeographyCityCreate(BaseModel): id: str; nombre: str; region_id: int
class GeographyHubCreate(BaseModel): id: str; nombre: str; ciudad_id: str; direccion: str = None; coordenadas: str = None
class PortUpdate(BaseModel):
    ESTATUS: str = None; PUERTO: str = None; EQUIPO_HOTEL_ID: str = None; IP_HUB: str = None; NOMBRE_CORTO: str = None; ID_MCA: str = None; SERVICIO: str = None; POTENCIA_HUB: str = None; POTENCIA_CPE: str = None; TIPO_SERVICIO: str = None; MBPS: str = None; IP_GESTION: str = None; IP_CLIENTE: str = None; BDI: str = None; RUTA: str = None; BUFFER: str = None; HILOS: str = None; PARCHEO: str = None; LAMBDAS: str = None; DISTANCIA_CLIENTE: str = None; MARCA_CPE: str = None; MODELO_CPE: str = None; SERIE_CPE: str = None; FECHA_DE_ENTREGA: str = None; SERIE_SFP_HUB: str = None; SERIE_SFP_CLIENTE: str = None; EQUIPAMIENTO: str = None; SERIE: str = None; DIRECCION: str = None; COORDENADAS: str = None; COMENTARIOS: str = None; CONTACTO_NOMBRE: str = None; CONTACTO_TELEFONO: str = None

# SEED ADMINISTRADOR
try:
    db_init = SessionLocal()
    if db_init.query(UserModel).count() == 0:
        db_init.add(UserModel(username="admin", password_hash=hash_password(settings.admin_default_password), role="ADMIN", plazas="*", nombre_completo="Administrador del Sistema"))
        db_init.commit()
    db_init.close()
except Exception as e: print("Seed admin falló:", e)

app = FastAPI(title="MT_DB Enterprise API")

app.add_middleware(
    CORSMiddleware, allow_origins=settings.cors_origins_list, allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

@app.post("/api/auth/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash): return JSONResponse(status_code=400, content={"status": "error", "detail": "Credenciales inválidas"})
    access_token = jwt.encode({"sub": user.username, "role": user.role, "plazas": user.plazas, "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"status": "success", "token": access_token, "user": {"username": user.username, "role": user.role, "plazas": user.plazas,"nombre_completo": user.nombre_completo}}

@app.post("/api/auth/register")
def register(data: UserRegister, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    if db.query(UserModel).filter(UserModel.username == data.username.strip()).first(): raise HTTPException(status_code=400, detail="El usuario ya existe")
    db.add(UserModel(username=data.username.strip(), password_hash=hash_password(data.password), role=data.role, plazas=data.plazas, nombre_completo=data.nombre_completo.strip(),num_empleado=data.num_empleado, correo=data.correo, area_org=data.area_org, region_asignacion=data.region_asignacion, puesto=data.puesto))
    db.commit()
    return {"status": "success"}

@app.get("/api/users")
def list_all_users(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    return [{"id": u.id, "username": u.username, "role": u.role, "plazas": u.plazas, "nombre_completo": u.nombre_completo,"num_empleado": u.num_empleado, "correo": u.correo, "area_org": u.area_org, "region_asignacion": u.region_asignacion, "puesto": u.puesto} for u in db.query(UserModel).all()]

@app.put("/api/users/{user_id}")
def update_user_profile(user_id: int, data: UserUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user: raise HTTPException(status_code=404)
    if data.username: user.username = data.username.strip()
    if data.role: user.role = data.role
    if data.nombre_completo: user.nombre_completo = data.nombre_completo.strip()
    if data.plazas is not None: user.plazas = data.plazas
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

@app.get("/api/geography")
def get_geography_tree(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        ids_permitidos = None if current_user.plazas == "*" else [x.strip().upper() for x in current_user.plazas.split(",") if x.strip()]
        regiones = db.query(RegionModel).all()
        query_ciudades = db.query(CityModel)
        if ids_permitidos is not None: query_ciudades = query_ciudades.filter(CityModel.id.in_(ids_permitidos))
        ciudades = query_ciudades.all()
        ids_ciudades_filtradas = [c.id for c in ciudades]
        hubs = db.query(HubMappingModel).filter(HubMappingModel.ciudad_id.in_(ids_ciudades_filtradas)).all() if ids_ciudades_filtradas else []

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
    except Exception as e: return JSONResponse(status_code=500, content={"status": "error", "detail": f"Error leyendo topología: {str(e)}"})

@app.post("/api/geography/regions")
def create_region(data: GeographyRegionCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    db.add(RegionModel(nombre=data.nombre))
    db.commit()
    return {"status": "success"}

@app.put("/api/geography/regions/{region_id}")
def update_region(region_id: int, data: GeographyRegionCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    region = db.query(RegionModel).filter(RegionModel.id == region_id).first()
    if region: region.nombre = data.nombre.strip(); db.commit()
    return {"status": "success"}

@app.delete("/api/geography/regions/{region_id}")
def delete_region(region_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    db.query(RegionModel).filter(RegionModel.id == region_id).delete(); db.commit()
    return {"status": "success"}

@app.post("/api/geography/cities")
def create_city(data: GeographyCityCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    db.add(CityModel(id=data.id.upper().strip(), nombre=data.nombre.strip(), region_id=data.region_id)); db.commit()
    return {"status": "success"}

@app.put("/api/geography/cities/{city_id}")
def update_city(city_id: str, data: GeographyCityCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    ciudad = db.query(CityModel).filter(CityModel.id == city_id).first()
    if ciudad: ciudad.nombre = data.nombre.strip(); ciudad.region_id = data.region_id; db.commit()
    return {"status": "success"}

@app.delete("/api/geography/cities/{city_id}")
def delete_city(city_id: str, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    db.query(CityModel).filter(CityModel.id == city_id).delete(); db.commit()
    return {"status": "success"}

@app.post("/api/geography/hubs")
def assign_or_create_hub(data: GeographyHubCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    hub = db.query(HubMappingModel).filter(HubMappingModel.id == data.id.upper().strip()).first()
    if hub: hub.ciudad_id = data.ciudad_id.upper().strip(); hub.nombre = data.nombre; hub.direccion = data.direccion; hub.coordenadas = data.coordenadas
    else: db.add(HubMappingModel(id=data.id.upper().strip(), nombre=data.nombre, ciudad_id=data.ciudad_id.upper().strip(), direccion=data.direccion, coordenadas=data.coordenadas))
    db.commit()
    return {"status": "success"}

@app.delete("/api/geography/hubs/{hub_id}")
def delete_hub(hub_id: str, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    db.query(HubMappingModel).filter(HubMappingModel.id == hub_id.upper().strip()).delete(); db.commit()
    return {"status": "success"}

MAX_EXCEL_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_EXCEL_MIME_TYPES = {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"}

@app.post("/api/hubs/upload-excel")
def upload_hub_excel(id_hub: str = Query(...), file: UploadFile = File(...), current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    # EL CÓDIGO ORIGINAL DEL INVENTARIO SE MANTIENE INTACTO
    if not can_upload_excel(current_user): raise HTTPException(status_code=403)
    if not (file.content_type in ALLOWED_EXCEL_MIME_TYPES or file.filename.lower().endswith(('.xlsx', '.xls'))): return JSONResponse(status_code=400, content={"status": "error", "detail": "El archivo debe ser un Excel."})
    try:
        contents = file.file.read()
        if len(contents) > MAX_EXCEL_FILE_SIZE: return JSONResponse(status_code=400, content={"status": "error", "detail": "El archivo supera 5MB."})
        df = pd.read_excel(io.BytesIO(contents), header=None).fillna("")
        
        header_row_idx = 0
        for idx, row in df.iterrows():
            if "PUERTO" in [str(cell).upper().strip() for cell in row.values]:
                header_row_idx = idx; break
                
        column_headers = [str(cell).upper().strip() for cell in df.iloc[header_row_idx].values]
        df_data = df.iloc[header_row_idx + 1:]
        
        hub_cfg = db.query(HubMappingModel).filter(HubMappingModel.id == str(id_hub).upper().strip()).first()
        if not hub_cfg: return JSONResponse(status_code=400, content={"status": "error", "detail": f"El HUB '{id_hub}' no existe."})
        ciudad_obj = db.query(CityModel).filter(CityModel.id == hub_cfg.ciudad_id).first()
        region_obj = db.query(RegionModel).filter(RegionModel.id == ciudad_obj.region_id).first()
        
        def get_idx(targets, headers):
            for t in targets:
                if t in headers: return headers.index(t)
            return -1

        i_st = get_idx(["STATUS", "ESTATUS"], column_headers)
        i_prt = get_idx(["PUERTO"], column_headers)
        if i_prt == -1: return JSONResponse(status_code=400, content={"status": "error", "detail": "Falta columna PUERTO"})
        
        db.query(PortModel).filter(PortModel.hub_id == str(id_hub).upper().strip()).delete()
        for _, row in df_data.iterrows():
            vals = list(row.values)
            if i_prt >= len(vals): continue
            p_val = str(vals[i_prt]).strip()
            if not p_val or p_val.upper() == "NAN": continue
            def rv(i): return "" if i == -1 or i >= len(vals) or str(vals[i]).strip().upper() == "NAN" else str(vals[i]).strip()
            
            db.add(PortModel(
                region=region_obj.nombre, ciudad=ciudad_obj.nombre, hub_id=str(id_hub).upper().strip(),
                estatus=rv(i_st) or "DISPONIBLE GI", puerto=p_val, equipo_hotel_id=rv(get_idx(["EQUIPO/HOTEL ID", "EQUIPO"], column_headers)),
                ip_hub=rv(get_idx(["IP HUB", "IP_HUB"], column_headers)), nombre_corto=rv(get_idx(["NOMBRE CORTO"], column_headers)),
                id_mca=rv(get_idx(["ID MCA"], column_headers)), servicio=rv(get_idx(["SERVICIO"], column_headers)),
                potencia_hub=rv(get_idx(["POTENCIA HUB"], column_headers)), potencia_cpe=rv(get_idx(["POTENCIA CPE"], column_headers)),
                tipo_servicio=rv(get_idx(["TIPO SERVICIO"], column_headers)), mbps=rv(get_idx(["MBPS"], column_headers)),
                ip_gestion=rv(get_idx(["IP GESTION"], column_headers)), ip_cliente=rv(get_idx(["IP CLIENTE"], column_headers)),
                bdi=rv(get_idx(["BDI"], column_headers)), ruta=rv(get_idx(["RUTA"], column_headers)), buffer=rv(get_idx(["BUFFER"], column_headers)),
                hilos=rv(get_idx(["HILOS"], column_headers)), parcheo=rv(get_idx(["PARCHEO"], column_headers)),
                lambdas=rv(get_idx(["LAMBDAS"], column_headers)), distancia_cliente=rv(get_idx(["DISTANCIA CLIENTE"], column_headers)),
                marca_cpe=rv(get_idx(["MARCA CPE"], column_headers)), modelo_cpe=rv(get_idx(["MODELO CPE"], column_headers)),
                serie_cpe=rv(get_idx(["SERIE CPE"], column_headers)), fecha_entrega=rv(get_idx(["FECHA DE ENTREGA"], column_headers)),
                serie_sfp_hub=rv(get_idx(["SERIE SFP HUB"], column_headers)), serie_sfp_client=rv(get_idx(["SERIE SFP CLIENTE"], column_headers)),
                equipamiento=rv(get_idx(["EQUIPAMIENTO"], column_headers)), serie=rv(get_idx(["SERIE"], column_headers)), 
                direccion=rv(get_idx(["DIRECCIÓN", "DIRECCION"], column_headers)), coordenadas=rv(get_idx(["COORDENADAS"], column_headers)), 
                comentarios=rv(get_idx(["COMENTARIOS", "OBSERVACIONES"], column_headers)), contacto_nombre=rv(get_idx(["CONTACTO NOMBRE", "CONTACTO"], column_headers)), contacto_telefono=rv(get_idx(["CONTACTO TELEFONO", "TELEFONO"], column_headers))
            ))
        db.commit()
        return {"status": "success", "detail": "Aprovisionamiento masivo completado."}
    except Exception as e: db.rollback(); return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})

@app.get("/api/hubs")
def get_hub_ports(id_hub: str = Query("CTC"), db: Session = Depends(get_db)):
    try:
        puertos = db.query(PortModel).filter(PortModel.hub_id == str(id_hub).strip()).all()
        lista = [{c.name: getattr(p, c.name) for c in p.__table__.columns} for p in puertos]
        total_disp = sum(1 for x in lista if str(x.get("estatus", "")).strip().upper() in ["DISPONIBLE GI", "DISPONIBLE TE"])
        return {
            "status": "success", "hub": id_hub, 
            "resumen": { "total": len(lista), "disponibles": total_disp, "activos": sum(1 for x in lista if "ACTIVO" in str(x.get("estatus")).upper()), "suspendidos": sum(1 for x in lista if "SUSPENDIDO" in str(x.get("estatus")).upper()), "troncales": sum(1 for x in lista if "TRONCAL" in str(x.get("estatus")).upper()) }, 
            "puertos": [{k.upper(): v for k, v in p.items()} for p in lista]
        }
    except Exception as e: return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})

@app.put("/api/ports/{port_id}")
def update_port_data(port_id: int, data: PortUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    db_port = db.query(PortModel).filter(PortModel.id == port_id).first()
    if not db_port: raise HTTPException(status_code=404)
    for key, val in data.model_dump(exclude_unset=True).items(): 
        attr_name = key.lower().replace("fecha_de_entrega", "fecha_entrega").replace("serie_sfp_cliente", "serie_sfp_client")
        setattr(db_port, attr_name, val)
    db.commit(); return {"status": "success"}

@app.get("/api/ports/clients")
def get_clients_status(db: Session = Depends(get_db)):
    try:
        activos = db.query(PortModel).filter(PortModel.estatus == "ACTIVO").all()
        suspendidos = db.query(PortModel).filter(PortModel.estatus == "SUSPENDIDO").all()
        return {"status": "success", "activos": [{k.upper(): v for k, v in p.__dict__.items() if not k.startswith("_")} for p in activos], "suspendidos": [{k.upper(): v for k, v in p.__dict__.items() if not k.startswith("_")} for p in suspendidos]}
    except Exception as e: return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})

# ==============================================================================
# ---> NUEVOS ENDPOINTS PARA CABEZALES <---
# ==============================================================================

@app.get("/api/cabezales")
def get_cabezales(db: Session = Depends(get_db)):
    """Obtiene todos los cabezales y empareja sus alineaciones como un array interno."""
    try:
        cabezales = db.query(CabezalModel).all()
        alineaciones = db.query(AlineacionModel).all()
        
        # Agrupar alineaciones por el ID del cabezal
        alineaciones_dict = {}
        for a in alineaciones:
            if a.cabezal_id not in alineaciones_dict: alineaciones_dict[a.cabezal_id] = []
            alineaciones_dict[a.cabezal_id].append({
                "portadora": a.portadora, "formato": a.formato, "canal": a.canal, 
                "nombre_servicio": a.nombre_servicio, "mcast_ip": a.mcast_ip, 
                "source_ip": a.source_ip, "udp": a.udp, "sid": a.sid
            })
            
        resultado = []
        for c in cabezales:
            resultado.append({
                "id": c.id, "ciudad": c.ciudad, "servicio": c.servicio, 
                "gestion_qam": c.gestion_qam, "marca": c.marca, "modelo": c.modelo, "serie": c.serie,
                "alineacion": alineaciones_dict.get(c.id, []) # Añadir el arreglo de alineaciones
            })
            
        return {"status": "success", "data": resultado}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})

@app.post("/api/cabezales/upload-excel")
def upload_cabezales_excel(
    file: UploadFile = File(...), 
    current_user: UserModel = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Sube un Excel masivo de cabezales y su alineación."""
    if not can_upload_excel(current_user): 
        raise HTTPException(status_code=403, detail="Permisos insuficientes")
        
    if not (file.content_type in ALLOWED_EXCEL_MIME_TYPES or file.filename.lower().endswith(('.xlsx', '.xls'))):
        return JSONResponse(status_code=400, content={"status": "error", "detail": "Debe ser un archivo Excel (.xlsx o .xls)."})
        
    try:
        contents = file.file.read()
        df = pd.read_excel(io.BytesIO(contents), header=None).fillna("")
        
        # Buscar en qué fila están las columnas
        header_row_idx = 0
        for idx, row in df.iterrows():
            if "ID" in [str(cell).upper().strip() for cell in row.values]:
                header_row_idx = idx
                break
                
        column_headers = [str(cell).upper().strip() for cell in df.iloc[header_row_idx].values]
        df_data = df.iloc[header_row_idx + 1:]
        
        def get_index(targets):
            for t in targets:
                if t in column_headers: return column_headers.index(t)
            return -1

        idx_id = get_index(["ID", "ID CABEZAL"])
        idx_ciudad = get_index(["CIUDAD"])
        idx_servicio = get_index(["SERVICIO", "NOMBRE DE SERVICIO CABEZAL"])
        idx_gqam = get_index(["GESTION QAM", "GESTIÓN QAM", "IP GESTION"])
        idx_marca = get_index(["MARCA"])
        idx_modelo = get_index(["MODELO"])
        idx_serie = get_index(["SERIE"])
        
        idx_port = get_index(["PORTADORA"])
        idx_form = get_index(["FORMATO"])
        idx_can = get_index(["# CANAL", "CANAL", "NUM CANAL"])
        idx_nserv = get_index(["NOMBRE DE SERVICIO", "NOMBRE SERVICIO"])
        idx_mcast = get_index(["MCAST IP", "IP MCAST"])
        idx_src = get_index(["SOURCE IP", "IP SOURCE"])
        idx_udp = get_index(["UDP"])
        idx_sid = get_index(["SID"])

        if idx_id == -1: 
            return JSONResponse(status_code=400, content={"status": "error", "detail": "El Excel no contiene la columna 'ID'."})

        cabezales_dict = {}
        alineaciones_list = []

        for _, row in df_data.iterrows():
            vals = list(row.values)
            if idx_id >= len(vals): continue
            
            c_id = str(vals[idx_id]).strip()
            if not c_id or c_id.upper() == "NAN": continue
            
            def read_val(idx):
                return "" if idx == -1 or idx >= len(vals) or str(vals[idx]).strip().upper() == "NAN" else str(vals[idx]).strip()

            # Guardar/Sobrescribir datos del cabezal para asegurar que los metadatos principales se guarden
            cabezales_dict[c_id] = {
                "ciudad": read_val(idx_ciudad), "servicio": read_val(idx_servicio),
                "gestion_qam": read_val(idx_gqam), "marca": read_val(idx_marca),
                "modelo": read_val(idx_modelo), "serie": read_val(idx_serie)
            }
            
            # Si hay una portadora o canal o nombre de servicio en la fila, agregarlo a las alineaciones
            portadora = read_val(idx_port)
            canal = read_val(idx_can)
            n_servicio = read_val(idx_nserv)
            
            if portadora or canal or n_servicio:
                alineaciones_list.append({
                    "cabezal_id": c_id, "portadora": portadora, "formato": read_val(idx_form),
                    "canal": canal, "nombre_servicio": n_servicio, "mcast_ip": read_val(idx_mcast),
                    "source_ip": read_val(idx_src), "udp": read_val(idx_udp), "sid": read_val(idx_sid)
                })

        # Para los IDs presentes en el Excel, eliminamos sus datos antiguos para meter los nuevos (Upsert)
        for c_id in cabezales_dict.keys():
            db.query(AlineacionModel).filter(AlineacionModel.cabezal_id == c_id).delete()
            cabezal_db = db.query(CabezalModel).filter(CabezalModel.id == c_id).first()
            if cabezal_db:
                # Update
                cabezal_db.ciudad = cabezales_dict[c_id]["ciudad"]
                cabezal_db.servicio = cabezales_dict[c_id]["servicio"]
                cabezal_db.gestion_qam = cabezales_dict[c_id]["gestion_qam"]
                cabezal_db.marca = cabezales_dict[c_id]["marca"]
                cabezal_db.modelo = cabezales_dict[c_id]["modelo"]
                cabezal_db.serie = cabezales_dict[c_id]["serie"]
            else:
                # Insert
                db.add(CabezalModel(id=c_id, **cabezales_dict[c_id]))

        # Insertar todas las alineaciones
        for a_data in alineaciones_list:
            db.add(AlineacionModel(**a_data))

        db.commit()
        return {"status": "success", "detail": "Cabezales cargados y actualizados exitosamente."}
    
    except Exception as e:
        db.rollback()
        import traceback
        error_detallado = traceback.format_exc()
        print(f"\n=== ERROR FATAL AL SUBIR EXCEL CABEZALES ===\n{error_detallado}\n============================================\n")
        return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
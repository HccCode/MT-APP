from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt

from config import settings
from database import get_db
from models import UserModel
from schemas import UserLogin, UserRegister, UserUpdate
from security import get_current_user, is_admin, verify_password, hash_password

# Importamos las dependencias de seguridad y rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

# ================= EL ROUTER CRÍTICO =================
router = APIRouter(prefix="/api/auth", tags=["Auth & Users"])

@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        logger.warning(f"Intrusión bloqueada. User: {data.username} IP: {request.client.host}")
        return JSONResponse(status_code=400, content={"status": "error", "detail": "Credenciales inválidas"})
    
    access_token = jwt.encode(
        {"sub": user.username, "role": user.role, "plazas": user.plazas, "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)}, 
        SECRET_KEY, 
        algorithm=ALGORITHM
    )
    return {
        "status": "success", 
        "token": access_token, 
        "user": {
            "username": user.username, 
            "role": user.role, 
            "plazas": user.plazas, 
            "pestanas": user.pestanas, 
            "nombre_completo": user.nombre_completo
        }
    }

@router.post("/register")
def register(data: UserRegister, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    if db.query(UserModel).filter(UserModel.username == data.username.strip()).first(): 
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    
    nuevo_usuario = UserModel(
        username=data.username.strip(), 
        password_hash=hash_password(data.password), 
        role=data.role, 
        plazas=data.plazas, 
        pestanas=data.pestanas, 
        nombre_completo=data.nombre_completo.strip(), 
        num_empleado=data.num_empleado, 
        correo=data.correo, 
        area_org=data.area_org, 
        region_asignacion=data.region_asignacion, 
        puesto=data.puesto
    )
    db.add(nuevo_usuario)
    db.commit()
    return {"status": "success"}

@router.get("/users")
def list_all_users(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    usuarios = db.query(UserModel).all()
    return [{
        "id": u.id, "username": u.username, "role": u.role, "plazas": u.plazas, "pestanas": u.pestanas, 
        "nombre_completo": u.nombre_completo,"num_empleado": u.num_empleado, "correo": u.correo, 
        "area_org": u.area_org, "region_asignacion": u.region_asignacion, "puesto": u.puesto
    } for u in usuarios]

@router.put("/users/{user_id}")
def update_user_profile(user_id: int, data: UserUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user: raise HTTPException(status_code=404)
    
    if data.username: user.username = data.username.strip()
    if data.role: user.role = data.role
    if data.nombre_completo: user.nombre_completo = data.nombre_completo.strip()
    if data.plazas is not None: user.plazas = data.plazas
    if data.pestanas is not None: user.pestanas = data.pestanas
    if data.password and data.password.strip() != "": user.password_hash = hash_password(data.password)
    db.commit()
    return {"status": "success"}

@router.delete("/users/{user_id}")
def delete_user_profile(user_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user) or current_user.id == user_id: 
        raise HTTPException(status_code=400, detail="Operación no permitida")
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if user: 
        db.delete(user)
        db.commit()
    return {"status": "success"}
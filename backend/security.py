from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import bcrypt
from datetime import datetime
import logging

from database import get_db
from models import UserModel, AuditLogModel
from config import settings

logger = logging.getLogger(__name__)

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

def get_current_user(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Falta la cabecera de autorizacion (Authorization: Bearer <token>) o el formato es invalido"
        )
    
    token = auth_header.replace("Bearer ", "").strip()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None: 
            raise HTTPException(status_code=401, detail="El token decodificado no contiene la propiedad obligatoria 'sub'")
    except JWTError as e: 
        raise HTTPException(status_code=401, detail=f"Fallo critico al validar firma o expiracion del JWT: {str(e)}")
        
    user = db.query(UserModel).filter(UserModel.username == username).first()
    if user is None: 
        raise HTTPException(status_code=401, detail=f"El usuario '{username}' extraido del token ya no existe en el sistema")
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
        logger.error(f"Fallo crítico al registrar auditoría: {str(e)}")
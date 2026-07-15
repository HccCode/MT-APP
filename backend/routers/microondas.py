from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import UserModel, MicroondaUbiquitiModel
from schemas import MicroondaUbiquitiCreate, MicroondaUbiquitiUpdate
from security import get_current_user, can_edit_ports, registrar_auditoria

router = APIRouter(prefix="/api/microondas", tags=["Microondas Ubiquiti"])

@router.get("")
def get_microondas(ciudad: str = None, q: str = None, db: Session = Depends(get_db)):
    query = db.query(MicroondaUbiquitiModel)
    if ciudad: 
        query = query.filter(MicroondaUbiquitiModel.ciudad.ilike(f"%{ciudad}%"))
    
    enlaces = query.all()
    
    # Búsqueda manual rápida
    if q:
        q_lower = q.lower()
        enlaces = [e for e in enlaces if 
                   q_lower in str(e.cliente).lower() or 
                   q_lower in str(e.ip_gestion_ap).lower() or 
                   q_lower in str(e.ip_gestion_st).lower() or 
                   q_lower in str(e.ssid).lower()]
                   
    return {"status": "success", "data": enlaces}

@router.post("")
def create_microonda(data: MicroondaUbiquitiCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    nuevo_enlace = MicroondaUbiquitiModel(**data.model_dump())
    db.add(nuevo_enlace)
    db.commit()
    registrar_auditoria(db, current_user.username, "ALTA MICROONDA", "UBIQUITI", f"Creó enlace para {data.cliente}")
    return {"status": "success"}

@router.put("/{enlace_id}")
def update_microonda(enlace_id: int, data: MicroondaUbiquitiUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    enlace = db.query(MicroondaUbiquitiModel).filter(MicroondaUbiquitiModel.id == enlace_id).first()
    if not enlace: raise HTTPException(status_code=404)
    
    for key, val in data.model_dump(exclude_unset=True).items(): 
        setattr(enlace, key, val)
        
    db.commit()
    registrar_auditoria(db, current_user.username, "EDICIÓN MICROONDA", "UBIQUITI", f"Modificó enlace de {enlace.cliente}")
    return {"status": "success"}

@router.delete("/{enlace_id}")
def delete_microonda(enlace_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    enlace = db.query(MicroondaUbiquitiModel).filter(MicroondaUbiquitiModel.id == enlace_id).first()
    if enlace:
        db.delete(enlace)
        db.commit()
    return {"status": "success"}
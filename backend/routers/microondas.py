from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import UserModel, MicroondaUbiquitiModel, MicroondasRadioBaseModel, MicroondasAccessPointModel
from schemas import MicroondaUbiquitiCreate, MicroondaUbiquitiUpdate, MWRadioBaseCreate, MWAccessPointCreate
from security import get_current_user, can_edit_ports, registrar_auditoria

router = APIRouter(prefix="/api/microondas", tags=["Microondas Ubiquiti"])

# ================= RADIO BASES =================
@router.get("/radiobases")
def get_radiobases(db: Session = Depends(get_db)):
    return {"status": "success", "data": db.query(MicroondasRadioBaseModel).all()}

@router.post("/radiobases")
def create_radiobase(data: MWRadioBaseCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    if db.query(MicroondasRadioBaseModel).filter(MicroondasRadioBaseModel.nombre == data.nombre.strip()).first():
        raise HTTPException(status_code=400, detail="Esta Radio Base ya existe.")
    
    db.add(MicroondasRadioBaseModel(**data.model_dump()))
    db.commit()
    return {"status": "success"}

@router.put("/radiobases/{rb_id}")
def update_radiobase(rb_id: int, data: MWRadioBaseCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    rb = db.query(MicroondasRadioBaseModel).filter(MicroondasRadioBaseModel.id == rb_id).first()
    if not rb: raise HTTPException(status_code=404)
    for key, val in data.model_dump().items(): setattr(rb, key, val)
    db.commit()
    return {"status": "success"}

@router.delete("/radiobases/{rb_id}")
def delete_radiobase(rb_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    rb = db.query(MicroondasRadioBaseModel).filter(MicroondasRadioBaseModel.id == rb_id).first()
    if rb:
        db.delete(rb)
        db.commit()
    return {"status": "success"}

# ================= ACCESS POINTS =================
@router.get("/accesspoints")
def get_accesspoints(db: Session = Depends(get_db)):
    return {"status": "success", "data": db.query(MicroondasAccessPointModel).all()}

@router.post("/accesspoints")
def create_accesspoint(data: MWAccessPointCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    db.add(MicroondasAccessPointModel(**data.model_dump()))
    db.commit()
    return {"status": "success"}

@router.put("/accesspoints/{ap_id}")
def update_accesspoint(ap_id: int, data: MWAccessPointCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    ap = db.query(MicroondasAccessPointModel).filter(MicroondasAccessPointModel.id == ap_id).first()
    if not ap: raise HTTPException(status_code=404)
    for key, val in data.model_dump().items(): setattr(ap, key, val)
    db.commit()
    return {"status": "success"}

@router.delete("/accesspoints/{ap_id}")
def delete_accesspoint(ap_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    ap = db.query(MicroondasAccessPointModel).filter(MicroondasAccessPointModel.id == ap_id).first()
    if ap:
        db.query(MicroondaUbiquitiModel).filter(MicroondaUbiquitiModel.ap_id == ap.id).update({"ap_id": None}) # Desvincula clientes
        db.delete(ap)
        db.commit()
    return {"status": "success"}

# ================= ENLACES / CLIENTES =================
@router.get("")
def get_microondas(ciudad: str = None, q: str = None, db: Session = Depends(get_db)):
    query = db.query(MicroondaUbiquitiModel)
    if ciudad: query = query.filter(MicroondaUbiquitiModel.ciudad.ilike(f"%{ciudad}%"))
    enlaces = query.all()
    if q:
        q_lower = q.lower()
        enlaces = [e for e in enlaces if q_lower in str(e.cliente).lower() or q_lower in str(e.ip_gestion_st).lower() or q_lower in str(e.ssid).lower()]
    return {"status": "success", "data": enlaces}

@router.post("")
def create_microonda(data: MicroondaUbiquitiCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    nuevo_enlace = MicroondaUbiquitiModel(**data.model_dump(exclude_unset=True))
    db.add(nuevo_enlace)
    db.commit()
    return {"status": "success"}

@router.put("/{enlace_id}")
def update_microonda(enlace_id: int, data: MicroondaUbiquitiUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    enlace = db.query(MicroondaUbiquitiModel).filter(MicroondaUbiquitiModel.id == enlace_id).first()
    if not enlace: raise HTTPException(status_code=404)
    for key, val in data.model_dump(exclude_unset=True).items(): setattr(enlace, key, val)
    db.commit()
    return {"status": "success"}

@router.delete("/{enlace_id}")
def delete_microonda(enlace_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    enlace = db.query(MicroondaUbiquitiModel).filter(MicroondaUbiquitiModel.id == enlace_id).first()
    if enlace:
        db.delete(enlace)
        db.commit()
    return {"status": "success"}
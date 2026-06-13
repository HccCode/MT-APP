from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import get_db
from models import UserModel, RegionModel, CityModel, HubMappingModel, PortModel
from schemas import GeographyRegionCreate, GeographyCityCreate, GeographyHubCreate
from security import get_current_user, is_admin

# ================= EL ROUTER =================
router = APIRouter(prefix="/api/geography", tags=["Geography"])

@router.get("")
def get_geography_tree(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        ids_permitidos = None if (is_admin(current_user) or current_user.plazas == "*") else [x.strip().upper() for x in current_user.plazas.split(",") if x.strip()]
        regiones = db.query(RegionModel).all()
        query_ciudades = db.query(CityModel)
        
        if ids_permitidos is not None: 
            query_ciudades = query_ciudades.filter(CityModel.id.in_(ids_permitidos))
        ciudades = query_ciudades.all()
        
        ids_ciudades_filtradas = [c.id for c in ciudades]
        hubs = db.query(HubMappingModel).filter(HubMappingModel.ciudad_id.in_(ids_ciudades_filtradas)).all() if ids_ciudades_filtradas else []
            
        hubs_por_ciudad = {}
        for h in hubs:
            hubs_por_ciudad.setdefault(h.ciudad_id, []).append({"id": h.id, "nombre": h.nombre, "direccion": h.direccion, "coordenadas": h.coordenadas})
            
        ciudades_por_region = {}
        for c in ciudades:
            ciudades_por_region.setdefault(c.region_id, []).append({"id": c.id, "nombre": c.nombre, "hubs": hubs_por_ciudad.get(c.id, [])})
            
        tree = {}
        for r in regiones:
            ciudades_region = ciudades_por_region.get(r.id, [])
            if ids_permitidos is not None and not ciudades_region: continue
            tree[r.nombre] = {"id": r.id, "ciudades": {c["nombre"]: {"id": c["id"], "hubs": c["hubs"]} for c in ciudades_region}}
            
        return tree
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "detail": f"Error leyendo topología: {str(e)}"})

@router.post("/regions")
def create_region(data: GeographyRegionCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    if db.query(RegionModel).filter(RegionModel.nombre.ilike(data.nombre.strip())).first(): 
        raise HTTPException(status_code=400, detail="Región ya registrada")
    
    nueva = RegionModel(nombre=data.nombre.strip())
    db.add(nueva)
    db.commit()
    return {"status": "success", "id": nueva.id}

@router.delete("/regions/{region_id}")
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

@router.post("/cities")
def create_city(data: GeographyCityCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    db.add(CityModel(id=data.id.upper().strip(), nombre=data.nombre.strip(), region_id=data.region_id))
    db.commit()
    return {"status": "success"}

@router.delete("/cities/{city_id}")
def delete_city(city_id: str, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):  
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    ciudad = db.query(CityModel).filter(CityModel.id == city_id).first()
    if ciudad:
        hubs = db.query(HubMappingModel).filter(HubMappingModel.ciudad_id == city_id).all()
        for h in hubs: db.query(PortModel).filter(PortModel.hub_id == h.id).delete()
        db.delete(ciudad)
        db.commit()
    return {"status": "success"}

@router.post("/hubs")
def assign_or_create_hub(data: GeographyHubCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user) and not ("*" in current_user.pestanas or "geografia" in current_user.pestanas):
        raise HTTPException(status_code=403, detail="Permisos insuficientes.")
    
    hub = db.query(HubMappingModel).filter(HubMappingModel.id == data.id.upper().strip()).first()
    if hub:
        hub.ciudad_id = data.ciudad_id.upper().strip()
        hub.nombre = data.nombre
    else:
        db.add(HubMappingModel(id=data.id.upper().strip(), nombre=data.nombre, ciudad_id=data.ciudad_id.upper().strip(), direccion=data.direccion, coordenadas=data.coordenadas))
    db.commit()
    return {"status": "success"}

@router.delete("/hubs/{hub_id}")
def delete_hub(hub_id: str, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    hub = db.query(HubMappingModel).filter(HubMappingModel.id == hub_id.upper().strip()).first()
    if hub:
        db.query(PortModel).filter(PortModel.hub_id == hub.id).delete()
        db.delete(hub)
        db.commit()
    return {"status": "success"}
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import get_db
from models import RegionModel, CityModel, HubMappingModel, PortModel, UserModel
from schemas import GeographyRegionCreate, GeographyCityCreate, GeographyHubCreate
from security import get_current_user, is_admin

router = APIRouter(prefix="/api/geography", tags=["Topología y Geografía"])

@router.get("")
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
    except Exception as e: 
        return JSONResponse(status_code=500, content={"status": "error", "detail": f"Error leyendo topología: {str(e)}"})

@router.post("/regions")
def create_region(data: GeographyRegionCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403, detail="Permisos insuficientes")
    if db.query(RegionModel).filter(RegionModel.nombre.ilike(data.nombre.strip())).first(): raise HTTPException(status_code=400, detail="La región ya existe")
    nueva = RegionModel(nombre=data.nombre.strip())
    db.add(nueva)
    db.commit()
    return {"status": "success", "id": nueva.id}

@router.put("/regions/{region_id}")
def update_region(region_id: int, data: GeographyRegionCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    region = db.query(RegionModel).filter(RegionModel.id == region_id).first()
    if not region: raise HTTPException(status_code=404)
    region.nombre = data.nombre.strip()
    db.commit()
    return {"status": "success"}

@router.delete("/regions/{region_id}")
def delete_region(region_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
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
    if not is_admin(current_user): raise HTTPException(status_code=403)
    id_limpio = data.id.upper().strip()
    if db.query(CityModel).filter(CityModel.id == id_limpio).first() or db.query(CityModel).filter(CityModel.nombre.ilike(data.nombre.strip())).first(): 
        raise HTTPException(status_code=400, detail="El ID o Nombre ya existe")
    db.add(CityModel(id=id_limpio, nombre=data.nombre.strip(), region_id=data.region_id))
    db.commit()
    return {"status": "success"}

@router.put("/cities/{city_id}")
def update_city(city_id: str, data: GeographyCityCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_admin(current_user): raise HTTPException(status_code=403)
    ciudad = db.query(CityModel).filter(CityModel.id == city_id).first()
    if not ciudad: raise HTTPException(status_code=404)
    ciudad.nombre = data.nombre.strip()
    ciudad.region_id = data.region_id
    db.commit()
    return {"status": "success"}

@router.delete("/cities/{city_id}")
def delete_city(city_id: str, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):  
    if not is_admin(current_user): raise HTTPException(status_code=403)
    ciudad = db.query(CityModel).filter(CityModel.id == city_id).first()
    if ciudad:
        hubs = db.query(HubMappingModel).filter(HubMappingModel.ciudad_id == city_id).all()
        for h in hubs: db.query(PortModel).filter(PortModel.hub_id == h.id).delete()
        db.delete(ciudad)
        db.commit()
    return {"status": "success"}

@router.post("/hubs")
def assign_or_create_hub(data: GeographyHubCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    pestanas = [p.strip().lower() for p in str(current_user.pestanas).split(",")]
    if not is_admin(current_user) and "*" not in pestanas and "geografia" not in pestanas: raise HTTPException(status_code=403)
        
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

@router.delete("/hubs/{hub_id}")
def delete_hub(hub_id: str, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    pestanas = [p.strip().lower() for p in str(current_user.pestanas).split(",")]
    if not is_admin(current_user) and "*" not in pestanas and "geografia" not in pestanas: raise HTTPException(status_code=403)
        
    hub = db.query(HubMappingModel).filter(HubMappingModel.id == hub_id.upper().strip()).first()
    if hub:
        db.query(PortModel).filter(PortModel.hub_id == hub.id).delete()
        db.delete(hub)
        db.commit()
    return {"status": "success"}
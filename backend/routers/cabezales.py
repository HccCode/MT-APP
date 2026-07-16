from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
import pandas as pd
import io
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.worksheet.table import Table, TableStyleInfo

from database import get_db
from models import CabezalModel, AlineacionCabezalModel, UserModel
from schemas import CabezalUpdate, AlineacionUpdate
from config import ALLOWED_EXCEL_MIME_TYPES
from security import get_current_user, can_edit_ports, can_upload_excel, registrar_auditoria

router = APIRouter(prefix="/api", tags=["Cabezales y Alineación"])

@router.get("/cabezales")
def get_cabezales(ciudad: str = None, id_equipo: str = None, db: Session = Depends(get_db)):
    query = db.query(CabezalModel)
    if ciudad: query = query.filter(CabezalModel.ciudad.ilike(f"%{ciudad}%"))
    if id_equipo: query = query.filter(CabezalModel.id_equipo.ilike(f"%{id_equipo}%"))
    return {"status": "success", "data": query.all()}

@router.get("/cabezales/{cabezal_id}/alineacion")
def get_alineacion(cabezal_id: int, db: Session = Depends(get_db)):
    return {"status": "success", "data": db.query(AlineacionCabezalModel).filter(AlineacionCabezalModel.cabezal_id == cabezal_id).order_by(AlineacionCabezalModel.id.asc()).all()}

@router.put("/cabezales/{cabezal_id}")
def update_cabezal(cabezal_id: int, data: CabezalUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    cabezal = db.query(CabezalModel).filter(CabezalModel.id == cabezal_id).first()
    if not cabezal: raise HTTPException(status_code=404)
    for key, val in data.model_dump(exclude_unset=True).items(): setattr(cabezal, key, val)
    db.commit()
    return {"status": "success"}

@router.delete("/cabezales/{cabezal_id}")
def delete_cabezal(cabezal_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    cabezal = db.query(CabezalModel).filter(CabezalModel.id == cabezal_id).first()
    if cabezal:
        db.delete(cabezal)
        db.commit()
    return {"status": "success"}

@router.put("/alineaciones/{alineacion_id}")
def update_alineacion(alineacion_id: int, data: AlineacionUpdate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    alineacion = db.query(AlineacionCabezalModel).filter(AlineacionCabezalModel.id == alineacion_id).first()
    if not alineacion: raise HTTPException(status_code=404)
    for key, val in data.model_dump(exclude_unset=True).items(): setattr(alineacion, key, val)
    db.commit()
    return {"status": "success"}

@router.delete("/alineaciones/{alineacion_id}")
def delete_alineacion(alineacion_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if not can_edit_ports(current_user): raise HTTPException(status_code=403)
    alineacion = db.query(AlineacionCabezalModel).filter(AlineacionCabezalModel.id == alineacion_id).first()
    if alineacion:
        db.delete(alineacion)
        db.commit()
    return {"status": "success"}

@router.post("/cabezales/upload-excel")
async def upload_cabezales_excel(
    ciudad: str = Query(...), # AÑADIDO PARA EVITAR QUE SE PIERDA Y PARA INYECTARLO CORRECTAMENTE
    mode: str = Query("preview"), 
    file: UploadFile = File(...), 
    current_user: UserModel = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if not can_upload_excel(current_user): raise HTTPException(status_code=403)
    if not (file.content_type in ALLOWED_EXCEL_MIME_TYPES or file.filename.lower().endswith(('.xlsx', '.xls'))): 
        return JSONResponse(status_code=400, content={"status": "error", "detail": "Excel inválido."})
    try:
        contents = await file.read()
        # Forzamos openpyxl
        df = pd.read_excel(io.BytesIO(contents), engine='openpyxl').fillna("")
        column_headers = [str(col).upper().strip() for col in df.columns]

        def get_idx(targets): return next((column_headers.index(t) for t in targets if t in column_headers), -1)

        idx_id = get_idx(["ID_EQUIPO", "ID EQUIPO", "ID"])
        idx_marca = get_idx(["MARCA"])
        idx_modelo = get_idx(["MODELO"])
        idx_servicio = get_idx(["SERVICIO", "CLIENTE"])
        idx_canal = get_idx(["CANAL", "# CANAL", "CANAL NUM"])
        idx_nombre = get_idx(["NOMBRE CANAL", "NOMBRE DE CANAL"])
        idx_portadora = get_idx(["PORTADORA"])

        if idx_id == -1: 
            return JSONResponse(status_code=400, content={"status": "error", "detail": "Falta la columna ID_EQUIPO en el archivo."})

        preview_data = []
        has_errors = False
        
        for _, row in df.iterrows():
            vals = list(row.values)
            def read_val(idx): return str(vals[idx]).strip() if idx != -1 and idx < len(vals) else ""
            
            val_id = read_val(idx_id)
            val_servicio = read_val(idx_servicio)
            
            if not val_id or val_id.upper() == "NAN": continue
            
            errores_fila = []
            valido = len(errores_fila) == 0
            if not valido: has_errors = True
            
            preview_data.append({
                "ID_EQUIPO": val_id, 
                "CIUDAD": ciudad, # Usamos la ciudad que viene del parametro en la URL
                "SERVICIO": val_servicio, 
                "MARCA": read_val(idx_marca),
                "MODELO": read_val(idx_modelo),
                "CANAL": read_val(idx_canal), 
                "PORTADORA": read_val(idx_portadora),
                "NOMBRE_CANAL": read_val(idx_nombre), 
                "_errores": errores_fila, 
                "_valido": valido
            })

        if mode == "preview": 
            return {"status": "success", "data": preview_data, "has_errors": has_errors}

        # === LÓGICA DE INYECCIÓN (COMMIT) ===
        for item in preview_data:
            if not item["_valido"]: continue
            
            cab_db = db.query(CabezalModel).filter(
                CabezalModel.ciudad == ciudad, 
                CabezalModel.id_equipo == item["ID_EQUIPO"]
            ).first()
            
            if cab_db:
                # Update existente
                if item.get("SERVICIO"): cab_db.servicio = item["SERVICIO"]
                if item.get("MARCA"): cab_db.marca = item["MARCA"]
                if item.get("MODELO"): cab_db.modelo = item["MODELO"]
            else:
                # Crea nuevo
                db.add(CabezalModel(
                    ciudad=ciudad,
                    id_equipo=item["ID_EQUIPO"],
                    servicio=item.get("SERVICIO"),
                    marca=item.get("MARCA"),
                    modelo=item.get("MODELO")
                ))
                
        db.commit()
        registrar_auditoria(db, current_user.username, "CARGA CABEZALES", "CABEZALES", f"Carga masiva por Excel en {ciudad}.")
        return {"status": "success", "detail": "Cabezales inyectados con éxito."}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"status": "error", "detail": f"Error procesando el Excel: {str(e)}"})

@router.get("/cabezales/{cabezal_id}/exportar-excel")
def exportar_alineacion_excel(cabezal_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        cabezal = db.query(CabezalModel).filter(CabezalModel.id == cabezal_id).first()
        if not cabezal: raise HTTPException(status_code=404)
        
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
            
        for col in ws.columns: 
            ws.column_dimensions[col[0].column_letter].width = 18
            
        if len(alineaciones) > 0:
            tab = Table(displayName="TablaAlineacion", ref=f"A1:H{len(alineaciones)+1}")
            tab.tableStyleInfo = TableStyleInfo(name="TableStyleMedium9", showRowStripes=True)
            ws.add_table(tab)
            
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return StreamingResponse(
            output, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
            headers={
                "Content-Disposition": f"attachment; filename=Alineacion_{cabezal.servicio}.xlsx", 
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e: 
        return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})
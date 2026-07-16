from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
import pandas as pd
import io
import traceback
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
    ciudad: str = Query(...), 
    mode: str = Query("preview"), 
    file: UploadFile = File(...), 
    current_user: UserModel = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    try:
        # 1. Validaciones de seguridad dentro del try
        if not can_upload_excel(current_user): 
            return JSONResponse(status_code=403, content={"status": "error", "detail": "Permisos insuficientes."})
        
        # 2. Protección contra filename/content_type nulo (Causa frecuente de error 500)
        filename = file.filename or ""
        content_type = file.content_type or ""
        
        if not (content_type in ALLOWED_EXCEL_MIME_TYPES or filename.lower().endswith(('.xlsx', '.xls'))): 
            return JSONResponse(status_code=400, content={"status": "error", "detail": "El archivo no es un Excel válido."})
        
        # 3. Lectura del archivo
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents)).fillna("")
        column_headers = [str(col).upper().strip() for col in df.columns]

        def get_idx(targets): return next((column_headers.index(t) for t in targets if t in column_headers), -1)

        idx_ciudad = get_idx(["CIUDAD"])
        idx_id = get_idx(["ID", "ID EQUIPO", "ID_EQUIPO"])
        idx_servicio = get_idx(["SERVICIO", "CLIENTE", "CLIENTE / SERVICIO"])
        idx_canal = get_idx(["# CANAL", "CANAL NUM", "CANAL"])
        idx_nombre = get_idx(["NOMBRE DE CANAL", "NOMBRE CANAL"])

        if idx_id == -1 or idx_servicio == -1: 
            return JSONResponse(status_code=400, content={"status": "error", "detail": f"Columnas faltantes. Encontradas: {column_headers}"})

        preview_data = []
        has_errors = False
        
        for _, row in df.iterrows():
            vals = list(row.values)
            def read_val(idx): return str(vals[idx]).strip() if idx != -1 and idx < len(vals) else ""
            
            val_id = read_val(idx_id)
            val_servicio = read_val(idx_servicio)
            val_ciudad = read_val(idx_ciudad) if idx_ciudad != -1 and read_val(idx_ciudad) else ciudad 
            val_canal = read_val(idx_canal)
            val_nombre = read_val(idx_nombre)
            
            # Omitir filas completamente vacías
            if not val_id and not val_servicio and not val_canal: continue
            
            errores_fila = []
            if not val_id: errores_fila.append("Falta ID de Equipo.")
            if not val_servicio: errores_fila.append("Falta Servicio.")
            
            valido = len(errores_fila) == 0
            if not valido: has_errors = True
            
            preview_data.append({
                "ID_EQUIPO": val_id, 
                "CIUDAD": val_ciudad, 
                "SERVICIO": val_servicio, 
                "CANAL": val_canal, 
                "NOMBRE_CANAL": val_nombre, 
                "_errores": errores_fila, 
                "_valido": valido
            })

        # === 1. MODO PREVISUALIZACIÓN ===
        if mode == "preview": 
            return {"status": "success", "data": preview_data, "has_errors": has_errors}

        # === 2. MODO INYECCIÓN A BASE DE DATOS ===
        for row in preview_data:
            if not row["_valido"]: continue
            
            cab_db = db.query(CabezalModel).filter(
                CabezalModel.ciudad == row["CIUDAD"], 
                CabezalModel.id_equipo == row["ID_EQUIPO"]
            ).first()
            
            if cab_db:
                # Si existe, lo actualiza
                cab_db.servicio = row["SERVICIO"]
            else:
                # Si no existe, lo crea
                nuevo_cab = CabezalModel(
                    ciudad=row["CIUDAD"],
                    id_equipo=row["ID_EQUIPO"],
                    servicio=row["SERVICIO"]
                )
                db.add(nuevo_cab)
                
        db.commit()
        registrar_auditoria(db, current_user.username, "CARGA CABEZALES", "CABEZALES", f"Se actualizaron cabezales en {ciudad} mediante Excel.")
        return {"status": "success", "detail": f"Proceso completado. Se inyectaron/actualizaron {len(preview_data)} equipos."}
        
    except Exception as e:
        db.rollback()
        # ESTO ES LA MAGIA: Captura el error de Python exacto y lo envía de vuelta
        error_details = traceback.format_exc()
        print(error_details)
        return JSONResponse(status_code=500, content={"status": "error", "detail": f"Excepción de Python: {str(e)} \n\n {error_details}"})

# ================= EXPORTACIÓN EXCEL ALINEACIÓN =================
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
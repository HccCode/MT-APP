from pydantic import BaseModel
from typing import List

class UserLogin(BaseModel):
    username: str
    password: str

class PasswordChangeReq(BaseModel):
    new_password: str

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
    nombre_canal: str = None # <-- ¡CORREGIDO! Ya no dice Column(...)
    mcast_ip: str = None
    source_ip: str = None
    udp: str = None
    sid: str = None

class ConfigCiudadUpdate(BaseModel):
    ancho_banda_total: str

class HubStatItem(BaseModel):
    nombre: str
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

# ================= MÓDULO MICROONDAS =================

class MWRadioBaseBase(BaseModel):
    nombre: str
    ciudad: str
    coordenadas: str = None
    altura_torre: str = None
    comentarios: str = None

class MWRadioBaseCreate(MWRadioBaseBase):
    pass

class MWAccessPointBase(BaseModel):
    radio_base_id: int
    nombre_ap: str
    ip_gestion: str = None
    mac: str = None
    modelo: str = None
    frecuencia: str = None
    ancho_canal: str = None
    ssid: str = None
    azimut: str = None
    altura: str = None
    estatus: str = "ACTIVO"

class MWAccessPointCreate(MWAccessPointBase):
    pass

class MicroondaUbiquitiBase(BaseModel):
    ap_id: int = None
    ciudad: str = None
    sitio_base: str = None
    cliente: str = None
    estatus: str = None
    ssid: str = None
    frecuencia: str = None
    ancho_canal: str = None
    distancia_km: str = None
    direccion: str = None
    coordenadas: str = None
    modelo_ap: str = None
    ip_gestion_ap: str = None
    mac_ap: str = None
    senal_rx_ap: str = None
    modelo_st: str = None
    ip_gestion_st: str = None
    mac_st: str = None
    senal_rx_st: str = None
    tx_rx_rate: str = None
    comentarios: str = None

class MicroondaUbiquitiCreate(MicroondaUbiquitiBase):
    cliente: str

class MicroondaUbiquitiUpdate(MicroondaUbiquitiBase):
    pass
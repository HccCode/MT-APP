from sqlalchemy import Column, Integer, String, Text, ForeignKey
from database import Base

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
    __tablename__ = "sys_usuarios"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    must_change_password = Column(Integer, default=1) 
    role = Column(String(50), default="LECTURA")
    plazas = Column(String(500), default="*")
    pestanas = Column(String(500), default="*") 
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

class CabezalModel(Base):
    __tablename__ = "inventario_cabezales"
    id = Column(Integer, primary_key=True, index=True)
    id_equipo = Column(String(50), index=True, nullable=False)
    ciudad = Column(String(50), index=True, nullable=False)
    servicio = Column(String(100), index=True, nullable=False)
    gestion_qam = Column(String(100), nullable=True)
    marca = Column(String(100), nullable=True)
    modelo = Column(String(100), nullable=True)
    serie = Column(String(100), nullable=True)

class AlineacionCabezalModel(Base):
    __tablename__ = "inventario_alineacion_cabezales"
    id = Column(Integer, primary_key=True, index=True)
    cabezal_id = Column(Integer, ForeignKey("inventario_cabezales.id", ondelete="CASCADE"), nullable=False)
    portadora = Column(String(50), nullable=True)
    formato = Column(String(50), nullable=True)
    canal_num = Column(String(50), nullable=True)
    nombre_canal = Column(String(100), nullable=True)
    mcast_ip = Column(String(50), nullable=True)
    source_ip = Column(String(50), nullable=True)
    udp = Column(String(50), nullable=True)
    sid = Column(String(50), nullable=True)

class ConfigCiudadModel(Base):
    __tablename__ = "config_ciudades"
    ciudad_nombre = Column(String(100), primary_key=True, index=True)
    ancho_banda_total = Column(String(50), nullable=True)

class AuditLogModel(Base):
    __tablename__ = "sys_audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    usuario = Column(String(50), index=True)
    accion = Column(String(100))
    modulo = Column(String(100))
    detalle = Column(Text)
    fecha = Column(String(50))

# ================= MÓDULO MICROONDAS RELACIONAL =================

class MicroondasRadioBaseModel(Base):
    __tablename__ = "inventario_microondas_rb"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, index=True, nullable=False)
    ciudad = Column(String(50), nullable=False)
    coordenadas = Column(String(100))
    altura_torre = Column(String(50))
    comentarios = Column(Text)

class MicroondasAccessPointModel(Base):
    __tablename__ = "inventario_microondas_ap"
    id = Column(Integer, primary_key=True, index=True)
    radio_base_id = Column(Integer, ForeignKey("inventario_microondas_rb.id", ondelete="CASCADE"), nullable=False)
    nombre_ap = Column(String(100), nullable=False)
    ip_gestion = Column(String(50))
    mac = Column(String(50))
    modelo = Column(String(100))
    frecuencia = Column(String(50))
    ancho_canal = Column(String(50))
    ssid = Column(String(100))
    azimut = Column(String(50))
    altura = Column(String(50))
    estatus = Column(String(50), default="ACTIVO")

class MicroondaUbiquitiModel(Base):
    __tablename__ = "inventario_microondas_ubq"
    id = Column(Integer, primary_key=True, index=True)
    # NUEVO: Llave foránea para relacionar al cliente con un AP específico
    ap_id = Column(Integer, ForeignKey("inventario_microondas_ap.id", ondelete="SET NULL"), nullable=True)
    
    ciudad = Column(String(50), index=True)
    sitio_base = Column(String(100), index=True)
    cliente = Column(String(150), index=True)
    estatus = Column(String(50), default="ACTIVO")
    
    ssid = Column(String(100))
    frecuencia = Column(String(50))
    ancho_canal = Column(String(50))
    distancia_km = Column(String(50))
    
    modelo_ap = Column(String(100))
    ip_gestion_ap = Column(String(50))
    mac_ap = Column(String(50))
    senal_rx_ap = Column(String(50))
    
    modelo_st = Column(String(100))
    ip_gestion_st = Column(String(50))
    mac_st = Column(String(50))
    senal_rx_st = Column(String(50))
    
    tx_rx_rate = Column(String(50))
    comentarios = Column(Text)
export const generarUrlGoogleMaps = (queryStr) => {
  // CORRECCIÓN: Se agregó el $ que faltaba para la interpolación 
  // y se apuntó a la URL estándar de búsqueda de Google Maps
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryStr)}`;
};

export const formatFechaParaInput = (fechaStr) => {
  if (!fechaStr) return '';
  
  // 1. Cortamos cualquier hora o texto basura después de la fecha.
  // Esto convierte "2025-11-30 0" o "2025-11-30T00:00:00" en "2025-11-30"
  const s = String(fechaStr).trim().split(/[ T]/)[0];
  
  // 2. Si ya cumple con el formato exacto de 10 caracteres, lo retornamos
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  
  // 3. Parseo para formatos con separadores (ej. 11/30/2025)
  const partes = s.split(/[\/\-]/);
  if (partes.length === 3) {
    const p1 = partes[0].padStart(2, '0');
    const p2 = partes[1].padStart(2, '0');
    let p3 = partes[2].substring(0, 4); 
    
    if (p3.length === 2) p3 = `20${p3}`; 
    if (p1.length === 4) return `${p1}-${p2}-${p3}`; 
    
    return `${p3}-${p2}-${p1}`; 
  }
  
  // 4. Fallback: usar el objeto Date nativo si todo lo demás falla
  const d = new Date(fechaStr);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  
  return '';
};
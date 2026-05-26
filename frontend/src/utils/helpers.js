export const generarUrlGoogleMaps = (queryStr) => {
  return `https://www.google.com/maps/search/?api=1&query=$${encodeURIComponent(queryStr)}`;
};

export const formatFechaParaInput = (fechaStr) => {
  if (!fechaStr) return '';
  const s = String(fechaStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.substring(0, 10);
  const partes = s.split(/[\/\-]/);
  if (partes.length === 3) {
    const p1 = partes[0].padStart(2, '0');
    const p2 = partes[1].padStart(2, '0');
    let p3 = partes[2].substring(0, 4); 
    if (p3.length === 2) p3 = `20${p3}`; 
    if (p1.length === 4) return `${p1}-${p2}-${p3}`; 
    return `${p3}-${p2}-${p1}`; 
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return '';
};
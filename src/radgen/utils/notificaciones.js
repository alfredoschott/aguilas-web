// Avisos del navegador (Notification API estándar) — nada de Firebase Cloud
// Messaging, sin service worker ni claves VAPID. Solo funcionan mientras el
// joven tiene la pestaña abierta (o en segundo plano en el mismo
// navegador), no son "push" real con la app cerrada. Piden permiso una sola
// vez, con un gesto del usuario (un botón), como exige el navegador.

export function notificacionesSoportadas() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function permisoNotificaciones() {
  if (!notificacionesSoportadas()) return 'unsupported'
  return Notification.permission // 'granted' | 'denied' | 'default'
}

export async function pedirPermisoNotificaciones() {
  if (!notificacionesSoportadas()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

// Evita mandar el mismo aviso una y otra vez cada vez que abren la app —
// como máximo uno por tipo de aviso por día natural.
function yaSeMostroHoy(clave) {
  try {
    return localStorage.getItem(`radgen-notif-${clave}`) === new Date().toDateString()
  } catch {
    return false
  }
}

function marcarMostradaHoy(clave) {
  try {
    localStorage.setItem(`radgen-notif-${clave}`, new Date().toDateString())
  } catch {
    // Almacenamiento bloqueado — como mucho se repite el aviso, no es grave.
  }
}

// `clave` identifica el TIPO de aviso (para no repetirlo el mismo día), no
// el mensaje exacto.
export function mostrarNotificacion(clave, titulo, opciones = {}) {
  if (!notificacionesSoportadas() || Notification.permission !== 'granted') return
  if (yaSeMostroHoy(clave)) return
  try {
    const notif = new Notification(titulo, { icon: '/favicon.ico', ...opciones })
    void notif
    marcarMostradaHoy(clave)
  } catch {
    // Algunos navegadores (ej. iOS Safari en PWA no instalada) no dejan
    // crear Notification aunque el permiso esté "granted" — se ignora.
  }
}

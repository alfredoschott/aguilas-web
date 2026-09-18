// Autoguardado del formulario de lección completo (no solo un campo de
// texto) — para no perder una lección larga si se cierra la pestaña o se
// va la conexión a medio escribir. Vive aparte de useBorrador (ese es para
// un solo campo de texto plano, este guarda un objeto JSON).
const PREFIJO = 'radgen-borrador-leccion:'

export function leerBorradorLeccion(clave) {
  try {
    const crudo = localStorage.getItem(PREFIJO + clave)
    return crudo ? JSON.parse(crudo) : null
  } catch {
    return null
  }
}

export function guardarBorradorLeccion(clave, datos) {
  try {
    localStorage.setItem(PREFIJO + clave, JSON.stringify(datos))
  } catch {
    // localStorage puede fallar (modo privado, cuota llena) — el
    // autoguardado simplemente no persiste, sin romper el formulario.
  }
}

export function limpiarBorradorLeccion(clave) {
  try {
    localStorage.removeItem(PREFIJO + clave)
  } catch {
    // No hay nada que limpiar si tampoco se pudo escribir.
  }
}

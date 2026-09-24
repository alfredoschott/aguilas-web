const CLAVE_PENDIENTE = 'radgen-asistencia-pendiente'

// Si alguien escanea el QR sin sesión iniciada, el código se guarda para
// registrarlo en cuanto termine de entrar — así no tiene que escanear dos veces.
export function guardarAsistenciaPendiente(codigo) {
  try {
    localStorage.setItem(CLAVE_PENDIENTE, codigo)
  } catch {
    // Sin almacenamiento: tendrá que volver a escanear, nada más.
  }
}

export function tomarAsistenciaPendiente() {
  try {
    const codigo = localStorage.getItem(CLAVE_PENDIENTE)
    localStorage.removeItem(CLAVE_PENDIENTE)
    return codigo
  } catch {
    return null
  }
}

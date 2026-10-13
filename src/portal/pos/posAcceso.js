// Acceso por QR: un dispositivo invitado (sin cuenta) puede vender, cobrar y ver los
// pedidos de UNA venta mientras el líder lo permita.
export const HORAS_ACCESO = 12

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

// Código secreto del QR (sin caracteres que se confundan al leerlos).
export function generarToken(largo = 24) {
  const bytes = crypto.getRandomValues(new Uint8Array(largo))
  return [...bytes].map((b) => ALFABETO[b % ALFABETO.length]).join('')
}

export const urlCobro = (ventaId, token) => `${window.location.origin}/cobrar/${ventaId}/${token}`

export const aDate = (ts) => (ts?.toDate ? ts.toDate() : null)

// ¿El acceso sigue vigente? (encendido, sin vencer y con la venta abierta)
export function accesoVigente(acceso, venta, ahora = Date.now()) {
  const vence = aDate(acceso?.expiraEn)
  return !!acceso?.activo && !!vence && vence.getTime() > ahora && venta?.estado !== 'cerrada'
}

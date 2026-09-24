export const HORA_MS = 60 * 60 * 1000

export function textoTiempoRestante(ms) {
  if (ms < HORA_MS) return 'menos de 1 h'
  if (ms < 24 * HORA_MS) return `${Math.floor(ms / HORA_MS)} h`
  const dias = Math.floor(ms / (24 * HORA_MS))
  return `${dias} día${dias === 1 ? '' : 's'}`
}

export function nivelUrgencia(ms) {
  if (ms < 24 * HORA_MS) return 'urgente'
  if (ms < 3 * 24 * HORA_MS) return 'pronto'
  return 'tranqui'
}

// Avatar del joven: si ya personalizó su foto de perfil, se muestra esa;
// si no, se generan iniciales con un color estable (mismo joven, mismo
// color siempre) tomado de la paleta de marca.
const PALETA = ['var(--rg-blue)', 'var(--rg-red)', 'var(--rg-ink)']

function inicialesDe(nombre) {
  const partes = (nombre || '').trim().split(/\s+/).filter(Boolean)
  const primeras = partes.slice(0, 2).map((p) => p[0].toUpperCase())
  return primeras.join('') || '?'
}

function colorDe(semilla) {
  let hash = 0
  for (let i = 0; i < semilla.length; i++) {
    hash = (hash * 31 + semilla.charCodeAt(i)) % 997
  }
  return PALETA[hash % PALETA.length]
}

// `marco` (rango: 'bronce'|'plata'|'oro') y `racha` (semanas seguidas) son
// opcionales y puramente decorativos — un Avatar sin ellos se ve igual que
// antes, así que ningún llamado existente se rompe por no pasarlos.
export default function Avatar({ nombre, uid, foto, size = 44, marco, racha = 0, colorAcento }) {
  const clasesExtra = [
    marco ? `re-avatar-marco re-avatar-marco--${marco}` : colorAcento ? 're-avatar-marco re-avatar-marco--acento' : '',
    racha > 0 ? 're-avatar-marco--racha' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const estiloAcento = colorAcento ? { '--re-avatar-acento': colorAcento } : undefined
  const pad = clasesExtra ? Math.max(3, Math.round(size * 0.06)) : 0
  const tamañoExterior = size + pad * 2

  const contenido = foto ? (
    <img
      src={foto}
      alt={nombre || 'Avatar'}
      className="re-avatar re-avatar--foto"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="re-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: colorAcento || colorDe(uid || nombre || ''),
      }}
    >
      {inicialesDe(nombre)}
    </div>
  )

  if (!clasesExtra) return contenido

  return (
    <div
      className={clasesExtra}
      style={{ width: tamañoExterior, height: tamañoExterior, padding: pad, ...estiloAcento }}
    >
      {contenido}
    </div>
  )
}

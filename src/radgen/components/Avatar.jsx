// Avatar con iniciales — no hay fotos reales de los jóvenes, así que generamos
// un círculo con sus iniciales y un color estable (mismo joven, mismo color
// siempre) tomado de la paleta de marca. Funciona igual de bien con 3 jóvenes
// que con 30, sin depender de imágenes externas.
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

export default function Avatar({ nombre, uid, size = 44 }) {
  return (
    <div
      className="re-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: colorDe(uid || nombre || ''),
      }}
    >
      {inicialesDe(nombre)}
    </div>
  )
}

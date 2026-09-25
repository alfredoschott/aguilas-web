// Pantallas "fantasma" mientras cargan los datos: la forma de lo que viene
// (tarjetas, mapa, filas) con un brillo que pasa — se siente más rápido que
// un Sky girando y no hay salto cuando llega el contenido.
function Bloque({ className = '', style }) {
  return <span className={`re-esq ${className}`} style={style} aria-hidden="true" />
}

function Titulo() {
  return <Bloque className="re-esq--titulo" />
}

function Filas({ n = 3 }) {
  return Array.from({ length: n }, (_, i) => (
    <div key={i} className="re-esq-fila">
      <Bloque className="re-esq--circulo" />
      <div className="re-esq-fila__texto">
        <Bloque className="re-esq--linea" style={{ width: `${70 - i * 8}%` }} />
        <Bloque className="re-esq--linea re-esq--corta" />
      </div>
    </div>
  ))
}

const VARIANTES = {
  lecciones: () => (
    <>
      <Bloque className="re-esq--hero" />
      <div className="re-esq-tira">
        <Bloque className="re-esq--tarjeta-chica" />
        <Bloque className="re-esq--tarjeta-chica" />
        <Bloque className="re-esq--tarjeta-chica" />
      </div>
      <Bloque className="re-esq--banner" />
      <div className="re-esq-mapa">
        {[50, 74, 50].map((x, i) => (
          <Bloque key={i} className="re-esq--parada" style={{ left: `${x}%`, top: 20 + i * 120 }} />
        ))}
      </div>
    </>
  ),
  mapa: () => (
    <>
      <Bloque className="re-esq--banner" />
      <div className="re-esq-mapa">
        {[50, 74, 50].map((x, i) => (
          <Bloque key={i} className="re-esq--parada" style={{ left: `${x}%`, top: 20 + i * 120 }} />
        ))}
      </div>
    </>
  ),
  panel: () => (
    <>
      <Titulo />
      <div className="re-esq-pestanas">
        {Array.from({ length: 5 }, (_, i) => (
          <Bloque key={i} className="re-esq--pestana" />
        ))}
      </div>
      <div className="re-esq-rejilla">
        <Bloque className="re-esq--tarjeta" />
        <Bloque className="re-esq--tarjeta" />
        <Bloque className="re-esq--tarjeta" />
      </div>
      <div className="re-esq-caja">
        <Filas n={4} />
      </div>
    </>
  ),
  lista: () => (
    <>
      <Titulo />
      <Bloque className="re-esq--linea" style={{ width: '60%', marginBottom: 20 }} />
      <div className="re-esq-caja">
        <Filas n={5} />
      </div>
    </>
  ),
  insignias: () => (
    <>
      <Titulo />
      <Bloque className="re-esq--tarjeta" style={{ height: 120, marginBottom: 20 }} />
      <div className="re-esq-vitrina">
        {Array.from({ length: 8 }, (_, i) => (
          <Bloque key={i} className="re-esq--insignia" />
        ))}
      </div>
    </>
  ),
  perfil: () => (
    <>
      <div className="re-esq-perfil">
        <Bloque className="re-esq--avatar" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Bloque className="re-esq--titulo" style={{ marginBottom: 10 }} />
          <Bloque className="re-esq--linea re-esq--corta" />
        </div>
      </div>
      <Bloque className="re-esq--tarjeta" style={{ height: 110, marginBottom: 16 }} />
      <Bloque className="re-esq--tarjeta" style={{ height: 180 }} />
    </>
  ),
  detalle: () => (
    <>
      <Bloque className="re-esq--linea re-esq--corta" style={{ marginBottom: 16 }} />
      <Titulo />
      <Bloque className="re-esq--media" />
      <Bloque className="re-esq--linea" />
      <Bloque className="re-esq--linea" style={{ width: '92%' }} />
      <Bloque className="re-esq--linea" style={{ width: '78%' }} />
    </>
  ),
}

export default function Esqueleto({ variante = 'detalle', ancho = false, sinShell = false }) {
  const Contenido = VARIANTES[variante] || VARIANTES.detalle
  const cuerpo = (
    <div className="re-esq-contenedor" role="status" aria-label="Cargando…">
      <Contenido />
    </div>
  )
  if (sinShell) return cuerpo
  const shell = variante === 'lecciones' ? 're-shell re-shell--lecciones' : ancho ? 're-shell re-shell--ancho' : 're-shell'
  return <div className={shell}>{cuerpo}</div>
}

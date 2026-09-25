import { Link } from 'react-router-dom'
import Sky from './Sky'

// Alto de cada "parada" del sendero y posición horizontal de cada una (en %
// del ancho): el camino serpentea centro → derecha → centro → izquierda.
const ALTO_FILA = 150
const MARGEN_ARRIBA = 50
const PATRON_X = [50, 74, 50, 26]

function puntoDe(i) {
  return { x: PATRON_X[i % PATRON_X.length], y: MARGEN_ARRIBA + i * ALTO_FILA }
}

// Curva suave entre dos paradas (en coordenadas del SVG: x en %, y en px).
function tramo(a, b) {
  const medio = (b.y - a.y) / 2
  return `C ${a.x} ${a.y + medio}, ${b.x} ${b.y - medio}, ${b.x} ${b.y}`
}

function textoValor(valor) {
  if (!valor) return null
  const porcentaje = Math.round(valor.factor * 100)
  if (valor.enPausa) return { texto: `⏸ ${porcentaje}%`, clase: 'pausa' }
  return { texto: `⚡ ${porcentaje}%`, clase: valor.factor < 1 ? 'tarde' : 'ok' }
}

function Parada({ nodo, i, esSiguiente, valor, opacado, color, enlaceDe }) {
  const { leccion, asignacion, estado } = nodo
  const { x, y } = puntoDe(i)
  const aTiempo = estado === 'completada' && valor?.factor === 1
  const chip = estado === 'disponible' ? textoValor(valor) : null

  const contenido = (
    <>
      <span className={`re-parada__nodo re-parada__nodo--${estado} ${esSiguiente ? 're-parada__nodo--siguiente' : ''}`}>
        <span className="re-parada__icono">{estado === 'bloqueada' ? '🔒' : leccion.icono}</span>
        {estado === 'completada' && <span className="re-parada__check" aria-hidden="true">✓</span>}
        {aTiempo && (
          <span className="re-parada__estrella" title="¡La hiciste a tiempo!" aria-label="A tiempo">
            ★
          </span>
        )}
      </span>
      <span className="re-parada__etiqueta">
        <span className="re-parada__titulo">{leccion.titulo}</span>
        {estado === 'completada' && asignacion?.quizScore && (
          <span className="re-parada__dato">
            Quiz {asignacion.quizScore.correctas}/{asignacion.quizScore.total}
          </span>
        )}
        {chip && <span className={`re-parada__chip re-parada__chip--${chip.clase}`}>{chip.texto}</span>}
        {estado === 'bloqueada' && <span className="re-parada__dato">Próximamente</span>}
      </span>
    </>
  )

  const clase = `re-parada ${opacado ? 're-parada--opacada' : ''} ${estado === 'bloqueada' ? 're-parada--bloqueada' : ''}`
  const estilo = { left: `${x}%`, top: y, '--serie-color': color, animationDelay: `${i * 0.06}s` }

  // En la vista de supervisión, `enlaceDe` manda todo a la vista previa de
  // solo lectura (incluso lo bloqueado); para el joven, lo bloqueado no abre.
  const destino = enlaceDe ? enlaceDe(nodo) : estado === 'bloqueada' ? null : `/radgen/education/leccion/${asignacion.id}`
  if (!destino) {
    return (
      <div className={clase} style={estilo} title="Se desbloquea cuando tu líder te la asigne">
        {contenido}
      </div>
    )
  }
  return (
    <Link to={destino} className={clase} style={estilo}>
      {contenido}
    </Link>
  )
}

// Una serie como un mapa: un sendero dibujado que se va pintando del color
// de la serie conforme avanzas, con Sky parado junto a la cápsula que te
// toca y un trofeo esperándote al final.
export default function MapaSerie({ serie, color, portada, siguienteId, valores, terminoBusqueda, enlaceDe }) {
  const { nodos } = serie
  const completadas = nodos.filter((n) => n.estado === 'completada').length
  const total = nodos.length
  const terminada = completadas === total && total > 0
  const porcentaje = total ? Math.round((completadas / total) * 100) : 0

  // Paradas + trofeo final.
  const puntos = [...nodos.map((_, i) => puntoDe(i)), puntoDe(nodos.length)]
  const alto = MARGEN_ARRIBA + nodos.length * ALTO_FILA + 70

  const rutaCompleta = puntos.reduce((d, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${d} ${tramo(puntos[i - 1], p)}`), '')
  // Tramo recorrido: hasta la última cápsula completada, y un paso más si la
  // siguiente ya está disponible (el camino "llega" hasta donde estás).
  let hasta = -1
  nodos.forEach((n, i) => {
    if (n.estado === 'completada') hasta = i
  })
  if (terminada) hasta = nodos.length
  else if (hasta >= 0 && nodos[hasta + 1]?.estado === 'disponible') hasta += 1
  const rutaHecha =
    hasta > 0
      ? puntos
          .slice(0, hasta + 1)
          .reduce((d, p, i, arr) => (i === 0 ? `M ${p.x} ${p.y}` : `${d} ${tramo(arr[i - 1], p)}`), '')
      : null

  const indiceSiguiente = nodos.findIndex((n) => n.leccion.id === siguienteId)
  const skyEn = indiceSiguiente >= 0 ? puntoDe(indiceSiguiente) : null
  const trofeo = puntos[puntos.length - 1]

  return (
    <section className="re-mapa" style={{ '--serie-color': color }}>
      <header className="re-mapa__banner">
        <div className="re-mapa__portada">
          {portada ? <img src={portada} alt="" /> : <span aria-hidden="true">{nodos[0]?.leccion.icono || '📘'}</span>}
        </div>
        <div className="re-mapa__info">
          <p className="re-mapa__eyebrow">Serie</p>
          <h2 className="re-mapa__titulo">{serie.serieTitulo.replace(/^Serie:\s*/i, '')}</h2>
          <div className="re-mapa__progreso">
            <div className="re-mapa__barra">
              <div className="re-mapa__relleno" style={{ width: `${porcentaje}%` }} />
            </div>
            <span className="re-mapa__conteo">
              {completadas}/{total}
            </span>
          </div>
        </div>
      </header>

      <div className="re-mapa__sendero" style={{ height: alto }}>
        <svg className="re-mapa__svg" viewBox={`0 0 100 ${alto}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={rutaCompleta} className="re-mapa__ruta re-mapa__ruta--pendiente" vectorEffect="non-scaling-stroke" />
          {rutaHecha && (
            <path d={rutaHecha} className="re-mapa__ruta re-mapa__ruta--hecha" vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        {nodos.map((nodo, i) => (
          <Parada
            key={nodo.leccion.id}
            nodo={nodo}
            i={i}
            color={color}
            esSiguiente={nodo.leccion.id === siguienteId}
            valor={nodo.asignacion ? valores.get(nodo.asignacion.id) : null}
            opacado={terminoBusqueda && !nodo.leccion.titulo.toLowerCase().includes(terminoBusqueda)}
            enlaceDe={enlaceDe}
          />
        ))}

        {skyEn && (
          <div
            className={`re-mapa__sky ${skyEn.x >= 50 ? 're-mapa__sky--izquierda' : 're-mapa__sky--derecha'}`}
            style={{ left: `${skyEn.x}%`, top: skyEn.y }}
            aria-hidden="true"
          >
            <span className="re-mapa__globo">¡Aquí vas!</span>
            <Sky size={58} pose="caminando" animado={false} />
          </div>
        )}

        <div
          className={`re-mapa__trofeo ${terminada ? 're-mapa__trofeo--ganado' : ''}`}
          style={{ left: `${trofeo.x}%`, top: trofeo.y }}
          title={terminada ? '¡Serie completa!' : 'Termina la serie para ganar su insignia'}
        >
          <span className="re-mapa__trofeo-icono">🏆</span>
          <span className="re-mapa__trofeo-texto">{terminada ? '¡Serie completa!' : 'Meta de la serie'}</span>
        </div>
      </div>
    </section>
  )
}

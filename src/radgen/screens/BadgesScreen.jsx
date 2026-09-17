import { useEffect, useState } from 'react'
import {
  getInsigniasDe,
  getMostrarElegibilidadAJovenes,
  getRachaSemanas,
  getHistorialSemanas,
  getMostrarRankingAJovenes,
  getRankingCampamento,
  getInsigniasManualesDe,
  getExperienciaDe,
} from '../store'
import Sky from '../components/Sky'
import Avatar from '../components/Avatar'
import RachaBadge from '../components/RachaBadge'
import { generarCertificado, descargarImagen } from '../utils/certificado'

function Medalla({ nombre, icono, imagen, desbloqueada, progreso, variante, delay = 0, onDescargarCertificado }) {
  return (
    <div
      className={`re-medalla ${variante ? `re-medalla--${variante}` : ''} ${desbloqueada ? '' : 're-medalla--bloqueada'}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="re-medalla__icono">
        {!desbloqueada ? '🔒' : imagen ? <img src={imagen} alt="" className="re-medalla__imagen" /> : icono}
      </div>
      <p className="re-medalla__nombre">{nombre}</p>
      {progreso && <p className="re-medalla__progreso">{progreso}</p>}
      {desbloqueada && onDescargarCertificado && (
        <button type="button" className="re-medalla__certificado" onClick={onDescargarCertificado}>
          🎓 Certificado
        </button>
      )}
    </div>
  )
}

function TarjetaElegibilidad({ titulo, resultado }) {
  return (
    <div className={`re-card ${resultado.apto ? '' : 're-card--rojo'}`}>
      <h2 className="re-subtitulo">{titulo}</h2>
      {resultado.apto ? (
        <p style={{ fontWeight: 700 }}>✔ Cumples los requisitos.</p>
      ) : (
        <>
          <p style={{ fontWeight: 700, marginBottom: 10 }}>Te falta completar:</p>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {resultado.faltantes.map((f) => (
              <li key={f} style={{ marginBottom: 6 }}>{f}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function CalendarioRacha({ historial }) {
  return (
    <div className="re-racha-calendario">
      {historial.map((semana) => (
        <div
          key={semana.inicio}
          className={`re-racha-semana ${semana.activa ? 're-racha-semana--activa' : ''} ${semana.esSemanaActual ? 're-racha-semana--actual' : ''}`}
          title={new Date(semana.inicio).toLocaleDateString('es-MX')}
        >
          {semana.activa ? '🔥' : ''}
        </div>
      ))}
    </div>
  )
}

// Radio y perímetro del anillo de progreso — se calculan una sola vez
// aquí para no repetir el número mágico en JSX y en el trazo del SVG.
const ANILLO_RADIO = 52
const ANILLO_PERIMETRO = 2 * Math.PI * ANILLO_RADIO

// Anillo circular animado alrededor del ícono de rango — arranca vacío y
// se llena hacia el porcentaje real apenas monta, para que el llenado se
// sienta como una animación y no como un valor que ya estaba ahí.
function AnilloProgreso({ porcentaje, completo }) {
  const [relleno, setRelleno] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setRelleno(porcentaje))
    return () => cancelAnimationFrame(id)
  }, [porcentaje])

  const offset = ANILLO_PERIMETRO * (1 - relleno / 100)

  return (
    <svg className={`re-anillo ${completo ? 're-anillo--completo' : ''}`} viewBox="0 0 120 120" aria-hidden="true">
      <circle className="re-anillo__fondo" cx="60" cy="60" r={ANILLO_RADIO} />
      <circle
        className="re-anillo__relleno"
        cx="60"
        cy="60"
        r={ANILLO_RADIO}
        strokeDasharray={ANILLO_PERIMETRO}
        strokeDashoffset={offset}
      />
    </svg>
  )
}

// La tarjeta más importante de la pantalla: de un vistazo, dónde estás y
// qué te falta para el siguiente rango — en vez de enterrar esa respuesta
// entre varias tarjetas sueltas.
function HeroRango({ insignias, racha, onDescargarCertificado }) {
  const porcentaje = insignias.progresoNivel
    ? Math.min(100, Math.round((insignias.progresoNivel.actual / insignias.progresoNivel.meta) * 100))
    : 100
  const faltan = insignias.progresoNivel ? insignias.progresoNivel.meta - insignias.progresoNivel.actual : 0

  return (
    <div className="re-hero-rango">
      <div className="re-hero-rango__icono-wrap">
        <AnilloProgreso porcentaje={porcentaje} completo={!insignias.progresoNivel} />
        <div className={`re-hero-rango__icono ${insignias.nivelActual ? `re-hero-rango__icono--${insignias.nivelActual.id}` : ''}`}>
          {insignias.nivelActual ? insignias.nivelActual.icono : '🔒'}
        </div>
      </div>
      <div className="re-hero-rango__cuerpo">
        <p className="re-hero-rango__etiqueta">Tu rango</p>
        <p className="re-hero-rango__nombre">
          {insignias.nivelActual ? insignias.nivelActual.nombre : 'Sin rango aún'}
        </p>

        {insignias.progresoNivel ? (
          <p className="re-hero-rango__meta">
            Te falta{faltan === 1 ? '' : 'n'} <strong>{faltan}</strong> cápsula{faltan === 1 ? '' : 's'} para{' '}
            <strong>{insignias.siguienteNivel.icono} {insignias.siguienteNivel.nombre}</strong>
          </p>
        ) : (
          <p className="re-hero-rango__meta">¡Rango máximo alcanzado! Sigue completando cápsulas por diversión 🎉</p>
        )}

        <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <RachaBadge semanas={racha} />
          {insignias.nivelActual && (
            <button type="button" className="re-hero-rango__certificado" onClick={onDescargarCertificado}>
              🎓 Descargar certificado
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Nivel de experiencia — separado del rango (que depende solo de cápsulas
// completadas). La XP suma cápsulas, aciertos de quiz, racha e insignias
// especiales, con valores que la líder puede ajustar desde su panel.
function TarjetaExperiencia({ experiencia }) {
  const porcentaje = Math.round((experiencia.xpEnNivelActual / experiencia.xpPorNivel) * 100)
  return (
    <div className="re-card re-card--xp">
      <div className="re-seccion-header">
        <h2 className="re-subtitulo" style={{ margin: 0 }}>Nivel {experiencia.nivel}</h2>
        <span className="re-seccion-header__contador">{experiencia.xpTotal} XP</span>
      </div>
      <div className="re-barra">
        <div className="re-barra__relleno" style={{ width: `${porcentaje}%` }} />
      </div>
      <p style={{ margin: '4px 0 0', fontSize: '0.8rem', opacity: 0.7 }}>
        {experiencia.xpEnNivelActual} / {experiencia.xpPorNivel} XP para el nivel {experiencia.nivel + 1}
      </p>
    </div>
  )
}

function CabeceraSeccion({ titulo, contador }) {
  return (
    <div className="re-seccion-header">
      <h2 className="re-subtitulo" style={{ margin: 0 }}>{titulo}</h2>
      <span className="re-seccion-header__contador">{contador}</span>
    </div>
  )
}

export default function BadgesScreen({ usuario }) {
  const [insignias, setInsignias] = useState(null)
  const [mostrarElegibilidad, setMostrarElegibilidad] = useState(false)
  const [racha, setRacha] = useState(0)
  const [historialSemanas, setHistorialSemanas] = useState([])
  const [mostrarRanking, setMostrarRanking] = useState(false)
  const [ranking, setRanking] = useState([])
  const [insigniasManuales, setInsigniasManuales] = useState([])
  const [experiencia, setExperiencia] = useState(null)

  useEffect(() => {
    Promise.all([
      getInsigniasDe(usuario.uid),
      getMostrarElegibilidadAJovenes(),
      getRachaSemanas(usuario.uid),
      getHistorialSemanas(usuario.uid),
      getMostrarRankingAJovenes(),
      getInsigniasManualesDe(usuario.uid),
      getExperienciaDe(usuario.uid),
    ]).then(([i, m, r, h, mr, im, exp]) => {
      setInsignias(i)
      setMostrarElegibilidad(m)
      setRacha(r)
      setHistorialSemanas(h)
      setMostrarRanking(mr)
      setInsigniasManuales(im)
      setExperiencia(exp)
      if (mr) getRankingCampamento().then(setRanking)
    })
  }, [usuario.uid])

  if (!insignias) {
    return (
      <div className="re-shell re-shell--ancho" style={{ textAlign: 'center' }}>
        <Sky size={72} pose="estudiando" animado />
      </div>
    )
  }

  const mensajeSky = insignias.nivelActual
    ? `¡Vas muy bien! Ya tienes rango ${insignias.nivelActual.nombre}.`
    : insignias.totalCompletadas === 0
      ? 'Completa tu primera cápsula para ganar tu primera insignia.'
      : '¡Vas por buen camino! Sigue completando cápsulas.'

  const poseSky = insignias.nivelActual ? 'logrado' : insignias.totalCompletadas === 0 ? 'saludando' : 'estudiando'

  const capsulasDesbloqueadas = insignias.porLeccion.filter((b) => b.desbloqueada).length
  const seriesDesbloqueadas = insignias.porSerie.filter((b) => b.desbloqueada).length

  async function descargarCertificadoRango() {
    const dataUrl = await generarCertificado({
      nombreJoven: usuario.nombre,
      logro: `Por alcanzar el rango ${insignias.nivelActual.nombre}`,
      icono: insignias.nivelActual.icono,
    })
    descargarImagen(dataUrl, `certificado-rango-${insignias.nivelActual.id}.png`)
  }

  async function descargarCertificadoSerie(nombreSerie) {
    const dataUrl = await generarCertificado({
      nombreJoven: usuario.nombre,
      logro: `Por completar la serie: ${nombreSerie}`,
      icono: '🏆',
    })
    descargarImagen(dataUrl, `certificado-serie-${nombreSerie.toLowerCase().replace(/\s+/g, '-')}.png`)
  }

  async function descargarCertificadoLeccion(leccion) {
    const dataUrl = await generarCertificado({
      nombreJoven: usuario.nombre,
      logro: leccion.nombre,
      imagenUrl: leccion.imagen,
    })
    descargarImagen(dataUrl, `certificado-${leccion.nombre.toLowerCase().replace(/\s+/g, '-')}.png`)
  }

  return (
    <div className="re-shell re-shell--ancho">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
        <h1 className="re-titulo-pagina" style={{ margin: 0 }}>Mis insignias</h1>
        <Sky size={56} pose={poseSky} animado={false} />
      </div>
      <p style={{ fontWeight: 600, opacity: 0.85, marginBottom: '1.5rem' }}>{mensajeSky}</p>

      <HeroRango insignias={insignias} racha={racha} onDescargarCertificado={descargarCertificadoRango} />

      {experiencia && <TarjetaExperiencia experiencia={experiencia} />}

      {historialSemanas.length > 0 && (
        <div className="re-card" style={{ marginBottom: '1.5rem' }}>
          <h2 className="re-subtitulo">Tu constancia</h2>
          <CalendarioRacha historial={historialSemanas} />
          <p style={{ marginTop: 10, marginBottom: 0, fontSize: '0.8rem', opacity: 0.7 }}>
            Una cápsula completada por semana = 🔥. Las últimas {historialSemanas.length} semanas.
          </p>
        </div>
      )}

      <div className="re-card">
        <CabeceraSeccion titulo="Cápsulas" contador={`${capsulasDesbloqueadas}/${insignias.porLeccion.length}`} />
        <div className="re-medallas-grid">
          {insignias.porLeccion.map((b, i) => (
            <Medalla
              key={b.id}
              nombre={b.nombre}
              icono={b.icono}
              imagen={b.imagen}
              desbloqueada={b.desbloqueada}
              delay={i * 0.06}
              onDescargarCertificado={b.desbloqueada ? () => descargarCertificadoLeccion(b) : undefined}
            />
          ))}
        </div>
      </div>

      <div className="re-card">
        <CabeceraSeccion
          titulo="Insignias especiales"
          contador={`${insigniasManuales.filter((b) => b.desbloqueada).length}/${insigniasManuales.length}`}
        />
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
          Estas te las otorga tu líder en persona — no se desbloquean solas.
        </p>
        <div className="re-medallas-grid">
          {insigniasManuales.map((b, i) => (
            <Medalla
              key={b.id}
              nombre={b.nombre}
              imagen={b.imagen}
              desbloqueada={b.desbloqueada}
              progreso={b.veces > 1 ? `${b.veces} veces` : null}
              variante="serie"
              delay={i * 0.06}
            />
          ))}
        </div>
      </div>

      <div className="re-card">
        <CabeceraSeccion titulo="Series completas" contador={`${seriesDesbloqueadas}/${insignias.porSerie.length}`} />
        <div className="re-medallas-grid">
          {insignias.porSerie.map((b, i) => (
            <Medalla
              key={b.id}
              nombre={b.nombre}
              icono={b.icono}
              desbloqueada={b.desbloqueada}
              progreso={b.progreso}
              variante="serie"
              delay={i * 0.06}
              onDescargarCertificado={b.desbloqueada ? () => descargarCertificadoSerie(b.nombre) : undefined}
            />
          ))}
        </div>
      </div>

      {mostrarElegibilidad && (
        <>
          <h2 className="re-subtitulo" style={{ color: 'var(--rg-paper)', margin: '2rem 0 1rem' }}>
            Elegibilidad para servir
          </h2>
          <TarjetaElegibilidad titulo="Voluntariado en la iglesia" resultado={insignias.elegibilidad.voluntariado} />
          <TarjetaElegibilidad titulo="Viajes misioneros" resultado={insignias.elegibilidad.misiones} />
        </>
      )}

      {mostrarRanking && (
        <>
          <h2 className="re-subtitulo" style={{ color: 'var(--rg-paper)', margin: '2rem 0 1rem' }}>
            Ranking del grupo
          </h2>
          <div className="re-card">
            <div className="re-tabla-wrap">
              <table className="re-tabla">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Joven</th>
                    <th>Cápsulas</th>
                    <th>Racha</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((fila, i) => (
                    <tr
                      key={fila.joven.uid}
                      className={fila.joven.uid === usuario.uid ? 're-fila-actual' : undefined}
                    >
                      <td className="re-tabla__posicion">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar nombre={fila.joven.nombre} foto={fila.joven.fotoPerfil} uid={fila.joven.uid} size={26} />
                        {fila.joven.nombre}
                      </td>
                      <td>{fila.totalCompletadas}</td>
                      <td>{fila.racha > 0 ? `🔥 ${fila.racha}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  getInsigniasDe,
  getMostrarElegibilidadAJovenes,
  getRachaSemanas,
  getHistorialSemanas,
  getMostrarRankingAJovenes,
  getRanking,
  getInsigniasManualesDe,
  getExperienciaDe,
  actualizarPerfil,
  getEquipos,
  calcularRankingEquipos,
  getResumenSerie,
  MARCOS_AVATAR,
} from '../store'
import { Link } from 'react-router-dom'
import Sky from '../components/Sky'
import { PodioRanking, TablaRanking, RankingEquipos } from '../components/Ranking'
import Avatar from '../components/Avatar'
import BotonAccion from '../components/BotonAccion'
import TarjetaExperiencia from '../components/TarjetaExperiencia'
import RachaBadge from '../components/RachaBadge'
import { generarCertificado, compartirCertificado } from '../utils/certificado'
import { generarWrappedSerie } from '../utils/wrapped'
import { compartirImagen } from '../utils/shareCard'

function Medalla({ nombre, icono, imagen, desbloqueada, progreso, variante, delay = 0, onDescargarCertificado, destacada, onDestacar, onResumen }) {
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
        <BotonAccion className="re-medalla__certificado" onClick={onDescargarCertificado}>
          🎓 Certificado
        </BotonAccion>
      )}
      {desbloqueada && onResumen && (
        <BotonAccion className="re-medalla__certificado re-medalla__resumen" onClick={onResumen} textoCargando="Armando…">
          🎬 Resumen
        </BotonAccion>
      )}
      {desbloqueada && onDestacar && (
        <button type="button" className={`re-medalla__destacar ${destacada ? 'activo' : ''}`} onClick={onDestacar}>
          {destacada ? '★ Destacada' : '☆ Destacar'}
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
function HeroRango({ insignias, racha, onDescargarCertificado, destacada, onDestacar }) {
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
            <BotonAccion className="re-hero-rango__certificado" onClick={onDescargarCertificado}>
              🎓 Descargar certificado
            </BotonAccion>
          )}
          {insignias.nivelActual && onDestacar && (
            <button type="button" className={`re-medalla__destacar ${destacada ? 'activo' : ''}`} onClick={onDestacar}>
              {destacada ? '★ Destacada' : '☆ Destacar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function TarjetaMarcos({ nivel, usuario }) {
  const siguiente = MARCOS_AVATAR.find((m) => m.nivel > nivel)
  return (
    <div className="re-card">
      <div className="re-seccion-header">
        <h2 className="re-subtitulo" style={{ margin: 0 }}>Marcos de avatar</h2>
        <span className="re-seccion-header__contador">
          {MARCOS_AVATAR.filter((m) => m.nivel <= nivel).length}/{MARCOS_AVATAR.length}
        </span>
      </div>
      <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
        Se desbloquean subiendo de nivel. Elige el tuyo en <Link to="/radgen/education/perfil" className="re-vinculo">tu perfil</Link>.
        {siguiente && ` Siguiente: ${siguiente.nombre} en el nivel ${siguiente.nivel}.`}
      </p>
      <div className="re-marcos-grid">
        {MARCOS_AVATAR.map((m) => {
          const desbloqueado = m.nivel <= nivel
          return (
            <div key={m.id} className={`re-marco-opcion ${desbloqueado ? '' : 're-marco-opcion--bloqueado'} ${usuario.marcoAvatar === m.id ? 'activo' : ''}`}>
              <Avatar nombre={usuario.nombre} foto={usuario.fotoPerfil} uid={usuario.uid} size={46} marco={m.id} colorAcento={usuario.colorAcento} />
              <span className="re-marco-opcion__nombre">{desbloqueado ? m.nombre : `🔒 Nivel ${m.nivel}`}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const rutaPerfilJoven = (uid) => `/radgen/education/joven/${uid}`

function CabeceraSeccion({ titulo, contador }) {
  return (
    <div className="re-seccion-header">
      <h2 className="re-subtitulo" style={{ margin: 0 }}>{titulo}</h2>
      <span className="re-seccion-header__contador">{contador}</span>
    </div>
  )
}

export default function BadgesScreen({ usuario, onActualizar }) {
  const [insignias, setInsignias] = useState(null)
  const [mostrarElegibilidad, setMostrarElegibilidad] = useState(false)
  const [racha, setRacha] = useState(0)
  const [historialSemanas, setHistorialSemanas] = useState([])
  const [mostrarRanking, setMostrarRanking] = useState(false)
  const [ranking, setRanking] = useState([])
  const [insigniasManuales, setInsigniasManuales] = useState([])
  const [experiencia, setExperiencia] = useState(null)
  const [expandidas, setExpandidas] = useState(new Set())
  const [equipos, setEquipos] = useState([])

  function alternarExpandida(id) {
    setExpandidas((prev) => {
      const copia = new Set(prev)
      if (copia.has(id)) copia.delete(id)
      else copia.add(id)
      return copia
    })
  }

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
      if (mr) {
        Promise.all([getRanking(), getEquipos()]).then(([rk, eq]) => {
          setRanking(rk)
          setEquipos(calcularRankingEquipos(eq, rk))
        })
      }
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
      tipo: 'rango',
    })
    await compartirCertificado({
      dataUrl,
      nombreArchivo: `certificado-rango-${insignias.nivelActual.id}.png`,
      titulo: '¡Nuevo rango en RadGen Education!',
      texto: `Alcancé el rango ${insignias.nivelActual.nombre} en RadGen Education 🙌`,
    })
  }

  async function descargarCertificadoSerie(nombreSerie) {
    const dataUrl = await generarCertificado({
      nombreJoven: usuario.nombre,
      logro: `Por completar la serie: ${nombreSerie}`,
      icono: '🏆',
      tipo: 'serie',
    })
    await compartirCertificado({
      dataUrl,
      nombreArchivo: `certificado-serie-${nombreSerie.toLowerCase().replace(/\s+/g, '-')}.png`,
      titulo: '¡Serie completa en RadGen Education!',
      texto: `Terminé la serie "${nombreSerie}" en RadGen Education 🙌`,
    })
  }

  async function verResumenSerie(serieBadge) {
    const resumen = await getResumenSerie(usuario.uid, serieBadge.id.replace(/^serie-/, ''))
    if (!resumen) return
    const dataUrl = await generarWrappedSerie({ nombreJoven: usuario.nombre, resumen })
    await compartirImagen({
      dataUrl,
      nombreArchivo: `resumen-${serieBadge.id}.png`,
      titulo: `Mi resumen de ${resumen.serieTitulo}`,
      texto: `Terminé "${resumen.serieTitulo}" en RadGen Education 🙌`,
    })
  }

  async function descargarCertificadoLeccion(leccion) {
    const dataUrl = await generarCertificado({
      nombreJoven: usuario.nombre,
      logro: leccion.nombre,
      imagenUrl: leccion.imagen,
      tipo: 'leccion',
    })
    await compartirCertificado({
      dataUrl,
      nombreArchivo: `certificado-${leccion.nombre.toLowerCase().replace(/\s+/g, '-')}.png`,
      titulo: '¡Cápsula completada en RadGen Education!',
      texto: `Completé "${leccion.nombre}" en RadGen Education 🙌`,
    })
  }

  async function descargarCertificadoManual(insignia, motivo, sufijoArchivo = '') {
    const dataUrl = await generarCertificado({
      nombreJoven: usuario.nombre,
      logro: insignia.nombre,
      motivo: motivo || undefined,
      imagenUrl: insignia.imagen,
      tipo: 'especial',
    })
    await compartirCertificado({
      dataUrl,
      nombreArchivo: `certificado-${insignia.id}${sufijoArchivo}.png`,
      titulo: '¡Insignia especial en RadGen Education!',
      texto: `Recibí la insignia "${insignia.nombre}" en RadGen Education 🙌`,
    })
  }

  // Guarda una "foto" de la insignia en el perfil (nombre, ícono, imagen) en
  // vez de solo un id — así el perfil la puede mostrar sin tener que volver
  // a calcular todas las insignias del joven cada vez que carga.
  async function destacar(snapshot) {
    if (!onActualizar) return
    const yaEstaba = usuario.insigniaDestacada?.id === snapshot.id
    const actualizado = await actualizarPerfil({
      uid: usuario.uid,
      insigniaDestacada: yaEstaba ? null : snapshot,
    })
    onActualizar(actualizado)
  }

  return (
    <div className="re-shell re-shell--ancho">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
        <h1 className="re-titulo-pagina" style={{ margin: 0 }}>Mis insignias</h1>
        <Sky size={56} pose={poseSky} animado={false} />
      </div>
      <p style={{ fontWeight: 600, opacity: 0.85, marginBottom: '1.5rem' }}>{mensajeSky}</p>

      <HeroRango
        insignias={insignias}
        racha={racha}
        onDescargarCertificado={descargarCertificadoRango}
        destacada={insignias.nivelActual && usuario.insigniaDestacada?.id === insignias.nivelActual.id}
        onDestacar={
          insignias.nivelActual
            ? () => destacar({ id: insignias.nivelActual.id, nombre: insignias.nivelActual.nombre, icono: insignias.nivelActual.icono })
            : undefined
        }
      />

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
              destacada={usuario.insigniaDestacada?.id === b.id}
              onDestacar={b.desbloqueada ? () => destacar({ id: b.id, nombre: b.nombre, icono: b.icono, imagen: b.imagen }) : undefined}
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
          {insigniasManuales
            .filter((b) => b.id !== 'especial')
            .map((b, i) => (
              <div key={b.id}>
                <Medalla
                  nombre={b.nombre}
                  imagen={b.imagen}
                  desbloqueada={b.desbloqueada}
                  progreso={b.veces > 1 ? `${b.veces} veces` : null}
                  variante="serie"
                  delay={i * 0.06}
                  onDescargarCertificado={b.desbloqueada ? () => descargarCertificadoManual(b, b.ultimoMotivo) : undefined}
                  destacada={usuario.insigniaDestacada?.id === b.id}
                  onDestacar={b.desbloqueada ? () => destacar({ id: b.id, nombre: b.nombre, imagen: b.imagen }) : undefined}
                />
                {b.registros.length > 0 && (
                  <button
                    type="button"
                    className="re-vinculo"
                    style={{ display: 'block', margin: '6px auto 0', fontSize: '0.72rem' }}
                    onClick={() => alternarExpandida(b.id)}
                  >
                    {expandidas.has(b.id) ? 'Ocultar detalle' : `Ver cada una (${b.registros.length})`}
                  </button>
                )}
                {expandidas.has(b.id) && (
                  <div className="re-detalle-registros">
                    {b.registros.map((r) => (
                      <div key={r.id} className="re-detalle-registros__fila">
                        <span className="re-detalle-registros__fecha">
                          {new Date(r.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {r.motivo && <span className="re-detalle-registros__motivo">"{r.motivo}"</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      <div className="re-card">
        <CabeceraSeccion
          titulo="Insignias especiales individuales"
          contador={`${insigniasManuales.find((b) => b.id === 'especial')?.veces || 0}`}
        />
        <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
          Por lo mismo que son especiales, cada una se muestra por su cuenta — con su propio motivo y su propio
          certificado.
        </p>
        <div className="re-medallas-grid">
          {(() => {
            const especial = insigniasManuales.find((b) => b.id === 'especial')
            if (!especial) return null
            if (especial.registros.length === 0) {
              return <Medalla nombre="Especial" desbloqueada={false} />
            }
            return especial.registros.map((r, i) => (
              <Medalla
                key={r.id}
                nombre={especial.nombre}
                imagen={especial.imagen}
                desbloqueada
                progreso={r.motivo ? `"${r.motivo}"` : new Date(r.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                variante="serie"
                delay={i * 0.06}
                onDescargarCertificado={() => descargarCertificadoManual(especial, r.motivo, `-${r.id}`)}
                destacada={usuario.insigniaDestacada?.id === `especial-${r.id}`}
                onDestacar={() => destacar({ id: `especial-${r.id}`, nombre: especial.nombre, imagen: especial.imagen })}
              />
            ))
          })()}
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
              onResumen={b.desbloqueada ? () => verResumenSerie(b) : undefined}
              destacada={usuario.insigniaDestacada?.id === b.id}
              onDestacar={b.desbloqueada ? () => destacar({ id: b.id, nombre: b.nombre, icono: b.icono }) : undefined}
            />
          ))}
        </div>
      </div>

      {experiencia && <TarjetaMarcos nivel={experiencia.nivel} usuario={usuario} />}

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
          <div className="re-card re-card--ranking">
            <p style={{ marginTop: 0, marginBottom: 12, opacity: 0.75 }}>
              Ordenado por experiencia (XP) y, si hay empate, por insignias totales.
            </p>
            <PodioRanking ranking={ranking} rutaPerfil={rutaPerfilJoven} uidActual={usuario.uid} />
            <TablaRanking ranking={ranking} rutaPerfil={rutaPerfilJoven} uidActual={usuario.uid} />
          </div>
          {equipos.length > 0 && (
            <div className="re-card re-card--ranking">
              <h2 className="re-subtitulo">Equipos</h2>
              <RankingEquipos equipos={equipos} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

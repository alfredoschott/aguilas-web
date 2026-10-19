import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import useReveal from '../hooks/useReveal'

// Se usa mientras el admin no haya cargado horarios propios en Firestore
// (colección "horarios"), para que la sección nunca se vea vacía.
const HORARIOS_FALLBACK = [
  { dia: 'Domingo', diaSemana: 0, hora: 9, minuto: 45 },
  { dia: 'Domingo', diaSemana: 0, hora: 11, minuto: 45 },
  { dia: 'Miércoles', diaSemana: 3, hora: 19, minuto: 0 },
  { dia: 'Lunes', diaSemana: 1, hora: 19, minuto: 30, subtitulo: 'Tabernáculo' },
]

function formatearHora(hora, minuto) {
  const ampm = hora >= 12 ? 'PM' : 'AM'
  let h12 = hora % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${String(minuto).padStart(2, '0')} ${ampm}`
}

function agruparHorarios(horarios) {
  const ordenados = [...horarios].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
  const grupos = []
  const indice = new Map()
  for (const h of ordenados) {
    const key = h.dia + '||' + (h.subtitulo || '')
    if (!indice.has(key)) {
      const grupo = { dia: h.dia, subtitulo: h.subtitulo || '', horarios: [] }
      indice.set(key, grupo)
      grupos.push(grupo)
    }
    indice.get(key).horarios.push(h)
  }
  grupos.forEach((g) => g.horarios.sort((a, b) => (a.hora * 60 + a.minuto) - (b.hora * 60 + b.minuto)))
  return grupos
}

// Duración por defecto de un servicio; un servicio también termina cuando
// empieza el siguiente del mismo día (ej. el de 9:45 acaba a las 11:45).
const DURACION_DEFAULT_MIN = 120

function proximoServicio(horarios, ahora = new Date()) {
  if (horarios.length === 0) return null
  let mejor = null
  for (const h of horarios) {
    const fecha = new Date(ahora)
    const delta = (h.diaSemana - ahora.getDay() + 7) % 7
    fecha.setDate(ahora.getDate() + delta)
    fecha.setHours(h.hora, h.minuto, 0, 0)
    if (fecha <= ahora) fecha.setDate(fecha.getDate() + 7)
    if (!mejor || fecha < mejor.fecha) mejor = { ...h, fecha }
  }
  return mejor
}

function servicioEnCurso(horarios, ahora = new Date()) {
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes() + ahora.getSeconds() / 60
  const delDia = horarios.filter((h) => h.diaSemana === ahora.getDay())
  let enCurso = null
  for (const h of delDia) {
    const inicio = h.hora * 60 + h.minuto
    let fin = inicio + (h.duracionMin || DURACION_DEFAULT_MIN)
    for (const o of delDia) {
      const oi = o.hora * 60 + o.minuto
      if (oi > inicio && oi < fin) fin = oi
    }
    if (minAhora >= inicio && minAhora < fin && (!enCurso || inicio > enCurso.inicio)) {
      enCurso = { ...h, inicio }
    }
  }
  return enCurso
}

const ORDINALES = ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto']

// "Primer servicio", "Segundo servicio"... solo cuando ese día/lugar tiene más de uno.
function ordinalServicio(h, horarios) {
  const mismos = horarios
    .filter((o) => o.dia === h.dia && (o.subtitulo || '') === (h.subtitulo || ''))
    .sort((a, b) => (a.hora * 60 + a.minuto) - (b.hora * 60 + b.minuto))
  if (mismos.length < 2) return ''
  const i = mismos.findIndex((o) => o.hora === h.hora && o.minuto === h.minuto)
  return i >= 0 && ORDINALES[i] ? `${ORDINALES[i]} servicio · ` : ''
}

function useHorarios() {
  const [horariosFirestore, setHorariosFirestore] = useState(null)

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'horarios'), (snapshot) => {
      setHorariosFirestore(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return () => unsubscribe()
  }, [])

  return horariosFirestore && horariosFirestore.length > 0 ? horariosFirestore : HORARIOS_FALLBACK
}

function useProximoServicio(horarios) {
  const [ahora, setAhora] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const proximo = proximoServicio(horarios, ahora)
  const enCurso = servicioEnCurso(horarios, ahora)
  const restante = proximo ? Math.max(0, proximo.fecha - ahora) : 0
  return { proximo, enCurso, restante }
}

function CardServicio({ dia, subtitulo, horarios, activo, esHoy, enCurso }) {
  return (
    <div
      className="card-servicio"
      style={{
        flex: '1 1 220px',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        cursor: 'default',
        borderRadius: '12px',
        border: '1.5px solid var(--verde)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: activo ? '0 0 24px rgba(61,220,4,0.2)' : '0 0 0px rgba(61,220,4,0)',
      }}
    >
      {activo && (
        <span className="card-servicio__badge" style={{
          position: 'absolute',
          top: '0.9rem',
          right: '0.9rem',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontFamily: 'Inter, sans-serif',
          fontWeight: '600',
          fontSize: '0.6rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          <span className="card-servicio__dot" style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--verde)',
            animation: 'whatsappPulso 1.6s ease-out infinite',
          }} />
          {enCurso ? 'En curso' : esHoy ? 'Hoy' : 'Próximo'}
        </span>
      )}
      <div className="card-servicio__sweep" style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '0%',
        height: '100%',
        backgroundColor: '#2BAF1E',
        zIndex: 0,
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <p className="card-servicio__dia" style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '900',
          fontSize: '1.5rem',
          color: 'var(--texto)',
          marginBottom: '0.75rem',
        }}>
          {dia}
        </p>
        {subtitulo && (
          <p className="card-servicio__sub" style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.75rem',
            fontWeight: '500',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--texto-suave)',
            marginBottom: '0.75rem',
          }}>
            {subtitulo}
          </p>
        )}
        {horarios.map((h) => (
          <p key={h} className="card-servicio__dia" style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '1.1rem',
            fontWeight: '300',
            color: 'var(--texto)',
            lineHeight: '1.8',
          }}>
            {h}
          </p>
        ))}
      </div>
    </div>
  )
}

function formatearRestante(ms) {
  const totalSeg = Math.max(0, Math.floor(ms / 1000))
  const dias = Math.floor(totalSeg / 86400)
  const horas = Math.floor((totalSeg % 86400) / 3600)
  const minutos = Math.floor((totalSeg % 3600) / 60)
  const segundos = totalSeg % 60
  const pad = (n) => String(n).padStart(2, '0')
  if (dias > 0) return `${dias}d ${pad(horas)}h ${pad(minutos)}m`
  return `${pad(horas)}h ${pad(minutos)}m ${pad(segundos)}s`
}

function Servicios() {
  const refTitulo = useReveal()
  const refCards = useReveal()
  const horarios = useHorarios()
  const grupos = agruparHorarios(horarios)
  const { proximo, enCurso, restante } = useProximoServicio(horarios)
  const esHoy = !!proximo && proximo.fecha.toDateString() === new Date().toDateString()
  const esUrgente = restante > 0 && restante < 2 * 60 * 60 * 1000
  const etiqueta = (h) => `${ordinalServicio(h, horarios)}${h.dia} ${formatearHora(h.hora, h.minuto)}${h.subtitulo ? ` (${h.subtitulo})` : ''}`
  const enCursoLabel = enCurso ? etiqueta(enCurso) : ''
  const proximoLabel = proximo
    ? `${proximo.dia} ${formatearHora(proximo.hora, proximo.minuto)}${proximo.subtitulo ? ` (${proximo.subtitulo})` : ''}`
    : ''

  return (
    <section id="servicios" style={{
      background: 'radial-gradient(ellipse 900px 600px at 15% 25%, rgba(61,220,4,0.09), transparent 65%), var(--fondo)',
      padding: 'clamp(3rem, 10vw, 8rem) 2rem',
      borderTop: '1px solid var(--borde)',
      position: 'relative',
      overflow: 'hidden',
    }}>

      <div ref={refTitulo} className="reveal" style={{ textAlign: 'center', marginBottom: 'clamp(1.5rem, 4vw, 3rem)', position: 'relative', zIndex: 1 }}>
        <p style={{
          color: 'var(--verde)',
          fontFamily: 'Inter, sans-serif',
          fontWeight: '500',
          fontSize: '0.7rem',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          marginBottom: '1rem',
        }}>
          Únete a nosotros
        </p>
        <h2 style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '900',
          fontSize: 'clamp(2rem, 4vw, 3.5rem)',
          color: 'var(--texto)',
        }}>
          Servicios
        </h2>
      </div>

      {(proximo || enCurso) && (
        <div style={{ textAlign: 'center', marginBottom: 'clamp(1.5rem, 4vw, 3rem)', position: 'relative', zIndex: 1 }}>
          <div className="glass-panel" style={{
            display: 'inline-flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '0.6rem',
            padding: '0.6rem 1.2rem',
            borderRadius: '999px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.85rem',
            color: 'var(--texto-suave)',
            maxWidth: '100%',
            borderColor: enCurso ? 'rgba(61,220,4,0.5)' : esUrgente ? 'rgba(255,159,10,0.5)' : undefined,
            animation: !enCurso && esUrgente ? 'urgentPulso 1.8s ease-in-out infinite' : 'none',
          }}>
            {enCurso ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--verde)',
                  animation: 'whatsappPulso 1.6s ease-out infinite',
                }} />
                Servicio en curso: <strong style={{ color: 'var(--verde)' }}>{enCursoLabel}</strong>
              </span>
            ) : (
              <>
                <span>{esUrgente ? '¡Ya casi empieza!' : 'Próximo servicio:'} <strong style={{ color: 'var(--texto)' }}>{proximoLabel}</strong></span>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: '700',
                  color: esUrgente ? '#FF9F0A' : 'var(--verde)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatearRestante(restante)}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <div ref={refCards} className="reveal" style={{
        display: 'flex',
        gap: '1.5rem',
        justifyContent: 'center',
        maxWidth: '900px',
        margin: '0 auto',
        flexWrap: 'wrap',
        position: 'relative',
        zIndex: 1,
      }}>
        {grupos.map((g) => {
          const objetivo = enCurso || proximo
          const activo = !!objetivo && objetivo.dia === g.dia && (objetivo.subtitulo || '') === g.subtitulo
          return (
            <CardServicio
              key={g.dia + '||' + g.subtitulo}
              dia={g.dia}
              subtitulo={g.subtitulo}
              horarios={g.horarios.map((h) => formatearHora(h.hora, h.minuto))}
              activo={activo}
              esHoy={activo && (!!enCurso || esHoy)}
              enCurso={activo && !!enCurso}
            />
          )
        })}
      </div>

    </section>
  )
}

export default Servicios

import { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarDays, CalendarPlus, Clock, MapPin } from 'lucide-react'
import useReveal from '../hooks/useReveal'

// Domingo 6 de diciembre de 2026, 11:00 AM (hora local del visitante, que
// para la iglesia es la de Tizayuca). La sección se oculta pasado el evento.
const FECHA_EVENTO = new Date(2026, 11, 6, 11, 0, 0)
const URL_LUGAR = 'https://share.google/j7C5Cd9w30uKruigy'
const FIN_EVENTO = new Date(2026, 11, 6, 15, 0, 0)

function useCuentaRegresiva() {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return { ahora, falta: Math.max(0, FECHA_EVENTO - ahora) }
}

// Archivo .ics para agregar el evento al calendario del teléfono o computadora.
function descargarCalendario() {
  const fmt = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`
  const fin = new Date(FECHA_EVENTO.getTime() + 2 * 3600 * 1000)
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Aguilas CFC Tizayuca//13 Aniversario//ES',
    'BEGIN:VEVENT',
    'UID:aniversario-13@aguilascfc',
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(FECHA_EVENTO)}`,
    `DTEND:${fmt(fin)}`,
    'SUMMARY:13 años de fidelidad - Águilas CFC',
    'LOCATION:Salón Dango',
    `URL:${URL_LUGAR}`,
    'DESCRIPTION:Celebración del 13 aniversario de Águilas Centro Familiar Cristiano.',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = '13-aniversario-aguilas.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Unidad({ valor, etiqueta }) {
  return (
    <div className="aniv-unidad">
      {/* key = valor: el número se re-anima cada vez que cambia */}
      <span key={valor} className="aniv-unidad__valor">{String(valor).padStart(2, '0')}</span>
      <span className="aniv-unidad__etiqueta">{etiqueta}</span>
    </div>
  )
}

function Aniversario() {
  const ref = useReveal()
  const { ahora, falta } = useCuentaRegresiva()

  if (ahora > FIN_EVENTO) return null

  const seg = Math.floor(falta / 1000)
  const dias = Math.floor(seg / 86400)
  const horas = Math.floor((seg % 86400) / 3600)
  const minutos = Math.floor((seg % 3600) / 60)
  const segundos = seg % 60
  const empezo = ahora >= FECHA_EVENTO

  return (
    <section id="aniversario" className="aniv">
      <div className="aniv__luz" aria-hidden="true" />
      <div className="aniv__forma aniv__forma--1" aria-hidden="true" />
      <div className="aniv__forma aniv__forma--2" aria-hidden="true" />
      <div className="aniv__barra" aria-hidden="true" />

      <div ref={ref} className="reveal aniv__contenido">
        <div className="aniv__izq">
          <div className="aniv__escena">
            <div className="aniv__numero" role="img" aria-label="13" />
            <div className="aniv__numero aniv__numero--brillo" aria-hidden="true" />
          </div>

            {empezo ? (
              <p className="aniv__ahora"><span className="aniv__punto" /> ¡Estamos celebrando!</p>
            ) : (
              <div className="aniv__cuenta" aria-label="Tiempo que falta para la celebración">
                <Unidad valor={dias} etiqueta="días" />
                <Unidad valor={horas} etiqueta="horas" />
                <Unidad valor={minutos} etiqueta="min" />
                <Unidad valor={segundos} etiqueta="seg" />
              </div>
            )}
        </div>

        <div className="aniv__texto">
          <img src="/ACFC.png" alt="Águilas Centro Familiar Cristiano" className="aniv__logo" width="64" height="64" />
          <p className="aniv__anos">Años de</p>
          <h2 className="aniv__fidelidad">fidelidad</h2>

          <blockquote className="aniv__lema">
            <span className="aniv__lema-comillas" aria-hidden="true">“</span>
            <span className="aniv__lema-1">Fieles hasta aquí,</span>
            <span className="aniv__lema-2">firmes hacia lo que viene</span>
            <span className="aniv__lema-tag">Lema del aniversario</span>
          </blockquote>

          <p className="aniv__celebra">Celebra con nosotros 13 años de la fidelidad de Dios en nuestra casa.</p>

          <ul className="aniv__datos">
            <li><span className="aniv__icono"><CalendarDays size={18} aria-hidden="true" /></span> Domingo 6 de diciembre</li>
            <li><span className="aniv__icono"><Clock size={18} aria-hidden="true" /></span> 11:00 am</li>
            <li className="aniv__dato-enlace">
              <a href={URL_LUGAR} target="_blank" rel="noopener noreferrer" aria-label="Salón Dango, abrir ubicación en el mapa">
                <span className="aniv__icono"><MapPin size={18} aria-hidden="true" /></span>
                Salón Dango
                <ArrowUpRight size={16} aria-hidden="true" className="aniv__flecha" />
              </a>
            </li>
          </ul>

          <button type="button" className="aniv__boton" onClick={descargarCalendario}>
            <CalendarPlus size={18} aria-hidden="true" /> Agregar al calendario
          </button>
        </div>
      </div>

      <div className="aniv__barra aniv__barra--abajo" aria-hidden="true" />
    </section>
  )
}

export default Aniversario

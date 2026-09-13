import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import useReveal from '../hooks/useReveal'

function TarjetaAnuncio({ anuncio }) {
  const linkWhatsapp = !anuncio.link && anuncio.mensajeConsolidacion
    ? 'https://wa.me/527711107903?text=' + encodeURIComponent(anuncio.mensajeConsolidacion)
    : null
  const href = anuncio.link || linkWhatsapp
  const Tarjeta = href ? 'a' : 'div'
  const propsLink = href
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : {}

  return (
    <Tarjeta {...propsLink} className="glass-panel" style={{
      borderRadius: '18px',
      overflow: 'hidden',
      maxWidth: '420px',
      margin: '0 auto 1.5rem auto',
      position: 'relative',
      zIndex: 1,
      display: 'block',
      textDecoration: 'none',
      cursor: href ? 'pointer' : 'default',
    }}>
      {anuncio.imagenUrl && (
        <img
          src={anuncio.imagenUrl}
          alt={anuncio.titulo}
          width="420"
          height="420"
          loading="lazy"
          decoding="async"
          style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }}
        />
      )}
      <div style={{ padding: '1.5rem' }}>
        <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: '900', fontSize: '1.2rem', color: 'var(--texto)', marginBottom: '0.4rem' }}>
          {anuncio.titulo}
        </h3>
        {anuncio.texto && (
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: 'var(--texto-suave)', lineHeight: '1.6', margin: 0 }}>
            {anuncio.texto}
          </p>
        )}
      </div>
    </Tarjeta>
  )
}

function estaVigente(anuncio) {
  const hoy = new Date()
  if (anuncio.fechaExpiracion) {
    const expiracion = new Date(anuncio.fechaExpiracion + 'T23:59:59')
    if (expiracion < hoy) return false
  }
  if (anuncio.fechaPublicacion) {
    const publicacion = new Date(anuncio.fechaPublicacion + 'T00:00:00')
    if (publicacion > hoy) return false
  }
  return true
}

function ordenValor(item) {
  if (typeof item.orden === 'number') return item.orden
  return item.creado?.toMillis ? item.creado.toMillis() : 0
}

function Anuncios() {
  const [anuncios, setAnuncios] = useState([])
  const refTitulo = useReveal()

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'anuncios'), function (snapshot) {
      setAnuncios(snapshot.docs.map(function (d) {
        return { id: d.id, ...d.data() }
      }))
    })
    return () => unsubscribe()
  }, [])

  const anunciosVigentes = anuncios.filter(estaVigente).sort((a, b) => ordenValor(b) - ordenValor(a))

  if (anunciosVigentes.length === 0) return null

  return (
    <section style={{ background: 'radial-gradient(ellipse 800px 500px at 85% 0%, rgba(61,220,4,0.08), transparent 65%), var(--fondo)', padding: 'clamp(2.5rem, 7vw, 5rem) 2rem', borderTop: '1px solid var(--borde)', overflow: 'hidden', position: 'relative' }}>
      <div ref={refTitulo} style={{ textAlign: 'center', marginBottom: '2.5rem', position: 'relative', zIndex: 1 }}>
        <p style={{ color: 'var(--verde)', fontFamily: 'Inter, sans-serif', fontWeight: '600', fontSize: '0.75rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Mantente informado
        </p>
        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: '900', fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: 'var(--texto)' }}>
          Anuncios
        </h2>
      </div>

      {anunciosVigentes.map(function (anuncio) {
        return <TarjetaAnuncio key={anuncio.id} anuncio={anuncio} />
      })}
    </section>
  )
}

export default Anuncios
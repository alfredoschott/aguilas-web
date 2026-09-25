import { useEffect, useState } from 'react'
import { actualizarPerfil, getInsigniasDe, getRachaSemanas, getInsigniasManualesDe, getExperienciaDe, MARCOS_AVATAR, imagenDeInsignia } from '../store'
import { recortarYComprimir } from '../utils/imagenPerfil'
import { sonidosActivos, setSonidosActivos, sonidoCompletar } from '../utils/sonidos'
import { notificacionesSoportadas, permisoNotificaciones, pedirPermisoNotificaciones } from '../utils/notificaciones'
import Avatar from '../components/Avatar'
import Sky from '../components/Sky'

const COLORES_ACENTO = [
  { valor: null, nombre: 'Automático' },
  { valor: '#2952E3', nombre: 'Azul' },
  { valor: '#FF3B3B', nombre: 'Rojo' },
  { valor: '#E3A234', nombre: 'Ámbar' },
  { valor: '#34A853', nombre: 'Verde' },
  { valor: '#9333E3', nombre: 'Morado' },
  { valor: '#FF6AC1', nombre: 'Rosa' },
]

const FONDOS_PERFIL = [
  { valor: null, nombre: 'Clásico' },
  { valor: 'fuego', nombre: 'Fuego' },
  { valor: 'oceano', nombre: 'Océano' },
  { valor: 'bosque', nombre: 'Bosque' },
  { valor: 'amanecer', nombre: 'Amanecer' },
  { valor: 'noche', nombre: 'Noche' },
]

const SKY_OPCIONES = [
  { valor: null, pose: 'relajado', nombre: 'Automático' },
  { valor: 'saludando', pose: 'saludando', nombre: 'Saludando' },
  { valor: 'estudiando', pose: 'estudiando', nombre: 'Estudiando' },
  { valor: 'caminando', pose: 'caminando', nombre: 'Caminando' },
  { valor: 'relajado', pose: 'relajado', nombre: 'Relajado' },
  { valor: 'logrado', pose: 'logrado', nombre: 'Logrado' },
]

export default function PerfilScreen({ usuario, onActualizar }) {
  const [nombre, setNombre] = useState(usuario.nombre)
  const [apodo, setApodo] = useState(usuario.apodo || '')
  const [bio, setBio] = useState(usuario.bio || '')
  const [foto, setFoto] = useState(usuario.fotoPerfil)
  const [colorAcento, setColorAcento] = useState(usuario.colorAcento || null)
  const [fondoPerfil, setFondoPerfil] = useState(usuario.fondoPerfil || null)
  const [skyElegido, setSkyElegido] = useState(usuario.skyElegido || null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [marco, setMarco] = useState(null)
  const [racha, setRacha] = useState(0)
  const [sonidos, setSonidos] = useState(sonidosActivos())
  const [permisoAvisos, setPermisoAvisos] = useState(permisoNotificaciones())
  const [insigniasEspeciales, setInsigniasEspeciales] = useState([])
  const [marcoAvatar, setMarcoAvatar] = useState(usuario.marcoAvatar || null)
  const [nivelXp, setNivelXp] = useState(null)

  useEffect(() => {
    Promise.all([
      getInsigniasDe(usuario.uid),
      getRachaSemanas(usuario.uid),
      getInsigniasManualesDe(usuario.uid),
      usuario.rol === 'joven' ? getExperienciaDe(usuario.uid) : Promise.resolve(null),
    ]).then(
      ([insignias, r, manuales, exp]) => {
        setNivelXp(usuario.rol === 'lider' ? Infinity : exp?.nivel ?? null)
        setMarco(insignias.nivelActual?.id || null)
        setRacha(r)
        const especial = manuales.find((m) => m.id === 'especial')
        setInsigniasEspeciales(
          especial ? especial.registros.map((r) => ({ ...r, nombre: especial.nombre, imagen: especial.imagen })) : [],
        )
      },
    )
  }, [usuario.uid, usuario.rol])

  async function elegirFoto(e) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setError('')
    setCargando(true)
    try {
      const recortada = await recortarYComprimir(archivo)
      setFoto(recortada)
    } catch {
      setError('No pudimos leer esa imagen. Intenta con otra.')
    } finally {
      setCargando(false)
    }
  }

  async function guardar() {
    if (!nombre.trim()) return
    setCargando(true)
    try {
      const actualizado = await actualizarPerfil({
        uid: usuario.uid,
        nombre,
        fotoPerfil: foto,
        apodo,
        bio,
        colorAcento,
        fondoPerfil,
        skyElegido,
        marcoAvatar,
      })
      onActualizar(actualizado)
      setMensaje('¡Perfil actualizado!')
      setTimeout(() => setMensaje(''), 2000)
    } finally {
      setCargando(false)
    }
  }

  function alternarSonidos() {
    const nuevoValor = !sonidos
    setSonidosActivos(nuevoValor)
    setSonidos(nuevoValor)
    if (nuevoValor) sonidoCompletar()
  }

  async function activarAvisos() {
    setPermisoAvisos(await pedirPermisoNotificaciones())
  }

  return (
    <div className="re-shell">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.5rem' }}>
        <h1 className="re-titulo-pagina" style={{ margin: 0 }}>Mi perfil</h1>
        <Sky size={56} pose="relajado" animado={false} />
      </div>

      <div className={`re-perfil-hero ${fondoPerfil ? `re-fondo-perfil--${fondoPerfil}` : ''}`}>
        <Avatar nombre={nombre} uid={usuario.uid} foto={foto} size={110} marco={marcoAvatar || marco} racha={racha} colorAcento={colorAcento} />

        {apodo && <p className="re-perfil-apodo">{apodo}</p>}

        <div>
          <label className="re-btn re-btn--sm" style={{ display: 'inline-block', marginTop: 16, cursor: 'pointer' }}>
            {cargando ? 'Cargando…' : foto ? 'Cambiar foto' : 'Elegir foto'}
            <input type="file" accept="image/*" onChange={elegirFoto} style={{ display: 'none' }} disabled={cargando} />
          </label>
        </div>
        {error && <p className="re-error" style={{ marginTop: 16 }}>{error}</p>}

        {bio && <p className="re-bio-card">"{bio}"</p>}
      </div>

      <div className="re-card">
        <label className="re-label">Nombre</label>
        <input
          className="re-input"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tu nombre"
        />

        <label className="re-label">Apodo o título (opcional)</label>
        <input
          className="re-input"
          value={apodo}
          onChange={(e) => setApodo(e.target.value.slice(0, 40))}
          placeholder="Ej. El fiel, Guerrero de oración…"
        />

        <label className="re-label">Frase o versículo favorito (opcional)</label>
        <textarea
          className="re-input"
          rows={2}
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 140))}
          placeholder="Algo que te represente — una frase, un versículo…"
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />

        <button className="re-btn re-btn--lleno" onClick={guardar} disabled={!nombre.trim() || cargando}>
          {cargando ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {mensaje && <span style={{ marginLeft: 12, fontWeight: 700 }}>{mensaje}</span>}
      </div>

      <div className="re-card">
        <h2 className="re-subtitulo">Color de acento</h2>
        <p style={{ marginTop: 0, marginBottom: 14, opacity: 0.75 }}>
          Tiñe tu avatar y se ve también en el ranking, para que te reconozcan de un vistazo.
        </p>
        <div className="re-swatch-fila">
          {COLORES_ACENTO.map((c) => (
            <button
              key={c.nombre}
              type="button"
              title={c.nombre}
              className={`re-swatch ${colorAcento === c.valor ? 'activo' : ''}`}
              style={{ background: c.valor || 'var(--rg-paper)' }}
              onClick={() => setColorAcento(c.valor)}
            />
          ))}
        </div>

        <h2 className="re-subtitulo">Fondo de tu tarjeta</h2>
        <div className="re-swatch-fila">
          {FONDOS_PERFIL.map((f) => (
            <button
              key={f.nombre}
              type="button"
              title={f.nombre}
              className={`re-fondo-swatch ${fondoPerfil === f.valor ? 'activo' : ''} ${f.valor ? `re-fondo-perfil--${f.valor}` : ''}`}
              style={!f.valor ? { background: 'var(--rg-paper)' } : undefined}
              onClick={() => setFondoPerfil(f.valor)}
            />
          ))}
        </div>

        {nivelXp !== null && (
          <>
            <h2 className="re-subtitulo">Marco de tu avatar</h2>
            <p style={{ marginTop: 0, marginBottom: 14, opacity: 0.75 }}>
              {nivelXp === Infinity
                ? 'Como líder tienes nivel infinito ♾️ — todos los marcos están desbloqueados para ti.'
                : `Vas en el nivel ${nivelXp}. Cada marco se desbloquea al llegar a su nivel.`}
            </p>
            <div className="re-marcos-grid" style={{ marginBottom: 20 }}>
              <button
                type="button"
                className={`re-marco-opcion ${!marcoAvatar ? 'activo' : ''}`}
                onClick={() => setMarcoAvatar(null)}
              >
                <Avatar nombre={nombre} foto={foto} uid={usuario.uid} size={46} marco={marco} colorAcento={colorAcento} />
                <span className="re-marco-opcion__nombre">{nivelXp === Infinity ? 'Sin marco' : 'Por rango'}</span>
              </button>
              {MARCOS_AVATAR.map((m) => {
                const desbloqueado = m.nivel <= nivelXp
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`re-marco-opcion ${desbloqueado ? '' : 're-marco-opcion--bloqueado'} ${marcoAvatar === m.id ? 'activo' : ''}`}
                    onClick={() => desbloqueado && setMarcoAvatar(m.id)}
                    disabled={!desbloqueado}
                  >
                    <Avatar nombre={nombre} foto={foto} uid={usuario.uid} size={46} marco={m.id} colorAcento={colorAcento} />
                    <span className="re-marco-opcion__nombre">{desbloqueado ? m.nombre : `🔒 Nivel ${m.nivel}`}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        <h2 className="re-subtitulo">Tu compañero Sky</h2>
        <p style={{ marginTop: 0, marginBottom: 14, opacity: 0.75 }}>
          Elige qué pose de Sky te acompaña en tus lecciones — o deja que cambie sola según tu progreso.
        </p>
        <div className="re-sky-picker">
          {SKY_OPCIONES.map((s) => (
            <button
              key={s.nombre}
              type="button"
              className={`re-sky-picker__opcion ${skyElegido === s.valor ? 'activo' : ''}`}
              onClick={() => setSkyElegido(s.valor)}
            >
              <Sky size={40} pose={s.pose} animado={false} />
              <div style={{ marginTop: 4 }}>{s.nombre}</div>
            </button>
          ))}
        </div>

        <button className="re-btn re-btn--lleno" onClick={guardar} disabled={!nombre.trim() || cargando}>
          {cargando ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {mensaje && <span style={{ marginLeft: 12, fontWeight: 700 }}>{mensaje}</span>}
      </div>

      <div className="re-card">
        <button type="button" className={`re-switch ${sonidos ? 'activo' : ''}`} onClick={alternarSonidos}>
          <span className="re-switch__perilla" />
          <span>{sonidos ? '🔊 Sonidos activados' : '🔇 Sonidos desactivados'}</span>
        </button>

        {notificacionesSoportadas() && (
          <div style={{ marginTop: 14 }}>
            {permisoAvisos === 'granted' && (
              <p style={{ margin: 0, fontWeight: 700 }}>🔔 Avisos activados — te aviso si tu racha está en riesgo o si una cápsula está por bajar de valor.</p>
            )}
            {permisoAvisos === 'denied' && (
              <p style={{ margin: 0, opacity: 0.7, fontSize: '0.85rem' }}>
                🔕 Bloqueaste los avisos para este sitio — actívalos desde los permisos del navegador si quieres recibirlos.
              </p>
            )}
            {permisoAvisos === 'default' && (
              <button type="button" className="re-btn re-btn--sm" onClick={activarAvisos}>
                🔔 Activar avisos (racha y cápsulas por vencer)
              </button>
            )}
          </div>
        )}
      </div>

      {insigniasEspeciales.length > 0 && (
        <div className="re-card">
          <h2 className="re-subtitulo">Insignias especiales</h2>
          <p style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
            Estas se ven también en tu perfil público.
          </p>
          <div className="re-medallas-grid">
            {insigniasEspeciales.map((r) => (
              <div key={r.id} className="re-medalla">
                <div className="re-medalla__icono">
                  <img src={r.imagen} alt="" className="re-medalla__imagen" />
                </div>
                <p className="re-medalla__nombre">{r.nombre}</p>
                {r.motivo && <p className="re-medalla__progreso">"{r.motivo}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {usuario.insigniaDestacada && (
        <div className="re-card" style={{ textAlign: 'center' }}>
          <h2 className="re-subtitulo">Insignia destacada</h2>
          <div className="re-insignia-destacada">
            <span className="re-insignia-destacada__icono">
              {imagenDeInsignia(usuario.insigniaDestacada) ? (
                <img src={imagenDeInsignia(usuario.insigniaDestacada)} alt="" />
              ) : (
                usuario.insigniaDestacada.icono
              )}
            </span>
            <span className="re-insignia-destacada__texto">{usuario.insigniaDestacada.nombre}</span>
          </div>
          <p style={{ marginTop: 14, marginBottom: 0, opacity: 0.7, fontSize: '0.8rem' }}>
            Cámbiala desde "Mis insignias" con el botón ⭐ Destacar.
          </p>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { actualizarPerfil } from '../store'
import { recortarYComprimir } from '../utils/imagenPerfil'
import Avatar from '../components/Avatar'
import Sky from '../components/Sky'

export default function PerfilScreen({ usuario, onActualizar }) {
  const [nombre, setNombre] = useState(usuario.nombre)
  const [foto, setFoto] = useState(usuario.fotoPerfil)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

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
      const actualizado = await actualizarPerfil({ uid: usuario.uid, nombre, fotoPerfil: foto })
      onActualizar(actualizado)
      setMensaje('¡Perfil actualizado!')
      setTimeout(() => setMensaje(''), 2000)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="re-shell">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.5rem' }}>
        <h1 className="re-titulo-pagina" style={{ margin: 0 }}>Mi perfil</h1>
        <Sky size={56} pose="relajado" animado={false} />
      </div>

      <div className="re-card" style={{ textAlign: 'center' }}>
        <Avatar nombre={nombre} uid={usuario.uid} foto={foto} size={110} />

        <label className="re-btn re-btn--sm" style={{ display: 'inline-block', marginTop: 16, cursor: 'pointer' }}>
          {cargando ? 'Cargando…' : foto ? 'Cambiar foto' : 'Elegir foto'}
          <input type="file" accept="image/*" onChange={elegirFoto} style={{ display: 'none' }} disabled={cargando} />
        </label>
        {error && <p className="re-error" style={{ marginTop: 16 }}>{error}</p>}
      </div>

      <div className="re-card">
        <label className="re-label">Nombre</label>
        <input
          className="re-input"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tu nombre"
        />
        <button className="re-btn re-btn--lleno" onClick={guardar} disabled={!nombre.trim() || cargando}>
          {cargando ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {mensaje && <span style={{ marginLeft: 12, fontWeight: 700 }}>{mensaje}</span>}
      </div>
    </div>
  )
}

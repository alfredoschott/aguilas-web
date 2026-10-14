import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { addDoc, collection, getDocs, query, serverTimestamp, where, db } from './posFirestore'
import { Copy, FilePlus2, History } from 'lucide-react'
import { usePortalAuth } from '../PortalAuthContext'
import FormConfigPos from './FormConfigPos'
import PosCabecera from './PosCabecera'
import { POS_BASE, accesoPos, copiarProductos, hoyISO, idMinisterioUsuario, pctDiezmo, prepararConfig, useMinisterios } from './posUtils'
import '../portal.css'
import './pos.css'

const VACIO = (nombreUsuario) => ({ nombre: '', fecha: hoyISO(), meta: '', fondoInicial: '', diezmoPct: 10, vendedores: nombreUsuario ? [nombreUsuario] : [], productos: [] })

export default function PosNuevaVenta() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { userData, user } = usePortalAuth()
  const { ministerios } = useMinisterios()
  const acceso = accesoPos(userData)

  const [elegido, setElegido] = useState(params.get('ministerio') || '')
  const ministerio = acceso.directivo ? elegido : (acceso.lider && idMinisterioUsuario(userData, ministerios)) || ''
  const setMinisterio = setElegido
  const [plantillas, setPlantillas] = useState([])
  const [ventasPrevias, setVentasPrevias] = useState([])
  const [origen, setOrigen] = useState(params.get('plantilla') ? `p:${params.get('plantilla')}` : params.get('copiar') ? `v:${params.get('copiar')}` : '')
  const [draft, setDraft] = useState(VACIO(userData?.nombre?.split(' ')[0]))
  const [guardarPlantilla, setGuardarPlantilla] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const accent = ministerios[ministerio]?.color || '#3DDC04'

  useEffect(() => {
    if (!ministerio) return
    let vivo = true
    Promise.all([
      getDocs(query(collection(db, 'pos_plantillas'), where('ministerio', '==', ministerio))),
      getDocs(query(collection(db, 'pos_ventas'), where('ministerio', '==', ministerio))),
    ]).then(([p, v]) => {
      if (!vivo) return
      setPlantillas(p.docs.map((d) => ({ id: d.id, ...d.data() })))
      setVentasPrevias(v.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0)).slice(0, 6))
    }).catch((e) => { console.error(e); setError('No se pudieron cargar las plantillas.') })
    return () => { vivo = false }
  }, [ministerio])

  const fuente = useMemo(() => {
    if (origen.startsWith('p:')) return plantillas.find((p) => p.id === origen.slice(2))
    if (origen.startsWith('v:')) return ventasPrevias.find((v) => v.id === origen.slice(2))
    return null
  }, [origen, plantillas, ventasPrevias])

  // Al elegir de dónde partir se copia su configuración (productos con ids nuevos).
  useEffect(() => {
    if (!fuente) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft((d) => ({
      ...d, nombre: fuente.nombre, meta: fuente.meta || '', fondoInicial: fuente.fondoInicial || '', diezmoPct: pctDiezmo(fuente), vendedores: fuente.vendedores || [],
      productos: copiarProductos(fuente.productos),
    }))
  }, [fuente])

  if (!acceso.permitido) return <div className="pos-page"><p className="pos-empty">No tienes acceso al POS.</p></div>

  async function crear() {
    setError('')
    if (!ministerio) { setError('Elige el ministerio.'); return }
    if (!draft.fecha) { setError('Elige la fecha.'); return }
    const { datos, error: err } = prepararConfig(draft)
    if (err) { setError(err); return }
    setGuardando(true)
    try {
      const ref = await addDoc(collection(db, 'pos_ventas'), {
        ...datos, fecha: draft.fecha, ministerio, estado: 'abierta',
        creadoPor: user?.email?.toLowerCase() || '', creadoEn: serverTimestamp(),
      })
      if (guardarPlantilla) {
        await addDoc(collection(db, 'pos_plantillas'), { ...datos, ministerio, creadoPor: user?.email?.toLowerCase() || '', creadoEn: serverTimestamp() })
      }
      navigate(`${POS_BASE}/${ref.id}`, { replace: true })
    } catch (e) {
      console.error(e)
      setError('No se pudo crear la venta. Intenta de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div className="pos-page" style={{ '--pos-accent': accent }}>
      <div className="pos-wrap" style={{ maxWidth: 760 }}>
        <PosCabecera titulo="Nueva venta" sub="Qué se vende, a qué precio y quién vende" ministerioId={ministerio} ministerioNombre={ministerios[ministerio]?.nombre} volverA={POS_BASE} />

        {acceso.directivo && (
          <div className="pos-field pos-in" style={{ '--i': 2 }}>
            <label className="pos-label" htmlFor="pos-ministerio">Ministerio</label>
            <select id="pos-ministerio" className="pos-select" value={ministerio} onChange={(e) => { setMinisterio(e.target.value); setOrigen('') }}>
              <option value="">Elige un ministerio…</option>
              {Object.keys(ministerios).sort((a, b) => (ministerios[a].nombre || a).localeCompare(ministerios[b].nombre || b)).map((id) => <option key={id} value={id}>{ministerios[id].nombre || id}</option>)}
            </select>
          </div>
        )}

        {ministerio && (plantillas.length > 0 || ventasPrevias.length > 0) && (
          <section className="pos-in" style={{ '--i': 3, marginBottom: 14 }}>
            <h2 className="pos-card-titulo" style={{ marginBottom: 10 }}>¿Desde dónde empezamos?</h2>
            <div className="pos-origenes">
              <button className="pos-origen" aria-pressed={origen === ''} onClick={() => { setOrigen(''); setDraft(VACIO(userData?.nombre?.split(' ')[0])) }}>
                <FilePlus2 size={18} color="var(--pos-accent)" /><strong>En blanco</strong><small>Armo todo desde cero</small>
              </button>
              {plantillas.map((p) => (
                <button key={p.id} className="pos-origen" aria-pressed={origen === `p:${p.id}`} onClick={() => setOrigen(`p:${p.id}`)}>
                  <Copy size={18} color="var(--pos-accent)" /><strong>{p.nombre}</strong><small>Plantilla · {(p.productos || []).length} productos</small>
                </button>
              ))}
              {ventasPrevias.slice(0, 3).map((v) => (
                <button key={v.id} className="pos-origen" aria-pressed={origen === `v:${v.id}`} onClick={() => setOrigen(`v:${v.id}`)}>
                  <History size={18} color="var(--pos-accent)" /><strong>{v.nombre}</strong><small>Copiar venta del {v.fecha}</small>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="pos-in" style={{ '--i': 4 }}>
          <FormConfigPos valor={draft} onChange={setDraft} mostrarFecha etiquetaNombre="Nombre de la venta" />
        </div>

        <label className="pos-switch pos-in" style={{ '--i': 5 }}>
          <input type="checkbox" checked={guardarPlantilla} onChange={(e) => setGuardarPlantilla(e.target.checked)} style={{ accentColor: 'var(--pos-accent)' }} />
          Guardar esta configuración como plantilla para la próxima vez
        </label>

        {error && <div className="pos-error" role="alert">{error}</div>}
        <button className="pos-btn pos-btn-primary pos-btn-lg pos-btn-block" disabled={guardando} onClick={crear}>
          {guardando ? 'Creando…' : 'Abrir venta'}
        </button>
      </div>
    </div>
  )
}

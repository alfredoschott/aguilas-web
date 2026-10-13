import { useEffect, useMemo, useState } from 'react'
import { X, QrCode, Copy, Share2, Power, RefreshCw, Clock, ShieldCheck, Smartphone, Check, Trash2 } from 'lucide-react'
import { Timestamp, db, doc, serverTimestamp, setDoc, updateDoc } from './posFirestore'
import { Avatar } from './posUi'
import { HORAS_ACCESO, accesoVigente, aDate, generarToken, urlCobro } from './posAcceso'

// El líder invita a otra persona a cobrar desde su propio celular, sin cuenta:
// muestra un QR, aprueba cada dispositivo que se conecta y puede apagarlo cuando quiera.
export default function ModalAccesoCobro({ venta, ventaId, acceso, dispositivos, email, onCerrar, avisar }) {
  const [qr, setQr] = useState('')
  const [editar, setEditar] = useState({}) // permiso elegido antes de aprobar
  const [ocupado, setOcupado] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())

  const vigente = accesoVigente(acceso, venta, ahora)
  const enlace = vigente ? urlCobro(ventaId, acceso.token) : ''
  const vence = aDate(acceso?.expiraEn)

  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 30000); return () => clearInterval(t) }, [])

  useEffect(() => {
    let vivo = true
    if (!enlace) return undefined
    import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(enlace, { margin: 1, width: 560, errorCorrectionLevel: 'M' })).then((url) => vivo && setQr(url)).catch(() => {})
    return () => { vivo = false }
  }, [enlace])

  // Solo se muestran los dispositivos del QR actual (al renovar, los anteriores dejan de servir).
  const lista = useMemo(() => dispositivos.filter((d) => acceso && d.token === acceso.token && d.estado !== 'revocado').sort((a, b) => (a.estado === 'pendiente' ? -1 : 1) - (b.estado === 'pendiente' ? -1 : 1)), [dispositivos, acceso])

  async function escribir(fn, mensaje) {
    setOcupado(true)
    try { await fn(); if (mensaje) avisar(mensaje) } catch (e) { console.error(e); avisar('No se pudo completar la acción') } finally { setOcupado(false) }
  }

  const nuevoAcceso = () => ({
    ventaId, ministerio: venta.ministerio, token: generarToken(), activo: true,
    expiraEn: Timestamp.fromMillis(Date.now() + HORAS_ACCESO * 3600 * 1000), creadoPor: email, creadoEn: serverTimestamp(),
  })
  const activar = () => escribir(() => setDoc(doc(db, 'pos_accesos', ventaId), nuevoAcceso()), 'QR de acceso activado')
  const renovar = () => {
    if (!window.confirm('Se genera un QR nuevo y los dispositivos conectados tendrán que volver a pedir acceso. ¿Continuar?')) return
    escribir(() => setDoc(doc(db, 'pos_accesos', ventaId), nuevoAcceso()), 'QR renovado')
  }
  const apagar = () => escribir(() => updateDoc(doc(db, 'pos_accesos', ventaId), { activo: false }), 'Acceso por QR apagado')
  const extender = () => escribir(() => updateDoc(doc(db, 'pos_accesos', ventaId), { expiraEn: Timestamp.fromMillis(Date.now() + HORAS_ACCESO * 3600 * 1000) }), `Acceso extendido ${HORAS_ACCESO} horas`)
  const aprobar = (d) => escribir(() => updateDoc(doc(db, 'pos_dispositivos', d.id), { estado: 'aprobado', puedeEditar: !!editar[d.id], aprobadoPor: email, aprobadoEn: serverTimestamp() }), `${d.nombre} ya puede cobrar`)
  const permiso = (d) => escribir(() => updateDoc(doc(db, 'pos_dispositivos', d.id), { puedeEditar: !d.puedeEditar }))
  const quitar = (d) => escribir(() => updateDoc(doc(db, 'pos_dispositivos', d.id), { estado: 'revocado' }), `${d.nombre} fue desconectado`)

  async function copiar() {
    try { await navigator.clipboard.writeText(enlace); avisar('Enlace copiado') } catch { window.prompt('Copia este enlace:', enlace) }
  }
  const compartir = async () => {
    try { await navigator.share({ title: `Cobrar en ${venta.nombre}`, text: 'Entra con este enlace para cobrar:', url: enlace }) } catch { /* cancelado */ }
  }

  return (
    <div className="pos-modal-fondo" onClick={onCerrar}>
      <div className="pos-modal pos-modal-ancho" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Invitar a cobrar">
        <div className="pos-modal-cab">
          <div style={{ flex: 1 }}>
            <h3>Invitar a cobrar</h3>
            <p className="pos-sub" style={{ marginTop: 2 }}>Para que otra persona cobre desde su propio celular, sin cuenta ni prestar el tuyo.</p>
          </div>
          <button className="pos-icon-btn" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
        </div>

        {venta.estado === 'cerrada' && <div className="pos-aviso" style={{ margin: '14px 0' }}>La venta está cerrada. Reábrela para poder invitar a alguien.</div>}

        {!vigente ? (
          <section className="pos-seccion" style={{ marginTop: 14 }}>
            <h4 className="pos-seccion-titulo"><QrCode size={17} /> Acceso por QR</h4>
            <ul className="pos-lista-simple">
              <li><ShieldCheck size={15} /> Quien escanee queda <b>pendiente hasta que tú lo apruebes</b>.</li>
              <li><Smartphone size={15} /> Solo puede <b>vender, cobrar y ver los pedidos de esta venta</b>; no ve el corte, el historial ni otras ventas.</li>
              <li><Clock size={15} /> Se apaga solo al cerrar la venta, a las {HORAS_ACCESO} horas, o cuando tú lo apagues.</li>
            </ul>
            {acceso && !acceso.activo && <p className="pos-muted" style={{ margin: '0 0 12px' }}>El acceso anterior está apagado o venció.</p>}
            <button className="pos-btn pos-btn-primary pos-btn-lg pos-btn-block" disabled={ocupado || venta.estado === 'cerrada'} onClick={activar}><QrCode size={18} /> Generar QR de acceso</button>
          </section>
        ) : (
          <>
            <section className="pos-seccion pos-acceso-qr" style={{ marginTop: 14 }}>
              <div className="pos-qr">{qr ? <img src={qr} alt="Código QR para entrar a cobrar" /> : <span className="pos-muted">Generando…</span>}</div>
              <div className="pos-acceso-info">
                <span className="pos-badge pos-badge-ok"><span className="pos-vivo" /> Acceso activo</span>
                <p className="pos-sub" style={{ margin: '8px 0 12px' }}>Pídeles que abran la cámara y escaneen el código. Después aparecerán abajo para que los apruebes.</p>
                {vence && <p className="pos-muted" style={{ margin: '0 0 12px', fontSize: '.82rem' }}><Clock size={13} style={{ verticalAlign: '-2px' }} /> Vence hoy a las {vence.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>}
                <div className="pos-chips">
                  <button className="pos-chip" onClick={copiar}><Copy size={13} /> Copiar enlace</button>
                  {typeof navigator.share === 'function' && <button className="pos-chip" onClick={compartir}><Share2 size={13} /> Compartir</button>}
                  <button className="pos-chip" onClick={extender} disabled={ocupado}><Clock size={13} /> +{HORAS_ACCESO} h</button>
                  <button className="pos-chip" onClick={renovar} disabled={ocupado}><RefreshCw size={13} /> Renovar QR</button>
                </div>
              </div>
            </section>
            <button className="pos-btn pos-btn-danger pos-btn-block" disabled={ocupado} onClick={apagar}><Power size={16} /> Apagar acceso por QR</button>
          </>
        )}

        {vigente && (
          <section className="pos-seccion" style={{ marginTop: 14 }}>
            <h4 className="pos-seccion-titulo"><Smartphone size={17} /> Dispositivos {lista.length > 0 && <span className="pos-badge">{lista.length}</span>}</h4>
            {lista.length === 0 && <p className="pos-muted" style={{ margin: 0 }}>Todavía no se conecta nadie. Cuando alguien escanee, aparecerá aquí.</p>}
            <div className="pos-pila">
              {lista.map((d) => (
                <div key={d.id} className="pos-dispositivo" data-estado={d.estado}>
                  <Avatar nombre={d.nombre} size={38} />
                  <div className="pos-dispositivo-info">
                    <strong>{d.nombre}</strong>
                    <small>{d.estado === 'pendiente' ? 'Quiere conectarse' : d.puedeEditar ? 'Cobra y puede editar/anular' : 'Vende y cobra'}</small>
                  </div>
                  {d.estado === 'pendiente' ? (
                    <div className="pos-dispositivo-acciones">
                      <label className="pos-check-mini"><input type="checkbox" checked={!!editar[d.id]} onChange={(e) => setEditar((x) => ({ ...x, [d.id]: e.target.checked }))} /> Puede editar y anular</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="pos-btn pos-btn-primary pos-btn-sm" disabled={ocupado} onClick={() => aprobar(d)}><Check size={14} /> Aprobar</button>
                        <button className="pos-btn pos-btn-danger pos-btn-sm" disabled={ocupado} onClick={() => quitar(d)}>Rechazar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="pos-dispositivo-acciones">
                      <label className="pos-check-mini"><input type="checkbox" checked={!!d.puedeEditar} onChange={() => permiso(d)} /> Puede editar y anular</label>
                      <button className="pos-btn pos-btn-danger pos-btn-sm" disabled={ocupado} onClick={() => quitar(d)}><Trash2 size={14} /> Desconectar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

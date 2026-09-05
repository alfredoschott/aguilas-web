import { collection, addDoc, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export async function crearNotificacion({ ministerioId, eventoId, eventoTitulo, creadoPor }) {
  if (!ministerioId) return
  try {
    await addDoc(collection(db, 'notificaciones_portal'), {
      ministerioId,
      eventoId,
      eventoTitulo,
      texto: `Tu ministerio fue agregado al evento "${eventoTitulo}"`,
      creadoPor,
      leidoPor: [],
      createdAt: serverTimestamp(),
    })
  } catch (err) {
    console.warn('No se pudo crear la notificación:', err)
  }
}

export async function crearNotificacionInventario({
  ministerioId,
  itemId,
  itemNombre,
  cantidad,
  cantidadMinima,
  creadoPor,
}) {
  if (!ministerioId) return
  try {
    await addDoc(collection(db, 'notificaciones_portal'), {
      ministerioId,
      itemId,
      itemNombre,
      texto: `"${itemNombre}" está bajo en inventario (quedan ${cantidad}, mínimo ${cantidadMinima})`,
      creadoPor,
      leidoPor: [],
      createdAt: serverTimestamp(),
    })
  } catch (err) {
    console.warn('No se pudo crear la notificación de inventario:', err)
  }
}

export async function crearNotificacionVisita({ nombre, telefono, modo }) {
  const destinos = modo === 'radgen'
    ? ['administrativo', 'pastor', 'consolidacion', 'radgen']
    : ['administrativo', 'pastor', 'consolidacion']
  const texto = modo === 'radgen'
    ? `Nuevo joven en RadGen: ${nombre} · ${telefono}`
    : `Nueva visita al servicio: ${nombre} · ${telefono}`
  try {
    await Promise.all(destinos.map((destino) =>
      addDoc(collection(db, 'notificaciones_portal'), {
        ministerioId: destino,
        texto,
        tipo: 'visita',
        leidoPor: [],
        createdAt: serverTimestamp(),
      })
    ))
  } catch (err) {
    console.warn('No se pudo crear la notificación de visita:', err)
  }
}

export function escucharNotificaciones(ministerioId, callback) {
  if (!ministerioId) return () => {}
  const q = query(
    collection(db, 'notificaciones_portal'),
    where('ministerioId', '==', ministerioId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }, (err) => {
    console.warn('No se pudieron escuchar notificaciones:', err)
  })
}

export async function marcarComoLeida(notifId, email) {
  if (!email) return
  try {
    await updateDoc(doc(db, 'notificaciones_portal', notifId), {
      leidoPor: arrayUnion(email),
    })
  } catch (err) {
    console.warn('No se pudo marcar como leída:', err)
  }
}
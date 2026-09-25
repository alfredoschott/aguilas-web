import { randomBytes } from 'node:crypto'
import { adminAuth, adminDb } from './_lib/firebaseAdmin.js'

// Autorización de papá, mamá o tutor para que un joven menor de edad use
// RadGen Education. Todo pasa por aquí (con la cuenta de servicio) para no
// tener que abrir reglas de Firestore a personas sin sesión: el papá solo
// necesita el enlace con su token.
//
//   GET  ?token=…                       → (público) datos mínimos para la página del papá
//   POST { accion: 'crear', jovenUid? }  → el joven (o su líder) genera el enlace
//   POST { accion: 'aceptar', token, tutorNombre, parentesco, autorizaFotos } → (público) el papá autoriza
//   POST { accion: 'papel', jovenUid, tutorNombre, parentesco } → la líder registra un formato firmado en papel
//   POST { accion: 'mayor' }             → el joven declara que tiene 18 años o más

const COLECCION = 'radgenConsentimientos'
const PARENTESCOS = ['Mamá', 'Papá', 'Tutor legal']

async function uidDeLaPeticion(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  try {
    return (await adminAuth.verifyIdToken(token)).uid
  } catch {
    return null
  }
}

async function perfilDe(uid) {
  const snap = await adminDb.collection('radgenPerfiles').doc(uid).get()
  return snap.exists ? { uid, ...snap.data() } : null
}

function texto(valor, maximo = 80) {
  return typeof valor === 'string' ? valor.trim().slice(0, maximo) : ''
}

// El nombre con el que se registró (no el apodo): es como lo conoce su familia.
function nombreRegistrado(perfil) {
  return (perfil.nombre || '').trim() || 'tu hijo(a)'
}

async function crear(req, res) {
  const uid = await uidDeLaPeticion(req)
  if (!uid) return res.status(401).json({ error: 'Inicia sesión para continuar.' })
  const solicitante = await perfilDe(uid)
  if (!solicitante) return res.status(403).json({ error: 'No encontramos tu perfil.' })

  // Un joven solo puede pedir la suya; la líder puede generarla para cualquiera.
  const jovenUid = solicitante.rol === 'lider' && req.body?.jovenUid ? String(req.body.jovenUid) : uid
  const joven = jovenUid === uid ? solicitante : await perfilDe(jovenUid)
  if (!joven || joven.rol !== 'joven') return res.status(404).json({ error: 'Ese joven no existe.' })

  // Si ya había un enlace pendiente, se reutiliza (así el papá no recibe
  // dos distintos y el primero no queda "muerto").
  const pendientes = await adminDb
    .collection(COLECCION)
    .where('jovenUid', '==', jovenUid)
    .where('estado', '==', 'pendiente')
    .limit(1)
    .get()
  if (!pendientes.empty) return res.status(200).json({ token: pendientes.docs[0].id })

  const token = randomBytes(18).toString('base64url')
  await adminDb.collection(COLECCION).doc(token).set({
    jovenUid,
    jovenNombre: joven.nombre || '',
    estado: 'pendiente',
    creadoEn: new Date().toISOString(),
    creadoPor: uid,
  })
  await adminDb.collection('radgenPerfiles').doc(jovenUid).update({
    autorizacionTutor: { estado: 'pendiente', fecha: new Date().toISOString() },
  })
  return res.status(200).json({ token })
}

async function consultar(req, res) {
  const token = texto(req.query?.token, 64)
  if (!token) return res.status(400).json({ error: 'Falta el enlace.' })
  const snap = await adminDb.collection(COLECCION).doc(token).get()
  if (!snap.exists) return res.status(404).json({ error: 'Este enlace no es válido o ya no existe.' })
  const datos = snap.data()
  const joven = await perfilDe(datos.jovenUid)
  // Solo el nombre: quien tenga el enlace no debe poder ver más datos.
  return res.status(200).json({
    estado: datos.estado,
    jovenNombre: joven ? nombreRegistrado(joven) : 'tu hijo(a)',
    tutorNombre: datos.estado === 'aceptada' ? datos.tutorNombre : undefined,
  })
}

async function aceptar(req, res) {
  const token = texto(req.body?.token, 64)
  const tutorNombre = texto(req.body?.tutorNombre)
  const parentesco = PARENTESCOS.includes(req.body?.parentesco) ? req.body.parentesco : null
  if (!token || tutorNombre.length < 3 || !parentesco) {
    return res.status(400).json({ error: 'Escribe tu nombre completo y elige tu parentesco.' })
  }
  const ref = adminDb.collection(COLECCION).doc(token)
  const snap = await ref.get()
  if (!snap.exists) return res.status(404).json({ error: 'Este enlace no es válido o ya no existe.' })
  if (snap.data().estado !== 'pendiente') return res.status(409).json({ error: 'Esta autorización ya se había registrado.' })

  const ahora = new Date().toISOString()
  const autorizacion = {
    estado: 'aceptada',
    via: 'enlace',
    tutorNombre,
    parentesco,
    autorizaFotos: req.body?.autorizaFotos === true,
    fecha: ahora,
  }
  await ref.update({
    ...autorizacion,
    aceptadoEn: ahora,
    // Evidencia mínima de dónde se aceptó.
    ip: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
    navegador: texto(req.headers['user-agent'], 200) || null,
  })
  await adminDb.collection('radgenPerfiles').doc(snap.data().jovenUid).update({ autorizacionTutor: autorizacion })
  return res.status(200).json({ ok: true })
}

async function registrarPapel(req, res) {
  const uid = await uidDeLaPeticion(req)
  const lider = uid ? await perfilDe(uid) : null
  if (!lider || lider.rol !== 'lider') return res.status(403).json({ error: 'Solo la líder puede registrar esto.' })
  const jovenUid = texto(req.body?.jovenUid, 128)
  const tutorNombre = texto(req.body?.tutorNombre)
  const parentesco = PARENTESCOS.includes(req.body?.parentesco) ? req.body.parentesco : null
  if (!jovenUid || tutorNombre.length < 3 || !parentesco) {
    return res.status(400).json({ error: 'Escribe el nombre de quien firmó y su parentesco.' })
  }
  const joven = await perfilDe(jovenUid)
  if (!joven || joven.rol !== 'joven') return res.status(404).json({ error: 'Ese joven no existe.' })

  const ahora = new Date().toISOString()
  const autorizacion = {
    estado: 'aceptada',
    via: 'papel',
    tutorNombre,
    parentesco,
    autorizaFotos: req.body?.autorizaFotos === true,
    fecha: ahora,
    registradoPor: uid,
  }
  await adminDb.collection(COLECCION).add({ jovenUid, jovenNombre: joven.nombre || '', ...autorizacion, creadoEn: ahora })
  // Si había un enlace pendiente, ya no hace falta.
  const pendientes = await adminDb.collection(COLECCION).where('jovenUid', '==', jovenUid).where('estado', '==', 'pendiente').get()
  await Promise.all(pendientes.docs.map((d) => d.ref.update({ estado: 'reemplazada' })))
  await adminDb.collection('radgenPerfiles').doc(jovenUid).update({ autorizacionTutor: autorizacion })
  return res.status(200).json({ ok: true, autorizacion })
}

async function declararMayor(req, res) {
  const uid = await uidDeLaPeticion(req)
  const perfil = uid ? await perfilDe(uid) : null
  if (!perfil || perfil.rol !== 'joven') return res.status(403).json({ error: 'Inicia sesión para continuar.' })
  const autorizacion = { estado: 'no-requerida', via: 'mayor-de-edad', fecha: new Date().toISOString() }
  await adminDb.collection('radgenPerfiles').doc(uid).update({ autorizacionTutor: autorizacion })
  return res.status(200).json({ ok: true, autorizacion })
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return await consultar(req, res)
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })
    const accion = req.body?.accion
    if (accion === 'crear') return await crear(req, res)
    if (accion === 'aceptar') return await aceptar(req, res)
    if (accion === 'papel') return await registrarPapel(req, res)
    if (accion === 'mayor') return await declararMayor(req, res)
    return res.status(400).json({ error: 'Acción desconocida' })
  } catch (err) {
    console.error('Error en autorizacion-tutor:', err)
    return res.status(500).json({ error: 'Algo falló. Intenta de nuevo en un momento.' })
  }
}

// Estado de RadGen Education — Firestore real, mismo proyecto de Firebase
// que ya usa el sitio de la iglesia (ver ../firebase.js), en sus propias
// colecciones con prefijo `radgen` para no chocar con las del portal.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { db, auth, googleProvider } from '../firebase'
import insigniaLeccionImg from '../assets/insignias/insignia-leccion.png'
import insigniaLibretaImg from '../assets/insignias/insignia-libreta.png'
import insigniaServicioImg from '../assets/insignias/insignia-servicio.png'
import insigniaEspecialImg from '../assets/insignias/insignia-especial.png'

export const IMAGENES_INSIGNIA_MANUAL = {
  libreta: insigniaLibretaImg,
  servicio: insigniaServicioImg,
  especial: insigniaEspecialImg,
}

// Insignias de rango por cantidad total de cápsulas completadas (ajustable
// según crezca el currículo real).
const NIVELES = [
  { id: 'bronce', nombre: 'Bronce', minimo: 3, icono: '🥉' },
  { id: 'plata', nombre: 'Plata', minimo: 10, icono: '🥈' },
  { id: 'oro', nombre: 'Oro', minimo: 20, icono: '🥇' },
]

export const NIVELES_INSIGNIA = NIVELES

// Insignias que solo la líder puede otorgar a mano — no se desbloquean
// solas por completar cápsulas, son un reconocimiento que ella decide dar.
const INSIGNIAS_MANUALES = [
  { id: 'libreta', nombre: 'Libreta', imagen: insigniaLibretaImg },
  { id: 'servicio', nombre: 'Reunión de servicio', imagen: insigniaServicioImg },
  { id: 'especial', nombre: 'Especial', imagen: insigniaEspecialImg },
]

export const TIPOS_INSIGNIA_MANUAL = INSIGNIAS_MANUALES

// Cuánta experiencia da cada acción — la líder puede ajustar estos
// números desde su panel sin tocar código.
const XP_CONFIG_POR_DEFECTO = {
  porLeccionCompletada: 10,
  porQuizCorrecta: 2,
  porRachaSemana: 5,
  porInsigniaManual: 15,
  xpPorNivel: 50,
}

const CONFIG_ID = 'config'
const CONFIG_POR_DEFECTO = {
  modoPreRegistro: true,
  codigoInvitacion: 'RADGEN2026',
  mostrarElegibilidadAJovenes: false,
  mostrarRankingAJovenes: false,
  requisitos: { voluntariado: [], misiones: [] },
}

async function getConfig() {
  const ref = doc(db, 'radgenEduConfig', CONFIG_ID)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    return { ...CONFIG_POR_DEFECTO }
  }
  return { ...CONFIG_POR_DEFECTO, ...snap.data() }
}

// ===== Sesión =====

// Se suscribe al estado de sesión real de Firebase Auth. `callback` recibe
// el perfil de RadGen Education del usuario (o null si no ha iniciado
// sesión, o si inició sesión con Google pero todavía no tiene perfil aquí
// — por ejemplo, a medio registro). Devuelve la función para desuscribirse.
export function observarSesion(callback) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      callback(null)
      return
    }
    try {
      const snap = await getDoc(doc(db, 'radgenPerfiles', fbUser.uid))
      callback(snap.exists() ? { uid: snap.id, ...snap.data() } : null)
    } catch {
      callback(null)
    }
  })
}

// Un solo botón de Google para joven y líder — `rolElegido` es la pestaña
// que la persona escogió antes de tocar el botón.
export async function iniciarSesionConGoogle(rolElegido) {
  const credencial = await signInWithPopup(auth, googleProvider)
  const fbUser = credencial.user
  const email = (fbUser.email || '').toLowerCase()

  const perfilRef = doc(db, 'radgenPerfiles', fbUser.uid)
  const perfilSnap = await getDoc(perfilRef)
  if (perfilSnap.exists()) {
    return { ok: true, usuario: { uid: perfilSnap.id, ...perfilSnap.data() } }
  }

  if (rolElegido === 'lider') {
    // Debe ya existir como líder de RadGen en el portal de líderes de la
    // iglesia (colección `usuarios`, compartida con ese sitio).
    const usuarioPortalSnap = await getDoc(doc(db, 'usuarios', email))
    const datosPortal = usuarioPortalSnap.data()
    const esLiderRadgen =
      usuarioPortalSnap.exists() &&
      datosPortal?.rol === 'lider' &&
      (datosPortal?.ministerio || '').toLowerCase().includes('radgen')

    if (!esLiderRadgen) {
      await signOut(auth)
      return { ok: false, error: 'Tu cuenta no está registrada como líder de RadGen. Pide acceso a Primera Mesa.' }
    }

    const nuevoPerfil = {
      nombre: fbUser.displayName || datosPortal?.nombre || 'Líder',
      email,
      rol: 'lider',
      fotoPerfil: null,
      creadoEn: new Date().toISOString(),
    }
    await setDoc(perfilRef, nuevoPerfil)
    return { ok: true, usuario: { uid: fbUser.uid, ...nuevoPerfil } }
  }

  // Joven nuevo: todavía le falta el código de invitación.
  return {
    ok: false,
    requiereCodigo: true,
    perfilGoogle: { uid: fbUser.uid, nombre: fbUser.displayName || 'Joven', email },
  }
}

export async function completarRegistroJoven({ uid, nombre, email, codigo }) {
  const config = await getConfig()
  if (codigo.trim().toUpperCase() !== config.codigoInvitacion.toUpperCase()) {
    return { ok: false, error: 'Código de invitación incorrecto.' }
  }
  const nuevoPerfil = {
    nombre,
    email,
    rol: 'joven',
    fotoPerfil: null,
    creadoEn: new Date().toISOString(),
  }
  await setDoc(doc(db, 'radgenPerfiles', uid), nuevoPerfil)
  return { ok: true, usuario: { uid, ...nuevoPerfil } }
}

export async function cerrarSesion() {
  await signOut(auth)
}

// ===== Configuración global (líder) =====

export async function getModoPreRegistro() {
  const config = await getConfig()
  return config.modoPreRegistro
}

// Tiempo real: si la líder prende/apaga el currículo, cualquier joven con
// la app abierta lo nota al instante, sin recargar. Devuelve la función
// para desuscribirse.
export function observarModoPreRegistro(callback) {
  return onSnapshot(doc(db, 'radgenEduConfig', CONFIG_ID), (snap) => {
    callback(snap.exists() ? snap.data().modoPreRegistro !== false : true)
  })
}

export async function setModoPreRegistro(valor) {
  await setDoc(doc(db, 'radgenEduConfig', CONFIG_ID), { modoPreRegistro: valor }, { merge: true })
  return valor
}

export async function getMostrarElegibilidadAJovenes() {
  const config = await getConfig()
  return config.mostrarElegibilidadAJovenes
}

export async function setMostrarElegibilidadAJovenes(valor) {
  await setDoc(doc(db, 'radgenEduConfig', CONFIG_ID), { mostrarElegibilidadAJovenes: valor }, { merge: true })
  return valor
}

export async function getMostrarRankingAJovenes() {
  const config = await getConfig()
  return config.mostrarRankingAJovenes
}

export async function setMostrarRankingAJovenes(valor) {
  await setDoc(doc(db, 'radgenEduConfig', CONFIG_ID), { mostrarRankingAJovenes: valor }, { merge: true })
  return valor
}

// El doc solo guarda lo que la líder haya cambiado — se completa siempre
// contra los valores por defecto para que un campo nunca llegue undefined.
export async function getXpConfig() {
  const config = await getConfig()
  return { ...XP_CONFIG_POR_DEFECTO, ...(config.xp || {}) }
}

export async function setXpConfig(nuevoConfig) {
  const actual = await getXpConfig()
  const combinado = { ...actual, ...nuevoConfig }
  await setDoc(doc(db, 'radgenEduConfig', CONFIG_ID), { xp: combinado }, { merge: true })
  return combinado
}

export async function getRequisitos() {
  const config = await getConfig()
  return config.requisitos
}

export async function toggleRequisito({ track, leccionId }) {
  const config = await getConfig()
  const lista = config.requisitos[track] || []
  const nuevaLista = lista.includes(leccionId)
    ? lista.filter((id) => id !== leccionId)
    : [...lista, leccionId]
  const nuevosRequisitos = { ...config.requisitos, [track]: nuevaLista }
  await setDoc(doc(db, 'radgenEduConfig', CONFIG_ID), { requisitos: nuevosRequisitos }, { merge: true })
  return nuevosRequisitos
}

// ===== Perfiles =====

// Nombre y foto que el propio usuario personaliza — no toca correo, rol ni
// nada relacionado con el currículo.
export async function actualizarPerfil({ uid, nombre, fotoPerfil }) {
  const cambios = {}
  if (nombre?.trim()) cambios.nombre = nombre.trim()
  if (fotoPerfil !== undefined) cambios.fotoPerfil = fotoPerfil
  await updateDoc(doc(db, 'radgenPerfiles', uid), cambios)
  const snap = await getDoc(doc(db, 'radgenPerfiles', uid))
  return { uid, ...snap.data() }
}

export async function getJovenPorUid(uid) {
  const snap = await getDoc(doc(db, 'radgenPerfiles', uid))
  return snap.exists() ? { uid: snap.id, ...snap.data() } : null
}

export async function getJovenes() {
  const snap = await getDocs(query(collection(db, 'radgenPerfiles'), where('rol', '==', 'joven')))
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
}

// ===== Lecciones =====

export function slugificar(texto) {
  return (texto || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function getLecciones() {
  const snap = await getDocs(collection(db, 'radgenLecciones'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.orden - b.orden)
}

// Solo las lecciones vigentes — para elegir qué asignar o exigir como
// requisito. Las archivadas siguen contando para insignias de quien ya las
// completó, pero no se ofrecen para asignaciones nuevas.
export async function getLeccionesActivas() {
  const todas = await getLecciones()
  return todas.filter((l) => l.estado !== 'archivada')
}

export async function getLeccionPorId(leccionId) {
  const snap = await getDoc(doc(db, 'radgenLecciones', leccionId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Crea una lección nueva desde el panel de líder — sin tocar código. Si
// `serieId` coincide con una serie existente, se agrega a ella; si no,
// `serieTitulo` define una serie nueva.
export async function crearLeccion({ titulo, serieId, serieTitulo, icono, youtubeId, versiculo, notas, puntos, imagen, quiz, reto }) {
  const todas = await getLecciones()
  const ordenMax = todas.reduce((max, l) => Math.max(max, l.orden || 0), 0)
  const nueva = {
    titulo,
    youtubeId: youtubeId || null,
    orden: ordenMax + 1,
    serieId: serieId || slugificar(serieTitulo),
    serieTitulo: serieTitulo || 'Sin serie',
    icono: icono || '📖',
    estado: 'activa',
    versiculo: versiculo?.texto || versiculo?.referencia ? versiculo : null,
    notas: notas || '',
    puntos: (puntos || []).filter((p) => p.trim()),
    imagen: imagen || null,
    quiz: (quiz || []).filter((p) => p.pregunta.trim()),
    reto: reto?.trim() || null,
  }
  const ref = await addDoc(collection(db, 'radgenLecciones'), nueva)
  return { id: ref.id, ...nueva }
}

export async function actualizarLeccion(leccionId, cambios) {
  const actual = await getLeccionPorId(leccionId)
  const limpio = { ...cambios }
  if (cambios.puntos) limpio.puntos = cambios.puntos.filter((p) => p.trim())
  if (cambios.quiz) limpio.quiz = cambios.quiz.filter((p) => p.pregunta.trim())
  // Firestore rechaza `undefined` en updateDoc — cualquier campo que el
  // llamador no haya resuelto simplemente se deja sin tocar.
  Object.keys(limpio).forEach((clave) => {
    if (limpio[clave] === undefined) delete limpio[clave]
  })
  await updateDoc(doc(db, 'radgenLecciones', leccionId), limpio)
  return { ...actual, ...limpio }
}

export async function alternarArchivoLeccion(leccionId) {
  const leccion = await getLeccionPorId(leccionId)
  if (leccion) {
    const nuevoEstado = leccion.estado === 'archivada' ? 'activa' : 'archivada'
    await updateDoc(doc(db, 'radgenLecciones', leccionId), { estado: nuevoEstado })
  }
  return getLecciones()
}

// Reordena una lección dentro de su propia serie (direccion: -1 sube, +1 baja).
export async function moverLeccion(leccionId, direccion) {
  const todas = await getLecciones()
  const leccion = todas.find((l) => l.id === leccionId)
  if (!leccion) return todas

  const delaSerie = todas.filter((l) => l.serieId === leccion.serieId).sort((a, b) => a.orden - b.orden)
  const indice = delaSerie.findIndex((l) => l.id === leccionId)
  const vecino = delaSerie[indice + direccion]
  if (!vecino) return todas

  await Promise.all([
    updateDoc(doc(db, 'radgenLecciones', leccion.id), { orden: vecino.orden }),
    updateDoc(doc(db, 'radgenLecciones', vecino.id), { orden: leccion.orden }),
  ])
  return getLecciones()
}

export async function getSeries() {
  const lecciones = await getLecciones()
  return getSeriesUnicas(lecciones)
}

function getSeriesUnicas(lecciones) {
  const vistas = new Map()
  lecciones.forEach((l) => {
    if (!vistas.has(l.serieId)) vistas.set(l.serieId, { serieId: l.serieId, serieTitulo: l.serieTitulo })
  })
  return [...vistas.values()]
}

// ===== Asignaciones =====

export async function getAsignacionesDe(uid) {
  const [snap, lecciones] = await Promise.all([
    getDocs(query(collection(db, 'radgenAsignaciones'), where('asignadoA', '==', uid))),
    getLecciones(),
  ])
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .map((a) => ({ ...a, leccion: lecciones.find((l) => l.id === a.leccionId) }))
    .sort((a, b) => (a.leccion?.orden ?? 0) - (b.leccion?.orden ?? 0))
}

export async function asignarLeccion({ leccionId, jovenUids, liderUid }) {
  const ahora = new Date().toISOString()
  for (const jovenUid of jovenUids) {
    const existentes = await getDocs(
      query(
        collection(db, 'radgenAsignaciones'),
        where('leccionId', '==', leccionId),
        where('asignadoA', '==', jovenUid),
      ),
    )
    if (!existentes.empty) continue
    await addDoc(collection(db, 'radgenAsignaciones'), {
      leccionId,
      asignadoA: jovenUid,
      asignadoPor: liderUid,
      estado: 'pendiente',
      fechaAsignada: ahora,
      fechaCompletado: null,
      quizScore: null,
      retoCumplido: false,
    })
  }
}

// Al completar una cápsula, asigna sola la siguiente de la misma serie (si
// existe y sigue activa) — así el joven avanza como en un curso, sin que
// la líder tenga que asignar cada lección a mano.
async function asignarSiguienteLeccion({ leccionId, asignadoA }) {
  const todas = await getLecciones()
  const actual = todas.find((l) => l.id === leccionId)
  if (!actual) return

  const deSerie = todas.filter((l) => l.serieId === actual.serieId).sort((a, b) => a.orden - b.orden)
  const indice = deSerie.findIndex((l) => l.id === leccionId)
  const siguiente = deSerie.slice(indice + 1).find((l) => l.estado !== 'archivada')
  if (!siguiente) return

  await asignarLeccion({ leccionId: siguiente.id, jovenUids: [asignadoA], liderUid: 'auto' })
}

export async function marcarCompletado(asignacionId, quizScore = null) {
  const asignacionRef = doc(db, 'radgenAsignaciones', asignacionId)
  const snap = await getDoc(asignacionRef)
  const asignacion = snap.exists() ? snap.data() : null

  await updateDoc(asignacionRef, {
    estado: 'completado',
    fechaCompletado: new Date().toISOString(),
    quizScore, // { correctas, total } o null si la lección no tiene quiz
  })

  if (asignacion) {
    await asignarSiguienteLeccion(asignacion)
  }
}

export async function marcarRetoCumplido(asignacionId, valor) {
  await updateDoc(doc(db, 'radgenAsignaciones', asignacionId), { retoCumplido: valor })
}

// Corrige una lección marcada como completada por error, sin borrar la
// asignación — el joven la vuelve a ver como pendiente y puede rehacerla.
export async function revertirCompletado(asignacionId) {
  await updateDoc(doc(db, 'radgenAsignaciones', asignacionId), {
    estado: 'pendiente',
    fechaCompletado: null,
    quizScore: null,
  })
}

// Quita una asignación por completo (lección asignada a la persona o el
// momento equivocado). Distinto de revertirCompletado: esta desaparece.
export async function eliminarAsignacion(asignacionId) {
  await deleteDoc(doc(db, 'radgenAsignaciones', asignacionId))
}

export async function getTablaEstado() {
  const [snap, lecciones, jovenes] = await Promise.all([
    getDocs(collection(db, 'radgenAsignaciones')),
    getLecciones(),
    getJovenes(),
  ])
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .map((a) => ({
      ...a,
      joven: jovenes.find((j) => j.uid === a.asignadoA),
      leccion: lecciones.find((l) => l.id === a.leccionId),
    }))
    .sort((a, b) => (a.joven?.nombre || '').localeCompare(b.joven?.nombre || ''))
}

// Últimas cápsulas completadas por cualquier joven, de más reciente a más
// antigua — el "pulso" del panel de líder, para que se sienta vivo cada
// vez que lo abre en vez de ser solo tablas estáticas.
export async function getActividadReciente(limite = 8) {
  const tabla = await getTablaEstado()
  return tabla
    .filter((f) => f.estado === 'completado' && f.fechaCompletado)
    .sort((a, b) => new Date(b.fechaCompletado) - new Date(a.fechaCompletado))
    .slice(0, limite)
}

// ===== Insignias, racha y ranking =====

// Calcula todas las insignias (por cápsula, por serie, por rango) y la
// elegibilidad de voluntariado/misiones de un joven específico.
export async function getInsigniasDe(uid) {
  const [lecciones, asignaciones, requisitos] = await Promise.all([
    getLecciones(),
    getAsignacionesDe(uid),
    getRequisitos(),
  ])
  const completadasIds = new Set(
    asignaciones.filter((a) => a.estado === 'completado').map((a) => a.leccionId),
  )
  const totalCompletadas = completadasIds.size

  const porLeccion = lecciones.map((l) => ({
    id: `leccion-${l.id}`,
    nombre: l.titulo,
    icono: l.icono,
    imagen: insigniaLeccionImg,
    desbloqueada: completadasIds.has(l.id),
  }))

  const series = getSeriesUnicas(lecciones)
  const porSerie = series.map((s) => {
    const leccionesDeSerie = lecciones.filter((l) => l.serieId === s.serieId)
    const desbloqueada = leccionesDeSerie.every((l) => completadasIds.has(l.id))
    return {
      id: `serie-${s.serieId}`,
      nombre: s.serieTitulo,
      icono: '🏆',
      desbloqueada,
      progreso: `${leccionesDeSerie.filter((l) => completadasIds.has(l.id)).length}/${leccionesDeSerie.length}`,
    }
  })

  const nivelActual = [...NIVELES].reverse().find((n) => totalCompletadas >= n.minimo) || null
  const siguienteNivel = NIVELES.find((n) => totalCompletadas < n.minimo) || null

  function evaluarElegibilidad(track) {
    const requeridas = requisitos[track] || []
    const faltantes = requeridas.filter((id) => !completadasIds.has(id))
    return {
      apto: faltantes.length === 0,
      faltantes: faltantes.map((id) => lecciones.find((l) => l.id === id)?.titulo || id),
    }
  }

  return {
    totalCompletadas,
    porLeccion,
    porSerie,
    nivelActual,
    siguienteNivel,
    progresoNivel: siguienteNivel
      ? { actual: totalCompletadas, meta: siguienteNivel.minimo }
      : null,
    elegibilidad: {
      voluntariado: evaluarElegibilidad('voluntariado'),
      misiones: evaluarElegibilidad('misiones'),
    },
  }
}

function getInicioSemana(fecha) {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay()) // retrocede al domingo de esa semana
  return d.getTime()
}

// Semanas consecutivas (hasta la semana actual) con al menos una cápsula
// completada — como una racha de Duolingo, pero de constancia espiritual.
export async function getRachaSemanas(uid) {
  const todas = await getAsignacionesDe(uid)
  const asignaciones = todas.filter((a) => a.estado === 'completado' && a.fechaCompletado)
  if (asignaciones.length === 0) return 0

  const semanas = new Set(asignaciones.map((a) => getInicioSemana(a.fechaCompletado)))
  const unaSemanaMs = 7 * 24 * 60 * 60 * 1000
  let cursor = getInicioSemana(new Date())
  let racha = 0

  while (semanas.has(cursor)) {
    racha += 1
    cursor -= unaSemanaMs
  }
  return racha
}

// Últimas `cantidadSemanas`, de la más antigua a la más reciente, con si
// hubo o no una cápsula completada en cada una — para pintar un calendario
// de racha estilo Duolingo.
export async function getHistorialSemanas(uid, cantidadSemanas = 8) {
  const todas = await getAsignacionesDe(uid)
  const completadas = todas.filter((a) => a.estado === 'completado' && a.fechaCompletado)
  const semanasConActividad = new Set(completadas.map((a) => getInicioSemana(a.fechaCompletado)))

  const unaSemanaMs = 7 * 24 * 60 * 60 * 1000
  const inicioSemanaActual = getInicioSemana(new Date())

  const historial = []
  for (let i = cantidadSemanas - 1; i >= 0; i -= 1) {
    const inicio = inicioSemanaActual - i * unaSemanaMs
    historial.push({
      inicio,
      activa: semanasConActividad.has(inicio),
      esSemanaActual: inicio === inicioSemanaActual,
    })
  }
  return historial
}

export async function getRankingCampamento() {
  const jovenes = await getJovenes()
  const filas = await Promise.all(
    jovenes.map(async (j) => {
      const [insignias, racha] = await Promise.all([getInsigniasDe(j.uid), getRachaSemanas(j.uid)])
      return {
        joven: j,
        totalCompletadas: insignias.totalCompletadas,
        nivelActual: insignias.nivelActual,
        racha,
        insigniasTotal:
          insignias.porLeccion.filter((b) => b.desbloqueada).length +
          insignias.porSerie.filter((b) => b.desbloqueada).length +
          (insignias.nivelActual ? 1 : 0),
      }
    }),
  )
  return filas.sort((a, b) => b.totalCompletadas - a.totalCompletadas)
}

// ===== Insignias otorgadas a mano por la líder =====

export async function getInsigniasManualesDe(uid) {
  // Defensivo: si las reglas de Firestore todavía no cubren esta colección
  // (se agregó después que el resto), que no tumbe pantallas enteras — se
  // ve simplemente como "sin insignias especiales todavía".
  let otorgadas = []
  try {
    const snap = await getDocs(query(collection(db, 'radgenInsigniasManuales'), where('jovenUid', '==', uid)))
    otorgadas = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  } catch {
    otorgadas = []
  }

  return INSIGNIAS_MANUALES.map((tipo) => {
    const deEsteTipo = otorgadas.filter((o) => o.tipo === tipo.id)
    return {
      ...tipo,
      desbloqueada: deEsteTipo.length > 0,
      veces: deEsteTipo.length,
      ultimaFecha: deEsteTipo[0]?.fecha || null,
      registros: deEsteTipo,
    }
  })
}

export async function otorgarInsigniaManual({ jovenUid, tipo, liderUid }) {
  await addDoc(collection(db, 'radgenInsigniasManuales'), {
    jovenUid,
    tipo,
    otorgadaPor: liderUid,
    fecha: new Date().toISOString(),
  })
  return getInsigniasManualesDe(jovenUid)
}

export async function quitarInsigniaManual({ jovenUid, registroId }) {
  await deleteDoc(doc(db, 'radgenInsigniasManuales', registroId))
  return getInsigniasManualesDe(jovenUid)
}

// ===== Experiencia y niveles =====

// Todo se calcula al vuelo a partir del historial real — igual que
// insignias, racha y ranking — para que cambiar los valores de XP desde
// el panel de líder recalcule a todos de inmediato, sin tener que migrar
// contadores guardados.
export async function getExperienciaDe(uid) {
  const xpCfg = await getXpConfig()
  const [asignaciones, racha, manuales] = await Promise.all([
    getAsignacionesDe(uid),
    getRachaSemanas(uid),
    getInsigniasManualesDe(uid),
  ])

  const completadas = asignaciones.filter((a) => a.estado === 'completado')
  const quizCorrectas = completadas.reduce((suma, a) => suma + (a.quizScore?.correctas || 0), 0)
  const insigniasManualesTotal = manuales.reduce((suma, m) => suma + m.veces, 0)

  const xpTotal =
    completadas.length * xpCfg.porLeccionCompletada +
    quizCorrectas * xpCfg.porQuizCorrecta +
    racha * xpCfg.porRachaSemana +
    insigniasManualesTotal * xpCfg.porInsigniaManual

  const xpPorNivel = Math.max(1, xpCfg.xpPorNivel)
  const nivel = Math.floor(xpTotal / xpPorNivel) + 1
  const xpEnNivelActual = xpTotal % xpPorNivel

  return { xpTotal, nivel, xpEnNivelActual, xpPorNivel }
}

export async function getExperienciaRanking() {
  const jovenes = await getJovenes()
  const filas = await Promise.all(
    jovenes.map(async (j) => ({ joven: j, experiencia: await getExperienciaDe(j.uid) })),
  )
  return filas.sort((a, b) => b.experiencia.xpTotal - a.experiencia.xpTotal)
}

// ===== Notas del líder =====

export async function getNotasDe(jovenUid) {
  const snap = await getDocs(query(collection(db, 'radgenNotasLider'), where('jovenUid', '==', jovenUid)))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
}

export async function agregarNota({ jovenUid, texto, liderUid }) {
  await addDoc(collection(db, 'radgenNotasLider'), {
    jovenUid,
    texto,
    autorUid: liderUid,
    fecha: new Date().toISOString(),
  })
  return getNotasDe(jovenUid)
}

export async function eliminarNota({ jovenUid, notaId }) {
  await deleteDoc(doc(db, 'radgenNotasLider', notaId))
  return getNotasDe(jovenUid)
}

// ===== Preguntas/comentarios de lección =====

// Lo que un joven deja al terminar una lección — la líder las ve todas
// juntas y puede responder desde su panel.
export async function getComentariosDe(asignacionId) {
  const snap = await getDocs(query(collection(db, 'radgenComentarios'), where('asignacionId', '==', asignacionId)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
}

export async function agregarComentario({ asignacionId, jovenUid, texto }) {
  await addDoc(collection(db, 'radgenComentarios'), {
    asignacionId,
    texto,
    autorUid: jovenUid,
    fecha: new Date().toISOString(),
    respuesta: null,
    respuestaFecha: null,
  })
  return getComentariosDe(asignacionId)
}

export async function responderComentario({ asignacionId, comentarioId, respuesta }) {
  await updateDoc(doc(db, 'radgenComentarios', comentarioId), {
    respuesta,
    respuestaFecha: new Date().toISOString(),
  })
  return getComentariosDe(asignacionId)
}

export async function getComentariosPendientes() {
  const snap = await getDocs(collection(db, 'radgenComentarios'))
  const sinResponder = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => !c.respuesta)

  const [asignaciones, lecciones, jovenes] = await Promise.all([
    getDocs(collection(db, 'radgenAsignaciones')),
    getLecciones(),
    getJovenes(),
  ])
  const listaAsignaciones = asignaciones.docs.map((d) => ({ id: d.id, ...d.data() }))

  const pendientes = sinResponder.map((c) => {
    const asignacion = listaAsignaciones.find((a) => a.id === c.asignacionId)
    const leccion = lecciones.find((l) => l.id === asignacion?.leccionId)
    const joven = jovenes.find((j) => j.uid === c.autorUid)
    return { asignacionId: c.asignacionId, comentario: c, leccion, joven }
  })
  return pendientes.sort((a, b) => new Date(b.comentario.fecha) - new Date(a.comentario.fecha))
}

// ===== Tareas personales (1:1) =====

// Lo que la líder deja a un joven en particular después de una plática,
// sin que forme parte del currículo compartido (no suma a insignias ni
// elegibilidad, es puro seguimiento personal).
export async function getTareasDe(jovenUid) {
  const snap = await getDocs(query(collection(db, 'radgenTareasPersonales'), where('jovenUid', '==', jovenUid)))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date(b.fechaCreada) - new Date(a.fechaCreada))
}

export async function asignarTareaPersonal({ jovenUid, titulo, descripcion, liderUid }) {
  await addDoc(collection(db, 'radgenTareasPersonales'), {
    jovenUid,
    titulo,
    descripcion: descripcion || '',
    asignadaPor: liderUid,
    fechaCreada: new Date().toISOString(),
    estado: 'pendiente',
    fechaCompletada: null,
  })
  return getTareasDe(jovenUid)
}

export async function alternarTareaPersonal({ jovenUid, tareaId }) {
  const tareas = await getTareasDe(jovenUid)
  const tarea = tareas.find((t) => t.id === tareaId)
  if (tarea) {
    const nuevoEstado = tarea.estado === 'completado' ? 'pendiente' : 'completado'
    await updateDoc(doc(db, 'radgenTareasPersonales', tareaId), {
      estado: nuevoEstado,
      fechaCompletada: nuevoEstado === 'completado' ? new Date().toISOString() : null,
    })
  }
  return getTareasDe(jovenUid)
}

export async function eliminarTareaPersonal({ jovenUid, tareaId }) {
  await deleteDoc(doc(db, 'radgenTareasPersonales', tareaId))
  return getTareasDe(jovenUid)
}

export async function getTareasPendientesTotal(jovenUid) {
  const tareas = await getTareasDe(jovenUid)
  return tareas.filter((t) => t.estado !== 'completado').length
}

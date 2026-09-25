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
  writeBatch,
} from 'firebase/firestore'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { db, auth, googleProvider } from '../firebase'
import insigniaLeccionImg from '../assets/insignias/insignia-leccion.webp'
import insigniaLibretaImg from '../assets/insignias/insignia-libreta.webp'
import insigniaServicioImg from '../assets/insignias/insignia-servicio.webp'
import insigniaEspecialImg from '../assets/insignias/insignia-especial.webp'

export const IMAGENES_INSIGNIA_MANUAL = {
  libreta: insigniaLibretaImg,
  servicio: insigniaServicioImg,
  especial: insigniaEspecialImg,
}

// La insignia destacada se guarda en el perfil como una "foto" (id, nombre,
// ícono…). La imagen se resuelve aquí por su id y no por la URL guardada,
// porque esas URLs cambian cada vez que se actualiza el archivo de la
// imagen — así una insignia destacada nunca se ve rota.
export function imagenDeInsignia(snapshot) {
  const id = snapshot?.id || ''
  if (id.startsWith('leccion-')) return insigniaLeccionImg
  if (id.startsWith('especial')) return insigniaEspecialImg
  return IMAGENES_INSIGNIA_MANUAL[id] || null
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
  porAsistencia: 3,
  porVersiculoMemorizado: 3,
  porDueloGanado: 3,
  xpPorNivel: 50,
}

// La cápsula N de una serie "toca" en la semana N desde que ese joven
// empezó la serie. Hacerla tarde sigue sumando, pero menos — así no da lo
// mismo ir al día que ponerse al corriente todo de golpe al final.
export const VALOR_POR_SEMANAS_TARDE = [1, 0.75, 0.5, 0.25]
const DIA_MS = 24 * 60 * 60 * 1000
const SEMANA_MS = 7 * DIA_MS

// Máximo de duelos ganados que dan XP por semana — evita que dos amigos
// se reten 50 veces seguidas solo para inflar puntos.
const DUELOS_CON_XP_POR_SEMANA = 3

// Marcos de avatar que se desbloquean con el nivel de experiencia.
export const MARCOS_AVATAR = [
  { id: 'fuego', nombre: 'Fuego', nivel: 2 },
  { id: 'neon', nombre: 'Neón', nivel: 3 },
  { id: 'oceano', nombre: 'Océano', nivel: 4 },
  { id: 'arcoiris', nombre: 'Arcoíris', nivel: 6 },
  { id: 'diamante', nombre: 'Diamante', nivel: 8 },
]

const CONFIG_ID = 'config'
const CONFIG_POR_DEFECTO = {
  appPausada: false,
  codigoInvitacion: 'RADGEN2026',
  mostrarElegibilidadAJovenes: false,
  mostrarRankingAJovenes: false,
  requisitos: { voluntariado: [], misiones: [] },
  pausasCalendario: [],
  equipos: [],
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

// Interruptor general: mientras esté pausada, ningún joven ve currículo
// (lecciones, insignias, ranking) — solo puede entrar a su perfil. Sirve
// tanto para el lanzamiento inicial como para pausar todo de golpe si la
// líder necesita hacer ajustes sin que nadie vea algo a medias.
//
// Tiempo real: si la líder pausa/reactiva, cualquier joven con la app
// abierta lo nota al instante, sin recargar. Devuelve la función para
// desuscribirse.
export function observarAppPausada(callback) {
  return onSnapshot(doc(db, 'radgenEduConfig', CONFIG_ID), (snap) => {
    callback(snap.exists() ? snap.data().appPausada === true : false)
  })
}

export async function setAppPausada(valor) {
  await setDoc(doc(db, 'radgenEduConfig', CONFIG_ID), { appPausada: valor }, { merge: true })
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

// ===== Calendario (pausas) =====

// Cada pausa es { desde, hasta } (hasta = null mientras siga pausado). El
// tiempo en pausa no cuenta para que una cápsula pierda valor.
export async function getPausasCalendario() {
  const config = await getConfig()
  return config.pausasCalendario || []
}

export function calendarioEnPausa(pausas) {
  return pausas.some((p) => !p.hasta)
}

export async function alternarPausaCalendario() {
  const pausas = await getPausasCalendario()
  const ahora = new Date().toISOString()
  const nuevas = calendarioEnPausa(pausas)
    ? pausas.map((p) => (p.hasta ? p : { ...p, hasta: ahora }))
    : [...pausas, { desde: ahora, hasta: null }]
  await setDoc(doc(db, 'radgenEduConfig', CONFIG_ID), { pausasCalendario: nuevas }, { merge: true })
  return nuevas
}

// ===== Equipos =====

export async function getEquipos() {
  const config = await getConfig()
  return config.equipos || []
}

export async function guardarEquipos(equipos) {
  await setDoc(doc(db, 'radgenEduConfig', CONFIG_ID), { equipos }, { merge: true })
  return equipos
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

// Nombre, foto y personalización que el propio usuario controla — no toca
// correo, rol ni nada relacionado con el currículo. Los campos de
// personalización son opcionales por diseño: un perfil que nunca los tocó
// simplemente no los tiene, y toda la UI que los lee ya asume que pueden
// venir undefined/null.
export async function actualizarPerfil({
  uid,
  nombre,
  fotoPerfil,
  bio,
  apodo,
  colorAcento,
  skyElegido,
  fondoPerfil,
  insigniaDestacada,
  marcoAvatar,
}) {
  const cambios = {}
  if (nombre?.trim()) cambios.nombre = nombre.trim()
  if (fotoPerfil !== undefined) cambios.fotoPerfil = fotoPerfil
  if (bio !== undefined) cambios.bio = bio.trim().slice(0, 140)
  if (apodo !== undefined) cambios.apodo = apodo.trim().slice(0, 40)
  if (colorAcento !== undefined) cambios.colorAcento = colorAcento
  if (skyElegido !== undefined) cambios.skyElegido = skyElegido
  if (fondoPerfil !== undefined) cambios.fondoPerfil = fondoPerfil
  if (insigniaDestacada !== undefined) cambios.insigniaDestacada = insigniaDestacada
  if (marcoAvatar !== undefined) cambios.marcoAvatar = marcoAvatar
  await updateDoc(doc(db, 'radgenPerfiles', uid), cambios)
  const snap = await getDoc(doc(db, 'radgenPerfiles', uid))
  return { uid, ...snap.data() }
}

export async function getJovenPorUid(uid) {
  const snap = await getDoc(doc(db, 'radgenPerfiles', uid))
  return snap.exists() ? { uid: snap.id, ...snap.data() } : null
}

// Vista pública que un joven ve del perfil de OTRO joven — solo lo que ya es
// visible en el ranking (rango, racha) más la personalización cosmética.
// Deliberadamente no incluye nada del lado del líder (notas, tareas 1:1,
// elegibilidad): eso vive solo en PerfilJovenScreen, que es líder-only.
export async function getPerfilPublico(uid) {
  const joven = await getJovenPorUid(uid)
  if (!joven) return null

  // Defensivo: si las reglas de Firestore para ver asignaciones/perfiles de
  // otros todavía no están al día, que se vea el perfil sin rango/racha en
  // vez de tronar toda la pantalla.
  try {
    const [insignias, racha, manuales] = await Promise.all([
      getInsigniasDe(uid),
      getRachaSemanas(uid),
      getInsigniasManualesDe(uid),
    ])
    const especial = manuales.find((m) => m.id === 'especial')
    const insigniasEspeciales = especial
      ? especial.registros.map((r) => ({ id: r.id, motivo: r.motivo, fecha: r.fecha, nombre: especial.nombre, imagen: especial.imagen }))
      : []
    return { joven, nivelActual: insignias.nivelActual, racha, insigniasEspeciales }
  } catch {
    return { joven, nivelActual: null, racha: 0, insigniasEspeciales: [] }
  }
}

export async function getJovenes() {
  const snap = await getDocs(query(collection(db, 'radgenPerfiles'), where('rol', '==', 'joven')))
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
}

// Para que un joven pueda "conocer a su líder" desde su propia pantalla,
// igual que ya puede ver el perfil de un compañero.
export async function getLideresRadgen() {
  const snap = await getDocs(query(collection(db, 'radgenPerfiles'), where('rol', '==', 'lider')))
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

// Solo las lecciones publicadas — para elegir qué asignar, exigir como
// requisito, o mostrar como "próxima parada" en el camino del joven. Los
// borradores no cuentan (todavía se están preparando) y las archivadas
// tampoco (siguen contando para insignias de quien ya las completó, pero
// no se ofrecen para asignaciones nuevas).
export async function getLeccionesActivas() {
  const todas = await getLecciones()
  return todas.filter((l) => l.estado === 'activa')
}

export async function getLeccionPorId(leccionId) {
  const snap = await getDoc(doc(db, 'radgenLecciones', leccionId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Un bloque de contenido es { id, tipo: 'versiculo'|'texto'|'punto'|'reto', ... }.
// La líder arma la lección con los bloques que quiera, en el orden que
// quiera — nada de un molde fijo de "un versículo, unas notas, N puntos".
function bloqueValido(b) {
  if (b.tipo === 'versiculo') return !!(b.referencia?.trim() || b.texto?.trim())
  return !!b.texto?.trim()
}

// Lee los bloques de una lección — si ya los tiene, los usa tal cual; si
// es una lección de antes de este cambio (solo con los campos viejos:
// versiculo/notas/puntos/reto), los sintetiza al vuelo en bloques
// equivalentes. Así ninguna lección existente se rompe sin necesidad de
// migrarlas a mano.
export function obtenerBloques(leccion) {
  if (!leccion) return []
  if (Array.isArray(leccion.contenido) && leccion.contenido.length > 0) return leccion.contenido

  const bloques = []
  if (leccion.versiculo?.referencia || leccion.versiculo?.texto) {
    bloques.push({
      id: 'legacy-versiculo',
      tipo: 'versiculo',
      referencia: leccion.versiculo.referencia || '',
      texto: leccion.versiculo.texto || '',
    })
  }
  if (leccion.notas) bloques.push({ id: 'legacy-notas', tipo: 'texto', texto: leccion.notas })
  ;(leccion.puntos || []).forEach((p, i) => bloques.push({ id: `legacy-punto-${i}`, tipo: 'punto', texto: p }))
  if (leccion.reto) bloques.push({ id: 'legacy-reto', tipo: 'reto', texto: leccion.reto })
  return bloques
}

// Junta bloques consecutivos del mismo tipo (texto o punto) en un solo
// grupo, para que dos "texto" seguidos no se vean como dos tarjetas
// separadas, y los puntos clave salgan en una sola lista. Usado tanto en la
// lección real (LessonDetailScreen) como en la vista previa de la líder.
export function agruparBloques(bloques) {
  const grupos = []
  bloques.forEach((b) => {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.tipo === b.tipo && (b.tipo === 'punto' || b.tipo === 'texto')) {
      ultimo.items.push(b)
    } else {
      grupos.push({ tipo: b.tipo, items: [b] })
    }
  })
  return grupos
}

// Crea una lección nueva desde el panel de líder — sin tocar código. Si
// `serieId` coincide con una serie existente, se agrega a ella; si no,
// `serieTitulo` define una serie nueva (y crea su doc en `radgenSeries`).
export async function crearLeccion({ titulo, serieId, serieTitulo, icono, youtubeId, imagen, quiz, contenido, estado }) {
  const todas = await getLecciones()
  const ordenMax = todas.reduce((max, l) => Math.max(max, l.orden || 0), 0)
  const serieIdResuelto = serieId || slugificar(serieTitulo)
  await asegurarSerie({ serieId: serieIdResuelto, serieTitulo: serieTitulo || 'Sin serie' })

  const nueva = {
    titulo,
    youtubeId: youtubeId || null,
    orden: ordenMax + 1,
    serieId: serieIdResuelto,
    serieTitulo: serieTitulo || 'Sin serie',
    icono: icono || '📖',
    estado: estado || 'activa',
    imagen: imagen || null,
    quiz: (quiz || []).filter((p) => p.pregunta.trim()),
    contenido: (contenido || []).filter(bloqueValido),
  }
  const ref = await addDoc(collection(db, 'radgenLecciones'), nueva)
  return { id: ref.id, ...nueva }
}

export async function actualizarLeccion(leccionId, cambios) {
  const actual = await getLeccionPorId(leccionId)
  const limpio = { ...cambios }
  if (cambios.quiz) limpio.quiz = cambios.quiz.filter((p) => p.pregunta.trim())
  if (cambios.contenido) limpio.contenido = cambios.contenido.filter(bloqueValido)
  // Firestore rechaza `undefined` en updateDoc — cualquier campo que el
  // llamador no haya resuelto simplemente se deja sin tocar.
  Object.keys(limpio).forEach((clave) => {
    if (limpio[clave] === undefined) delete limpio[clave]
  })
  if (limpio.serieId && limpio.serieTitulo) {
    await asegurarSerie({ serieId: limpio.serieId, serieTitulo: limpio.serieTitulo })
  }
  await updateDoc(doc(db, 'radgenLecciones', leccionId), limpio)
  return { ...actual, ...limpio }
}

// Copia una lección completa (contenido, quiz, ícono) como punto de
// partida rápido para una parecida — no reutiliza la imagen (cada una
// puede borrar la suya sin afectar a la otra) y empieza como borrador
// para revisarla antes de que quede disponible para asignar.
export async function duplicarLeccion(leccionId) {
  const original = await getLeccionPorId(leccionId)
  if (!original) return null
  return crearLeccion({
    titulo: `${original.titulo} (copia)`,
    serieId: original.serieId,
    serieTitulo: original.serieTitulo,
    icono: original.icono,
    youtubeId: original.youtubeId,
    imagen: null,
    quiz: original.quiz,
    contenido: obtenerBloques(original),
    estado: 'borrador',
  })
}

export async function alternarArchivoLeccion(leccionId) {
  const leccion = await getLeccionPorId(leccionId)
  if (leccion) {
    const nuevoEstado = leccion.estado === 'archivada' ? 'activa' : 'archivada'
    await updateDoc(doc(db, 'radgenLecciones', leccionId), { estado: nuevoEstado })
  }
  return getLecciones()
}

export async function publicarLeccion(leccionId) {
  await updateDoc(doc(db, 'radgenLecciones', leccionId), { estado: 'activa' })
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

// ===== Series =====
// Viven en su propia colección (`radgenSeries`) para poder personalizarlas
// (color, portada) y reordenarlas como entidades propias. Series creadas
// antes de este cambio no tienen doc todavía — se sintetizan al vuelo la
// primera vez que se leen, sin necesidad de migrarlas a mano.

// Best-effort: si las reglas de Firestore todavía no incluyen
// `radgenSeries`, no queremos que crear/editar una lección truene por una
// mejora que es puramente cosmética (color, portada, orden de la serie).
async function asegurarSerie({ serieId, serieTitulo, orden }) {
  try {
    const ref = doc(db, 'radgenSeries', serieId)
    const snap = await getDoc(ref)
    if (snap.exists()) return

    let ordenFinal = orden
    if (ordenFinal === undefined) {
      const todas = await getDocs(collection(db, 'radgenSeries'))
      ordenFinal = todas.docs.reduce((max, d) => Math.max(max, d.data().orden || 0), 0) + 1
    }
    await setDoc(ref, {
      titulo: serieTitulo,
      color: null,
      portada: null,
      orden: ordenFinal,
      creadaEn: new Date().toISOString(),
    })
  } catch {
    // Sin permisos todavía sobre radgenSeries — la lección se guarda igual.
  }
}

export async function getSeries() {
  const lecciones = await getLecciones()
  let snapDocs = []
  try {
    snapDocs = (await getDocs(collection(db, 'radgenSeries'))).docs
  } catch {
    // Sin permisos todavía sobre radgenSeries — se sintetiza solo de las lecciones.
  }
  const mapa = new Map(
    snapDocs.map((d) => [
      d.id,
      {
        serieId: d.id,
        serieTitulo: d.data().titulo,
        color: d.data().color || null,
        portada: d.data().portada || null,
        orden: d.data().orden ?? 0,
      },
    ]),
  )

  let siguienteOrden = mapa.size ? Math.max(...[...mapa.values()].map((s) => s.orden)) + 1 : 1
  lecciones.forEach((l) => {
    if (!mapa.has(l.serieId)) {
      mapa.set(l.serieId, { serieId: l.serieId, serieTitulo: l.serieTitulo, color: null, portada: null, orden: siguienteOrden })
      siguienteOrden += 1
    }
  })

  return [...mapa.values()].sort((a, b) => a.orden - b.orden)
}

// Color y portada — el título se cambia aparte, con `renombrarSerie`, porque
// ese sí requiere tocar todas las lecciones de la serie a la vez.
export async function actualizarSerie(serieId, cambios) {
  await setDoc(doc(db, 'radgenSeries', serieId), cambios, { merge: true })
  return getSeries()
}

// El título vive duplicado en cada lección (`serieTitulo`), así que
// renombrar una serie significa actualizar su doc en `radgenSeries` Y el
// `serieTitulo` de cada una de sus lecciones, todo en un solo batch para
// que nunca quede a medias (algunas lecciones con el nombre viejo).
export async function renombrarSerie(serieId, nuevoTitulo) {
  const titulo = nuevoTitulo.trim()
  if (!titulo) return getSeries()

  const lecciones = await getLecciones()
  const deSerie = lecciones.filter((l) => l.serieId === serieId)

  const batch = writeBatch(db)
  batch.set(doc(db, 'radgenSeries', serieId), { titulo }, { merge: true })
  deSerie.forEach((l) => batch.update(doc(db, 'radgenLecciones', l.id), { serieTitulo: titulo }))
  await batch.commit()

  return getSeries()
}

export async function moverSerie(serieId, direccion) {
  const series = await getSeries()
  const indice = series.findIndex((s) => s.serieId === serieId)
  const vecino = series[indice + direccion]
  if (!vecino) return series
  const actual = series[indice]

  await Promise.all([
    asegurarSerie({ serieId: actual.serieId, serieTitulo: actual.serieTitulo, orden: actual.orden }),
    asegurarSerie({ serieId: vecino.serieId, serieTitulo: vecino.serieTitulo, orden: vecino.orden }),
  ])
  await Promise.all([
    setDoc(doc(db, 'radgenSeries', actual.serieId), { orden: vecino.orden }, { merge: true }),
    setDoc(doc(db, 'radgenSeries', vecino.serieId), { orden: actual.orden }, { merge: true }),
  ])
  return getSeries()
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
  const siguiente = deSerie.slice(indice + 1).find((l) => l.estado === 'activa')
  if (!siguiente) return

  await asignarLeccion({ leccionId: siguiente.id, jovenUids: [asignadoA], liderUid: 'auto' })
}

// Asigna todas las cápsulas publicadas de una serie de un jalón, en vez de
// una por una — para cuando la líder quiere arrancar a alguien con el
// curso completo desde el principio.
export async function asignarSerieCompleta({ serieId, jovenUids, liderUid }) {
  const activas = await getLeccionesActivas()
  const deSerie = activas.filter((l) => l.serieId === serieId).sort((a, b) => a.orden - b.orden)
  for (const leccion of deSerie) {
    await asignarLeccion({ leccionId: leccion.id, jovenUids, liderUid })
  }
  return deSerie.length
}

// 1 de cada 10 cápsulas completadas trae un empujón chico de XP — una
// sorpresa, pero nunca tan grande como para mover el ranking por suerte.
const PROBABILIDAD_BONO = 0.1
const BONO_XP_MIN = 2
const BONO_XP_MAX = 5

export async function marcarCompletado(asignacionId, quizScore = null) {
  const asignacionRef = doc(db, 'radgenAsignaciones', asignacionId)
  const snap = await getDoc(asignacionRef)
  const asignacion = snap.exists() ? snap.data() : null

  const bonoXp =
    Math.random() < PROBABILIDAD_BONO
      ? Math.floor(Math.random() * (BONO_XP_MAX - BONO_XP_MIN + 1)) + BONO_XP_MIN
      : 0

  await updateDoc(asignacionRef, {
    estado: 'completado',
    fechaCompletado: new Date().toISOString(),
    quizScore, // { correctas, total } o null si la lección no tiene quiz
    bonoXp,
  })

  if (asignacion) {
    await asignarSiguienteLeccion(asignacion)
  }

  return { bonoXp }
}

export async function marcarRetoCumplido(asignacionId, valor) {
  await updateDoc(doc(db, 'radgenAsignaciones', asignacionId), { retoCumplido: valor })
}

export async function marcarVersiculoMemorizado(asignacionId) {
  await updateDoc(doc(db, 'radgenAsignaciones', asignacionId), { versiculoMemorizado: true })
}

// Reacción rápida de la líder a una cápsula completada, directo desde el
// feed de "Actividad reciente" — vive en la propia asignación (no en una
// colección aparte) porque es un dato mínimo, uno solo por cápsula.
export async function reaccionarActividad({ asignacionId, emoji }) {
  const ref = doc(db, 'radgenAsignaciones', asignacionId)
  const snap = await getDoc(ref)
  const actual = snap.exists() ? snap.data().reaccionLider : null
  const nuevaReaccion = actual?.emoji === emoji ? null : { emoji, fecha: new Date().toISOString() }
  await updateDoc(ref, { reaccionLider: nuevaReaccion })
  return nuevaReaccion
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
// Puro: a partir de las cápsulas que ya completó un joven, dice si cumple
// los requisitos de cada actividad. Se usa tanto para un joven como para
// todo el grupo a la vez (panel de líder) sin volver a leer nada.
export function calcularElegibilidad(completadasIds, requisitos, lecciones) {
  function evaluar(track) {
    const requeridas = requisitos[track] || []
    const faltantes = requeridas.filter((id) => !completadasIds.has(id))
    return {
      apto: faltantes.length === 0,
      faltantes: faltantes.map((id) => lecciones.find((l) => l.id === id)?.titulo || id),
    }
  }
  return { voluntariado: evaluar('voluntariado'), misiones: evaluar('misiones') }
}

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


  return {
    totalCompletadas,
    porLeccion,
    porSerie,
    nivelActual,
    siguienteNivel,
    progresoNivel: siguienteNivel
      ? { actual: totalCompletadas, meta: siguienteNivel.minimo }
      : null,
    elegibilidad: calcularElegibilidad(completadasIds, requisitos, lecciones),
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
function rachaDesdeAsignaciones(todas) {
  const asignaciones = todas.filter((a) => a.estado === 'completado' && a.fechaCompletado)
  if (asignaciones.length === 0) return 0

  const semanas = new Set(asignaciones.map((a) => getInicioSemana(a.fechaCompletado)))
  let cursor = getInicioSemana(new Date())
  let racha = 0

  while (semanas.has(cursor)) {
    racha += 1
    cursor -= SEMANA_MS
  }
  return racha
}

export async function getRachaSemanas(uid) {
  return rachaDesdeAsignaciones(await getAsignacionesDe(uid))
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

// Si esta semana todavía no completan nada, la racha "oficial" (la que
// cuenta desde la semana actual hacia atrás) ya se ve en 0 aunque venían de
// varias semanas seguidas — así que se calcula aparte, empezando desde la
// semana PASADA, para poder avisar "tu racha de N semanas está en riesgo"
// en vez de que el número simplemente desaparezca sin explicación.
export async function getRachaEnPeligro(uid) {
  const todas = await getAsignacionesDe(uid)
  const completadas = todas.filter((a) => a.estado === 'completado' && a.fechaCompletado)
  if (completadas.length === 0) return { enPeligro: false, rachaPrevia: 0 }

  const semanas = new Set(completadas.map((a) => getInicioSemana(a.fechaCompletado)))
  const unaSemanaMs = 7 * 24 * 60 * 60 * 1000
  const inicioSemanaActual = getInicioSemana(new Date())
  if (semanas.has(inicioSemanaActual)) return { enPeligro: false, rachaPrevia: 0 }

  let cursor = inicioSemanaActual - unaSemanaMs
  let racha = 0
  while (semanas.has(cursor)) {
    racha += 1
    cursor -= unaSemanaMs
  }
  return { enPeligro: racha > 0, rachaPrevia: racha }
}

// Cuántos jóvenes (de los que ya tienen currículo asignado) completaron al
// menos una cápsula esta semana — un pulso de comunidad simple para el
// proyector, sin la complejidad de rastrear una racha grupal real.
export async function getParticipacionSemanal() {
  const jovenes = await getJovenes()
  const inicioSemanaActual = getInicioSemana(new Date())
  const resultados = await Promise.all(
    jovenes.map(async (j) => {
      const asignaciones = await getAsignacionesDe(j.uid)
      if (asignaciones.length === 0) return null
      return asignaciones.some(
        (a) => a.estado === 'completado' && a.fechaCompletado && getInicioSemana(a.fechaCompletado) === inicioSemanaActual,
      )
    }),
  )
  const conCurriculo = resultados.filter((r) => r !== null)
  return { activos: conCurriculo.filter(Boolean).length, total: conCurriculo.length }
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
      ultimoMotivo: deEsteTipo[0]?.motivo || '',
      registros: deEsteTipo,
    }
  })
}

export async function otorgarInsigniaManual({ jovenUid, tipo, liderUid, motivo }) {
  await addDoc(collection(db, 'radgenInsigniasManuales'), {
    jovenUid,
    tipo,
    otorgadaPor: liderUid,
    motivo: motivo?.trim() || '',
    fecha: new Date().toISOString(),
  })
  return getInsigniasManualesDe(jovenUid)
}

export async function quitarInsigniaManual({ jovenUid, registroId }) {
  await deleteDoc(doc(db, 'radgenInsigniasManuales', registroId))
  return getInsigniasManualesDe(jovenUid)
}

// ===== Experiencia y niveles =====

// Tiempo transcurrido entre dos fechas sin contar lo que el calendario
// estuvo en pausa.
function msEfectivos(desde, hasta, pausas) {
  const a = new Date(desde).getTime()
  const b = new Date(hasta).getTime()
  if (b <= a) return 0
  const pausado = pausas.reduce((suma, p) => {
    const inicio = new Date(p.desde).getTime()
    const fin = p.hasta ? new Date(p.hasta).getTime() : Date.now()
    return suma + Math.max(0, Math.min(b, fin) - Math.max(a, inicio))
  }, 0)
  return b - a - pausado
}

// Para cada asignación: en qué semana de su serie "tocaba", cuántas semanas
// tarde se hizo (o va, si sigue pendiente), cuánto vale y cuánto falta para
// que baje al siguiente escalón. La serie empieza, para cada joven, el día
// que se le asignó su primera cápsula de esa serie — así alguien que se
// une después no arranca ya castigado.
export function calcularValorCapsulas(asignaciones, lecciones, pausas, ahora = new Date()) {
  const inicioPorSerie = new Map()
  asignaciones.forEach((a) => {
    const serieId = a.leccion?.serieId
    if (!serieId || !a.fechaAsignada) return
    const actual = inicioPorSerie.get(serieId)
    if (!actual || a.fechaAsignada < actual) inicioPorSerie.set(serieId, a.fechaAsignada)
  })

  const ordenEnSerie = new Map()
  const porSerie = new Map()
  lecciones
    .filter((l) => l.estado !== 'borrador')
    .forEach((l) => {
      if (!porSerie.has(l.serieId)) porSerie.set(l.serieId, [])
      porSerie.get(l.serieId).push(l)
    })
  porSerie.forEach((lista) => {
    lista.sort((x, y) => x.orden - y.orden).forEach((l, i) => ordenEnSerie.set(l.id, i))
  })

  const enPausa = calendarioEnPausa(pausas)
  const resultado = new Map()
  asignaciones.forEach((a) => {
    const inicio = inicioPorSerie.get(a.leccion?.serieId)
    const semanaEsperada = ordenEnSerie.get(a.leccionId)
    if (!inicio || semanaEsperada === undefined) {
      resultado.set(a.id, { factor: 1, semanasTarde: 0, msParaBajar: null, enPausa })
      return
    }
    const completada = a.estado === 'completado' && a.fechaCompletado
    const referencia = completada ? a.fechaCompletado : ahora
    const efectivo = msEfectivos(inicio, referencia, pausas)
    const semanaEntrega = Math.floor(efectivo / SEMANA_MS)
    const semanasTarde = Math.max(0, semanaEntrega - semanaEsperada)
    const escalon = Math.min(semanasTarde, VALOR_POR_SEMANAS_TARDE.length - 1)
    const factor = VALOR_POR_SEMANAS_TARDE[escalon]
    const puedeBajarMas = escalon < VALOR_POR_SEMANAS_TARDE.length - 1
    const msParaBajar =
      !completada && puedeBajarMas ? (semanaEsperada + escalon + 1) * SEMANA_MS - efectivo : null
    resultado.set(a.id, { factor, semanasTarde, msParaBajar, enPausa })
  })
  return resultado
}

function contarInsigniasAuto(lecciones, completadasIds) {
  const deCapsulas = lecciones.filter((l) => completadasIds.has(l.id)).length
  const series = getSeriesUnicas(lecciones)
  const deSeries = series.filter((s) =>
    lecciones.filter((l) => l.serieId === s.serieId).every((l) => completadasIds.has(l.id)),
  ).length
  const rango = [...NIVELES].reverse().find((n) => completadasIds.size >= n.minimo) || null
  return { total: deCapsulas + deSeries + (rango ? 1 : 0), nivelActual: rango, totalCompletadas: completadasIds.size }
}

// Quién ganó un duelo (null si todavía falta alguien o fue empate exacto).
export function ganadorDeDuelo(duelo) {
  const r1 = duelo.respuestas?.[duelo.retadorUid]
  const r2 = duelo.respuestas?.[duelo.retadoUid]
  if (!r1 || !r2) return null
  if (r1.correctas !== r2.correctas) return r1.correctas > r2.correctas ? duelo.retadorUid : duelo.retadoUid
  if (r1.tiempoMs !== r2.tiempoMs) return r1.tiempoMs < r2.tiempoMs ? duelo.retadorUid : duelo.retadoUid
  return null
}

function duelosGanadosConXp(uid, duelos) {
  const porSemana = new Map()
  duelos.forEach((d) => {
    if (ganadorDeDuelo(d) !== uid) return
    const fechas = Object.values(d.respuestas).map((r) => r.fecha)
    const semana = getInicioSemana(fechas.sort().at(-1))
    porSemana.set(semana, (porSemana.get(semana) || 0) + 1)
  })
  let total = 0
  porSemana.forEach((n) => {
    total += Math.min(n, DUELOS_CON_XP_POR_SEMANA)
  })
  return total
}

// El cálculo puro: recibe todo lo de UN joven ya cargado y devuelve su XP
// con el desglose completo, para poder explicarle de dónde sale cada punto.
function calcularExperiencia({ xpCfg, asignaciones, lecciones, pausas, manuales, asistencias, duelos, uid }) {
  const completadas = asignaciones.filter((a) => a.estado === 'completado')
  const valores = calcularValorCapsulas(asignaciones, lecciones, pausas)

  let capsulas = 0
  let quiz = 0
  let perdidoPorTarde = 0
  let aTiempo = 0
  completadas.forEach((a) => {
    const { factor } = valores.get(a.id) || { factor: 1 }
    const baseCapsula = xpCfg.porLeccionCompletada
    const baseQuiz = (a.quizScore?.correctas || 0) * xpCfg.porQuizCorrecta
    const ganado = Math.round(baseCapsula * factor) + Math.round(baseQuiz * factor)
    capsulas += Math.round(baseCapsula * factor)
    quiz += Math.round(baseQuiz * factor)
    perdidoPorTarde += baseCapsula + baseQuiz - ganado
    if (factor === 1) aTiempo += 1
  })

  const racha = rachaDesdeAsignaciones(asignaciones)
  // La XP de constancia cuenta semanas con al menos una cápsula, no la
  // racha actual: así nunca baja, y no premia a quien se pone al corriente
  // tarde por encima de quien la hizo a tiempo la semana anterior.
  const semanasActivas = new Set(
    completadas.filter((a) => a.fechaCompletado).map((a) => getInicioSemana(a.fechaCompletado)),
  ).size
  const insigniasManualesTotal = manuales.length
  const versiculos = completadas.filter((a) => a.versiculoMemorizado).length
  const duelosGanados = duelosGanadosConXp(uid, duelos)

  const desglose = {
    capsulas,
    quiz,
    racha: semanasActivas * xpCfg.porRachaSemana,
    insignias: insigniasManualesTotal * xpCfg.porInsigniaManual,
    asistencia: asistencias.length * xpCfg.porAsistencia,
    versiculos: versiculos * xpCfg.porVersiculoMemorizado,
    duelos: duelosGanados * xpCfg.porDueloGanado,
    bono: completadas.reduce((suma, a) => suma + (a.bonoXp || 0), 0),
  }
  const xpTotal = Object.values(desglose).reduce((s, v) => s + v, 0)

  const xpPorNivel = Math.max(1, xpCfg.xpPorNivel)
  const nivel = Math.floor(xpTotal / xpPorNivel) + 1
  const xpEnNivelActual = xpTotal % xpPorNivel

  return {
    xpTotal,
    nivel,
    xpEnNivelActual,
    xpPorNivel,
    desglose,
    perdidoPorTarde,
    aTiempo,
    totalCompletadas: completadas.length,
    racha,
    conteos: {
      semanasActivas,
      asistencias: asistencias.length,
      versiculos,
      duelosGanados,
      insigniasManuales: insigniasManualesTotal,
    },
  }
}

async function leerSeguro(consulta) {
  try {
    const snap = await getDocs(consulta)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch {
    return []
  }
}

// Todo se calcula al vuelo a partir del historial real — igual que
// insignias, racha y ranking — para que cambiar los valores de XP desde
// el panel de líder recalcule a todos de inmediato, sin tener que migrar
// contadores guardados.
export async function getExperienciaDe(uid) {
  const [config, lecciones, asignacionesRaw, manuales, asistencias, duelosA, duelosB] = await Promise.all([
    getConfig(),
    getLecciones(),
    leerSeguro(query(collection(db, 'radgenAsignaciones'), where('asignadoA', '==', uid))),
    leerSeguro(query(collection(db, 'radgenInsigniasManuales'), where('jovenUid', '==', uid))),
    leerSeguro(query(collection(db, 'radgenAsistencias'), where('jovenUid', '==', uid))),
    leerSeguro(query(collection(db, 'radgenDuelos'), where('retadorUid', '==', uid))),
    leerSeguro(query(collection(db, 'radgenDuelos'), where('retadoUid', '==', uid))),
  ])
  const asignaciones = asignacionesRaw.map((a) => ({ ...a, leccion: lecciones.find((l) => l.id === a.leccionId) }))
  return calcularExperiencia({
    xpCfg: { ...XP_CONFIG_POR_DEFECTO, ...(config.xp || {}) },
    asignaciones,
    lecciones,
    pausas: config.pausasCalendario || [],
    manuales,
    asistencias,
    duelos: [...duelosA, ...duelosB],
    uid,
  })
}

// Un solo ranking para todo (panel, pantalla de insignias y proyector):
// ordenado por experiencia, desempatando por insignias totales. Carga cada
// colección UNA vez para todo el grupo, en vez de repetir las mismas
// lecturas por cada joven.
export async function getRanking() {
  const [config, lecciones, jovenes, asignaciones, manuales, asistencias, duelos] = await Promise.all([
    getConfig(),
    getLecciones(),
    getJovenes(),
    leerSeguro(collection(db, 'radgenAsignaciones')),
    leerSeguro(collection(db, 'radgenInsigniasManuales')),
    leerSeguro(collection(db, 'radgenAsistencias')),
    leerSeguro(collection(db, 'radgenDuelos')),
  ])
  const xpCfg = { ...XP_CONFIG_POR_DEFECTO, ...(config.xp || {}) }
  const pausas = config.pausasCalendario || []
  const leccionPorId = new Map(lecciones.map((l) => [l.id, l]))

  const filas = jovenes.map((joven) => {
    const deJoven = asignaciones
      .filter((a) => a.asignadoA === joven.uid)
      .map((a) => ({ ...a, leccion: leccionPorId.get(a.leccionId) }))
    const manualesDeJoven = manuales.filter((m) => m.jovenUid === joven.uid)
    const experiencia = calcularExperiencia({
      xpCfg,
      asignaciones: deJoven,
      lecciones,
      pausas,
      manuales: manualesDeJoven,
      asistencias: asistencias.filter((x) => x.jovenUid === joven.uid),
      duelos: duelos.filter((d) => d.retadorUid === joven.uid || d.retadoUid === joven.uid),
      uid: joven.uid,
    })
    const completadasIds = new Set(deJoven.filter((a) => a.estado === 'completado').map((a) => a.leccionId))
    const auto = contarInsigniasAuto(lecciones, completadasIds)
    return {
      joven,
      experiencia,
      xpTotal: experiencia.xpTotal,
      insigniasTotal: auto.total + manualesDeJoven.length,
      totalCompletadas: auto.totalCompletadas,
      nivelActual: auto.nivelActual,
      racha: experiencia.racha,
    }
  })

  filas.sort(
    (a, b) =>
      b.xpTotal - a.xpTotal ||
      b.insigniasTotal - a.insigniasTotal ||
      (a.joven.nombre || '').localeCompare(b.joven.nombre || ''),
  )
  // Empatados (misma XP y mismas insignias) comparten lugar: 1, 2, 2, 4…
  filas.forEach((f, i) => {
    const anterior = filas[i - 1]
    f.posicion =
      anterior && anterior.xpTotal === f.xpTotal && anterior.insigniasTotal === f.insigniasTotal ? anterior.posicion : i + 1
  })
  return filas
}

// Equipos ordenados por XP promedio por integrante — con promedio y no con
// suma, para que un equipo más grande no gane solo por tener más gente.
export function calcularRankingEquipos(equipos, ranking) {
  return equipos
    .map((e) => {
      const filas = ranking.filter((f) => e.miembros?.includes(f.joven.uid))
      const total = filas.reduce((s, f) => s + f.xpTotal, 0)
      return { ...e, integrantes: filas, total, promedio: filas.length ? Math.round(total / filas.length) : 0 }
    })
    .sort((a, b) => b.promedio - a.promedio)
}

// ===== Asistencia con QR =====

function codigoAleatorio() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let codigo = ''
  for (let i = 0; i < 6; i += 1) codigo += letras[Math.floor(Math.random() * letras.length)]
  return codigo
}

export async function crearReunion({ titulo, liderUid }) {
  const codigo = codigoAleatorio()
  const reunion = {
    codigo,
    titulo: titulo?.trim() || `Reunión ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`,
    fecha: new Date().toISOString(),
    activa: true,
    creadaPor: liderUid,
  }
  await setDoc(doc(db, 'radgenReuniones', codigo), reunion)
  return reunion
}

export async function cerrarReunion(codigo) {
  await updateDoc(doc(db, 'radgenReuniones', codigo), { activa: false })
}

export async function getReuniones() {
  const lista = await leerSeguro(collection(db, 'radgenReuniones'))
  return lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
}

export function observarAsistenciasDeReunion(codigo, callback) {
  return onSnapshot(
    query(collection(db, 'radgenAsistencias'), where('reunionCodigo', '==', codigo)),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => callback([]),
  )
}

// Devuelve { ok, yaRegistrada, reunion } o { ok: false, error }.
export async function registrarAsistencia({ codigo, jovenUid }) {
  try {
    return await registrarAsistenciaInterno({ codigo, jovenUid })
  } catch {
    return { ok: false, error: 'No se pudo registrar tu asistencia. Intenta de nuevo o avísale a tu líder.' }
  }
}

async function registrarAsistenciaInterno({ codigo, jovenUid }) {
  const limpio = (codigo || '').trim().toUpperCase()
  const snap = await getDoc(doc(db, 'radgenReuniones', limpio))
  if (!snap.exists()) return { ok: false, error: 'Ese código no existe. Revísalo con tu líder.' }
  const reunion = snap.data()
  if (!reunion.activa) return { ok: false, error: 'Esta reunión ya cerró su registro de asistencia.' }

  const ref = doc(db, 'radgenAsistencias', `${limpio}_${jovenUid}`)
  const existente = await getDoc(ref)
  if (existente.exists()) return { ok: true, yaRegistrada: true, reunion }

  await setDoc(ref, { reunionCodigo: limpio, jovenUid, fecha: new Date().toISOString() })
  return { ok: true, yaRegistrada: false, reunion }
}

export async function quitarAsistencia(asistenciaId) {
  await deleteDoc(doc(db, 'radgenAsistencias', asistenciaId))
}

// ===== Duelos de quiz =====

function mezclar(lista) {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

// Preguntas de cápsulas que AMBOS ya completaron — un duelo es de repaso,
// nunca le adelanta a nadie el quiz de algo que todavía no ve.
export async function crearDuelo({ retadorUid, retadoUid }) {
  try {
    return await crearDueloInterno({ retadorUid, retadoUid })
  } catch {
    return { ok: false, error: 'No se pudo crear el duelo justo ahora. Intenta de nuevo en un momento.' }
  }
}

function dueloSinTerminar(d) {
  return !d.respuestas?.[d.retadorUid] || !d.respuestas?.[d.retadoUid]
}

async function crearDueloInterno({ retadorUid, retadoUid }) {
  // Si ya tienen un duelo sin terminar entre los dos (en cualquier
  // dirección), se reusa en vez de crear otro — evita duplicados por un
  // doble clic o por retarse mutuamente al mismo tiempo.
  const mios = await getDuelosDe(retadorUid)
  const pendiente = mios.find(
    (d) => (d.retadorUid === retadoUid || d.retadoUid === retadoUid) && dueloSinTerminar(d),
  )
  if (pendiente) return { ok: true, dueloId: pendiente.id, existente: true }

  const [lecciones, mias, suyas] = await Promise.all([
    getLecciones(),
    leerSeguro(query(collection(db, 'radgenAsignaciones'), where('asignadoA', '==', retadorUid))),
    leerSeguro(query(collection(db, 'radgenAsignaciones'), where('asignadoA', '==', retadoUid))),
  ])
  const hechasPor = (lista) => new Set(lista.filter((a) => a.estado === 'completado').map((a) => a.leccionId))
  const mias_ = hechasPor(mias)
  const suyas_ = hechasPor(suyas)
  const banco = lecciones
    .filter((l) => mias_.has(l.id) && suyas_.has(l.id) && l.quiz?.length)
    .flatMap((l) => l.quiz.map((p) => ({ ...p, leccionTitulo: l.titulo })))

  if (banco.length < 3) {
    return { ok: false, error: 'Todavía no tienen suficientes cápsulas con quiz en común para un duelo.' }
  }

  const preguntas = mezclar(banco)
    .slice(0, 5)
    .map((p) => ({ pregunta: p.pregunta, opciones: p.opciones, correcta: p.correcta, leccionTitulo: p.leccionTitulo }))

  const ref = await addDoc(collection(db, 'radgenDuelos'), {
    retadorUid,
    retadoUid,
    preguntas,
    respuestas: {},
    fecha: new Date().toISOString(),
  })
  return { ok: true, dueloId: ref.id }
}

// Para la pantalla de Compañeros: todos los demás jóvenes, cuántas
// preguntas de quiz tienen en común contigo (hacen falta 3 para un duelo)
// y si ya tienen un duelo abierto entre los dos. Solo datos cosméticos de
// cada quien — nada de XP ni lugares, que eso depende de si la líder
// decidió mostrar el ranking.
export async function getCompaneros(uid) {
  const [jovenes, lecciones, asignaciones, duelos] = await Promise.all([
    getJovenes(),
    getLecciones(),
    leerSeguro(collection(db, 'radgenAsignaciones')),
    getDuelosDe(uid),
  ])
  const preguntasPorLeccion = new Map(lecciones.map((l) => [l.id, l.quiz?.length || 0]))
  const completadasDe = new Map()
  asignaciones.forEach((a) => {
    if (a.estado !== 'completado') return
    if (!completadasDe.has(a.asignadoA)) completadasDe.set(a.asignadoA, new Set())
    completadasDe.get(a.asignadoA).add(a.leccionId)
  })
  const mias = completadasDe.get(uid) || new Set()

  return jovenes
    .filter((j) => j.uid !== uid)
    .map((joven) => {
      const suyas = completadasDe.get(joven.uid) || new Set()
      let preguntasEnComun = 0
      mias.forEach((id) => {
        if (suyas.has(id)) preguntasEnComun += preguntasPorLeccion.get(id) || 0
      })
      const dueloAbierto =
        duelos.find((d) => (d.retadorUid === joven.uid || d.retadoUid === joven.uid) && dueloSinTerminar(d)) || null
      const duelosTerminados = duelos.filter(
        (d) => (d.retadorUid === joven.uid || d.retadoUid === joven.uid) && !dueloSinTerminar(d),
      )
      return {
        joven,
        preguntasEnComun,
        puedeRetar: preguntasEnComun >= 3,
        dueloAbierto,
        victorias: duelosTerminados.filter((d) => ganadorDeDuelo(d) === uid).length,
        derrotas: duelosTerminados.filter((d) => ganadorDeDuelo(d) === joven.uid).length,
      }
    })
}

export async function getDuelo(dueloId) {
  const snap = await getDoc(doc(db, 'radgenDuelos', dueloId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getDuelosDe(uid) {
  const [a, b] = await Promise.all([
    leerSeguro(query(collection(db, 'radgenDuelos'), where('retadorUid', '==', uid))),
    leerSeguro(query(collection(db, 'radgenDuelos'), where('retadoUid', '==', uid))),
  ])
  return [...a, ...b].sort((x, y) => new Date(y.fecha) - new Date(x.fecha))
}

export async function responderDuelo({ dueloId, uid, correctas, tiempoMs }) {
  await updateDoc(doc(db, 'radgenDuelos', dueloId), {
    [`respuestas.${uid}`]: { correctas, tiempoMs: Math.round(tiempoMs), fecha: new Date().toISOString() },
  })
  return getDuelo(dueloId)
}

// ===== Resumen ("Wrapped") de una serie terminada =====

export async function getResumenSerie(uid, serieId) {
  const [config, lecciones, asignacionesRaw] = await Promise.all([
    getConfig(),
    getLecciones(),
    leerSeguro(query(collection(db, 'radgenAsignaciones'), where('asignadoA', '==', uid))),
  ])
  const xpCfg = { ...XP_CONFIG_POR_DEFECTO, ...(config.xp || {}) }
  const asignaciones = asignacionesRaw.map((a) => ({ ...a, leccion: lecciones.find((l) => l.id === a.leccionId) }))
  const valores = calcularValorCapsulas(asignaciones, lecciones, config.pausasCalendario || [])
  const deSerie = asignaciones.filter((a) => a.leccion?.serieId === serieId && a.estado === 'completado')
  if (deSerie.length === 0) return null

  const correctas = deSerie.reduce((s, a) => s + (a.quizScore?.correctas || 0), 0)
  const preguntas = deSerie.reduce((s, a) => s + (a.quizScore?.total || 0), 0)
  const aTiempo = deSerie.filter((a) => (valores.get(a.id)?.factor ?? 1) === 1).length
  const xp = deSerie.reduce((s, a) => {
    const f = valores.get(a.id)?.factor ?? 1
    return (
      s +
      Math.round(xpCfg.porLeccionCompletada * f) +
      Math.round((a.quizScore?.correctas || 0) * xpCfg.porQuizCorrecta * f) +
      (a.bonoXp || 0) +
      (a.versiculoMemorizado ? xpCfg.porVersiculoMemorizado : 0)
    )
  }, 0)
  const fechas = deSerie.map((a) => a.fechaCompletado).filter(Boolean).sort()
  const inicio = deSerie.map((a) => a.fechaAsignada).filter(Boolean).sort()[0]
  const dias = inicio && fechas.length ? Math.max(1, Math.round((new Date(fechas.at(-1)) - new Date(inicio)) / DIA_MS)) : 1

  return {
    serieTitulo: deSerie[0].leccion.serieTitulo,
    capsulas: deSerie.length,
    correctas,
    preguntas,
    aTiempo,
    xp,
    dias,
    versiculos: deSerie.filter((a) => a.versiculoMemorizado).length,
    retos: deSerie.filter((a) => a.retoCumplido).length,
  }
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

export async function eliminarComentario(comentarioId) {
  await deleteDoc(doc(db, 'radgenComentarios', comentarioId))
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

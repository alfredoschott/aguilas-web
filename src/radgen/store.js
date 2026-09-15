// Estado de RadGen Education.
// Simula lo que después será Firebase Auth + Firestore (ver plan MVP, sección 3).
// Todo vive en localStorage mientras se conecta el backend real.

const STORAGE_KEY = 'radgen_edu_demo_v1'
const CODIGO_INVITACION = 'RADGEN2026'

const LECCIONES_SEED = [
  {
    id: 'daniel-1',
    titulo: 'Daniel — Cápsula 1: El propósito en el exilio',
    youtubeId: null, // pendiente: Sandra sube el video no listado al canal RadGen Education
    orden: 1,
    serieId: 'daniel',
    serieTitulo: 'Serie: Daniel',
    icono: '🦁',
    estado: 'activa',
    versiculo: { referencia: 'Daniel 1:8', texto: 'Daniel se propuso en su corazón no contaminarse.' },
    notas: 'Daniel fue llevado a una tierra extraña, lejos de todo lo conocido, y aun así decidió mantenerse fiel. Esta cápsula habla de encontrar propósito incluso cuando el lugar donde estamos no lo elegimos nosotros.',
    puntos: [
      'Dios tiene un propósito para ti sin importar dónde estés.',
      'Las decisiones pequeñas y diarias construyen el carácter.',
      'La fidelidad no depende de las circunstancias.',
    ],
    imagen: null,
    quiz: [
      {
        pregunta: '¿Qué decidió Daniel a pesar de estar en una tierra extraña?',
        opciones: ['Olvidar sus convicciones', 'Mantenerse fiel a Dios', 'Rendirse ante la cultura', 'Esconder su fe'],
        correcta: 1,
      },
      {
        pregunta: '¿Qué nos enseña esta cápsula sobre nuestro propósito?',
        opciones: ['Que cambia según el lugar', 'Que Dios tiene un propósito para ti donde sea que estés', 'Que solo aplica en Israel', 'Que hay que esperar a ser adulto'],
        correcta: 1,
      },
    ],
  },
  {
    id: 'daniel-2',
    titulo: 'Daniel — Cápsula 2: Integridad bajo presión',
    youtubeId: null,
    orden: 2,
    serieId: 'daniel',
    serieTitulo: 'Serie: Daniel',
    icono: '🔥',
    estado: 'activa',
    versiculo: { referencia: 'Daniel 3:17-18', texto: 'Aun si Dios no nos libra, no vamos a doblegarnos.' },
    notas: 'Bajo amenaza directa, Daniel, Sadrac, Mesac y Abed-nego eligieron la integridad sobre la comodidad. Esta cápsula explora qué significa mantenerse firme cuando ceder sería mucho más fácil.',
    puntos: [
      'Integridad es ser el mismo en público y en privado.',
      'La presión revela lo que de verdad valoramos.',
      'Decir "no" con convicción también es un acto de fe.',
    ],
    imagen: null,
    quiz: [
      {
        pregunta: '¿Qué significa tener integridad?',
        opciones: ['Aparentar ser bueno', 'Ser el mismo en público y en privado', 'Ceder cuando nadie ve', 'Buscar aprobación'],
        correcta: 1,
      },
      {
        pregunta: '¿Cómo respondió Daniel a la presión de su entorno?',
        opciones: ['Se rindió', 'Se mantuvo firme en sus valores', 'Cambió de opinión', 'Ignoró el problema'],
        correcta: 1,
      },
    ],
  },
  {
    id: 'daniel-3',
    titulo: 'Daniel — Cápsula 3: Fidelidad en lo secreto',
    youtubeId: null,
    orden: 3,
    serieId: 'daniel',
    serieTitulo: 'Serie: Daniel',
    icono: '🕯️',
    estado: 'activa',
    versiculo: { referencia: 'Daniel 6:10', texto: 'Seguía orando tres veces al día, como lo hacía siempre.' },
    notas: 'Daniel no cambió sus hábitos de oración ni siquiera cuando un decreto real lo ponía en riesgo. Esta cápsula habla de la fidelidad silenciosa, la que nadie aplaude pero que define quiénes somos de verdad.',
    puntos: [
      'Lo que haces cuando nadie te ve es quien realmente eres.',
      'Los hábitos constantes sostienen la fe en momentos difíciles.',
      'La fidelidad en lo secreto tiene efecto público, tarde o temprano.',
    ],
    imagen: null,
    quiz: [
      {
        pregunta: '¿Qué hacía Daniel incluso cuando nadie lo veía?',
        opciones: ['Nada distinto', 'Oraba y honraba a Dios igual', 'Dejaba de esforzarse', 'Solo actuaba correcto en público'],
        correcta: 1,
      },
      {
        pregunta: '¿Por qué importa la fidelidad en lo secreto?',
        opciones: ['No importa si nadie ve', 'Define quién eres realmente', 'Es solo para líderes', 'Es opcional'],
        correcta: 1,
      },
    ],
  },
]

// Insignias de rango por cantidad total de cápsulas completadas (ajustable
// según crezca el currículo real).
const NIVELES = [
  { id: 'bronce', nombre: 'Bronce', minimo: 3, icono: '🥉' },
  { id: 'plata', nombre: 'Plata', minimo: 10, icono: '🥈' },
  { id: 'oro', nombre: 'Oro', minimo: 20, icono: '🥇' },
]

// Requisitos por actividad: qué lecciones debe tener completadas un joven
// para que el líder lo pueda considerar apto. Editable desde el panel de líder.
const REQUISITOS_SEED = {
  voluntariado: ['daniel-1', 'daniel-2'],
  misiones: ['daniel-1', 'daniel-2', 'daniel-3'],
}

const USUARIOS_SEED = [
  {
    uid: 'lider-sandra',
    nombre: 'Sandra Lara',
    email: 'sandra.lara@gmail.com',
    rol: 'lider',
    creadoEn: '2026-09-01T00:00:00.000Z',
  },
  {
    uid: 'joven-demo-1',
    nombre: 'Mariana Pérez',
    email: 'mariana.perez@gmail.com',
    rol: 'joven',
    creadoEn: '2026-09-10T00:00:00.000Z',
  },
  {
    uid: 'joven-demo-2',
    nombre: 'Kevin Torres',
    email: 'kevin.torres@gmail.com',
    rol: 'joven',
    creadoEn: '2026-09-10T00:00:00.000Z',
  },
]

const ASIGNACIONES_SEED = [
  {
    id: 'a1',
    leccionId: 'daniel-1',
    asignadoA: 'joven-demo-1',
    asignadoPor: 'lider-sandra',
    estado: 'completado',
    fechaAsignada: '2026-09-10T00:00:00.000Z',
    fechaCompletado: '2026-09-11T00:00:00.000Z',
  },
  {
    id: 'a2',
    leccionId: 'daniel-2',
    asignadoA: 'joven-demo-1',
    asignadoPor: 'lider-sandra',
    estado: 'pendiente',
    fechaAsignada: '2026-09-12T00:00:00.000Z',
    fechaCompletado: null,
  },
]

function seed() {
  return {
    codigoInvitacion: CODIGO_INVITACION,
    sesion: null, // uid del usuario logueado, o null
    usuarios: USUARIOS_SEED,
    lecciones: LECCIONES_SEED,
    asignaciones: ASIGNACIONES_SEED,
    requisitos: REQUISITOS_SEED,
    // La líder decide cuándo los jóvenes pueden ver si son aptos o no.
    mostrarElegibilidadAJovenes: false,
    notasLider: {}, // { [jovenUid]: [{ texto, fecha }] }
    comentarios: {}, // { [asignacionId]: [{ id, texto, autorUid, fecha, respuesta, respuestaFecha }] }
    tareasPersonales: {}, // { [jovenUid]: [{ id, titulo, descripcion, asignadaPor, fechaCreada, estado, fechaCompletada }] }
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.usuarios)) return seed()
    // Migraciones suaves para estado guardado antes de agregar series/insignias/requisitos.
    if (!parsed.lecciones?.[0]?.serieId || !parsed.lecciones?.[0]?.quiz) {
      parsed.lecciones = LECCIONES_SEED
    }
    // Lecciones guardadas antes de agregar estado/versículo/notas: se completan
    // con valores por defecto sin perder lo que la líder ya creó.
    parsed.lecciones = parsed.lecciones.map((l) => ({
      estado: 'activa',
      versiculo: null,
      notas: '',
      puntos: [],
      imagen: null,
      ...l,
    }))
    if (!parsed.requisitos) {
      parsed.requisitos = REQUISITOS_SEED
    }
    if (typeof parsed.mostrarElegibilidadAJovenes !== 'boolean') {
      parsed.mostrarElegibilidadAJovenes = false
    }
    if (!parsed.notasLider) {
      parsed.notasLider = {}
    }
    if (!parsed.comentarios) {
      parsed.comentarios = {}
    }
    if (!parsed.tareasPersonales) {
      parsed.tareasPersonales = {}
    }
    return parsed
  } catch {
    return seed()
  }
}

function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetDemo() {
  const fresh = seed()
  save(fresh)
  return fresh
}

export function getState() {
  return load()
}

export function loginConGoogleFalso({ nombre, email }) {
  const state = load()
  const existente = state.usuarios.find((u) => u.email === email)
  if (existente) {
    state.sesion = existente.uid
    save(state)
    return { state, requiereCodigo: false, usuario: existente }
  }
  return { state, requiereCodigo: true, usuario: null, perfilGoogle: { nombre, email } }
}

export function registrarJovenConCodigo({ nombre, email, codigo }) {
  const state = load()
  if (codigo.trim().toUpperCase() !== state.codigoInvitacion) {
    return { ok: false, error: 'Código de invitación incorrecto.' }
  }
  const uid = `joven-${Date.now()}`
  const nuevoUsuario = {
    uid,
    nombre,
    email,
    rol: 'joven',
    creadoEn: new Date().toISOString(),
  }
  state.usuarios.push(nuevoUsuario)
  state.sesion = uid
  save(state)
  return { ok: true, usuario: nuevoUsuario, state }
}

export function loginComoLider() {
  const state = load()
  const lider = state.usuarios.find((u) => u.rol === 'lider')
  state.sesion = lider.uid
  save(state)
  return { state, usuario: lider }
}

export function cerrarSesion() {
  const state = load()
  state.sesion = null
  save(state)
  return state
}

export function getUsuarioActual() {
  const state = load()
  if (!state.sesion) return null
  return state.usuarios.find((u) => u.uid === state.sesion) || null
}

export function getAsignacionesDe(uid) {
  const state = load()
  return state.asignaciones
    .filter((a) => a.asignadoA === uid)
    .map((a) => ({ ...a, leccion: state.lecciones.find((l) => l.id === a.leccionId) }))
    .sort((a, b) => (a.leccion?.orden ?? 0) - (b.leccion?.orden ?? 0))
}

export function marcarCompletado(asignacionId, quizScore = null) {
  const state = load()
  const asignacion = state.asignaciones.find((a) => a.id === asignacionId)
  if (asignacion) {
    asignacion.estado = 'completado'
    asignacion.fechaCompletado = new Date().toISOString()
    asignacion.quizScore = quizScore // { correctas, total } o null si la lección no tiene quiz
  }
  save(state)
  return state
}

// Corrige una lección marcada como completada por error, sin borrar la
// asignación — el joven la vuelve a ver como pendiente y puede rehacerla.
export function revertirCompletado(asignacionId) {
  const state = load()
  const asignacion = state.asignaciones.find((a) => a.id === asignacionId)
  if (asignacion) {
    asignacion.estado = 'pendiente'
    asignacion.fechaCompletado = null
    asignacion.quizScore = null
  }
  save(state)
  return state.asignaciones
}

// Quita una asignación por completo (lección asignada a la persona o el
// momento equivocado). Distinto de revertirCompletado: esta desaparece.
export function eliminarAsignacion(asignacionId) {
  const state = load()
  state.asignaciones = state.asignaciones.filter((a) => a.id !== asignacionId)
  save(state)
  return state.asignaciones
}

export function getJovenes() {
  const state = load()
  return state.usuarios.filter((u) => u.rol === 'joven')
}

export function getLecciones() {
  const state = load()
  return [...state.lecciones].sort((a, b) => a.orden - b.orden)
}

// Solo las lecciones vigentes — para elegir qué asignar o exigir como
// requisito. Las archivadas siguen contando para insignias de quien ya las
// completó (getLecciones), pero no se ofrecen para asignaciones nuevas.
export function getLeccionesActivas() {
  return getLecciones().filter((l) => l.estado !== 'archivada')
}

function slugificar(texto) {
  return (texto || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Crea una lección nueva desde el panel de líder — sin tocar código. Si
// `serieId` coincide con una serie existente, se agrega a ella; si no,
// `serieTitulo` define una serie nueva.
export function crearLeccion({ titulo, serieId, serieTitulo, icono, youtubeId, versiculo, notas, puntos, imagen, quiz }) {
  const state = load()
  const ordenMax = state.lecciones.reduce((max, l) => Math.max(max, l.orden || 0), 0)
  const nueva = {
    id: `leccion-${Date.now()}`,
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
  }
  state.lecciones.push(nueva)
  save(state)
  return nueva
}

export function actualizarLeccion(leccionId, cambios) {
  const state = load()
  const leccion = state.lecciones.find((l) => l.id === leccionId)
  if (leccion) {
    Object.assign(leccion, cambios, {
      puntos: (cambios.puntos || leccion.puntos || []).filter((p) => p.trim()),
      quiz: (cambios.quiz || leccion.quiz || []).filter((p) => p.pregunta.trim()),
    })
  }
  save(state)
  return leccion
}

export function alternarArchivoLeccion(leccionId) {
  const state = load()
  const leccion = state.lecciones.find((l) => l.id === leccionId)
  if (leccion) {
    leccion.estado = leccion.estado === 'archivada' ? 'activa' : 'archivada'
  }
  save(state)
  return state.lecciones
}

// Reordena una lección dentro de su propia serie (direccion: -1 sube, +1 baja).
export function moverLeccion(leccionId, direccion) {
  const state = load()
  const leccion = state.lecciones.find((l) => l.id === leccionId)
  if (!leccion) return state.lecciones

  const delaSerie = state.lecciones
    .filter((l) => l.serieId === leccion.serieId)
    .sort((a, b) => a.orden - b.orden)
  const indice = delaSerie.findIndex((l) => l.id === leccionId)
  const vecino = delaSerie[indice + direccion]
  if (!vecino) return state.lecciones

  const ordenTemporal = leccion.orden
  leccion.orden = vecino.orden
  vecino.orden = ordenTemporal
  save(state)
  return state.lecciones
}

export function getLeccionPorId(leccionId) {
  const state = load()
  return state.lecciones.find((l) => l.id === leccionId) || null
}

export function asignarLeccion({ leccionId, jovenUids, liderUid }) {
  const state = load()
  const ahora = new Date().toISOString()
  jovenUids.forEach((jovenUid) => {
    const yaExiste = state.asignaciones.some(
      (a) => a.leccionId === leccionId && a.asignadoA === jovenUid,
    )
    if (yaExiste) return
    state.asignaciones.push({
      id: `a-${Date.now()}-${jovenUid}`,
      leccionId,
      asignadoA: jovenUid,
      asignadoPor: liderUid,
      estado: 'pendiente',
      fechaAsignada: ahora,
      fechaCompletado: null,
    })
  })
  save(state)
  return state
}

export function getTablaEstado() {
  const state = load()
  return state.asignaciones
    .map((a) => ({
      ...a,
      joven: state.usuarios.find((u) => u.uid === a.asignadoA),
      leccion: state.lecciones.find((l) => l.id === a.leccionId),
    }))
    .sort((a, b) => (a.joven?.nombre || '').localeCompare(b.joven?.nombre || ''))
}

export const NIVELES_INSIGNIA = NIVELES

export function getMostrarElegibilidadAJovenes() {
  const state = load()
  return state.mostrarElegibilidadAJovenes
}

export function setMostrarElegibilidadAJovenes(valor) {
  const state = load()
  state.mostrarElegibilidadAJovenes = valor
  save(state)
  return state.mostrarElegibilidadAJovenes
}

export function getRequisitos() {
  const state = load()
  return state.requisitos
}

export function toggleRequisito({ track, leccionId }) {
  const state = load()
  const lista = state.requisitos[track] || []
  state.requisitos[track] = lista.includes(leccionId)
    ? lista.filter((id) => id !== leccionId)
    : [...lista, leccionId]
  save(state)
  return state.requisitos
}

export function getSeries() {
  return getSeriesUnicas(getLecciones())
}

function getSeriesUnicas(lecciones) {
  const vistas = new Map()
  lecciones.forEach((l) => {
    if (!vistas.has(l.serieId)) vistas.set(l.serieId, { serieId: l.serieId, serieTitulo: l.serieTitulo })
  })
  return [...vistas.values()]
}

// Calcula todas las insignias (por cápsula, por serie, por rango) y la
// elegibilidad de voluntariado/misiones de un joven específico.
export function getInsigniasDe(uid) {
  const state = load()
  const lecciones = getLecciones()
  const asignaciones = getAsignacionesDe(uid)
  const completadasIds = new Set(
    asignaciones.filter((a) => a.estado === 'completado').map((a) => a.leccionId),
  )
  const totalCompletadas = completadasIds.size

  const porLeccion = lecciones.map((l) => ({
    id: `leccion-${l.id}`,
    nombre: l.titulo,
    icono: l.icono,
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

  const requisitos = state.requisitos
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
export function getRachaSemanas(uid) {
  const asignaciones = getAsignacionesDe(uid).filter((a) => a.estado === 'completado' && a.fechaCompletado)
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

export function getNotasDe(jovenUid) {
  const state = load()
  return state.notasLider[jovenUid] || []
}

export function agregarNota({ jovenUid, texto, liderUid }) {
  const state = load()
  if (!state.notasLider[jovenUid]) state.notasLider[jovenUid] = []
  state.notasLider[jovenUid].unshift({
    id: `nota-${Date.now()}`,
    texto,
    autorUid: liderUid,
    fecha: new Date().toISOString(),
  })
  save(state)
  return state.notasLider[jovenUid]
}

export function eliminarNota({ jovenUid, notaId }) {
  const state = load()
  state.notasLider[jovenUid] = (state.notasLider[jovenUid] || []).filter((n) => n.id !== notaId)
  save(state)
  return state.notasLider[jovenUid]
}

export function getJovenPorUid(uid) {
  const state = load()
  return state.usuarios.find((u) => u.uid === uid) || null
}

// Preguntas/comentarios que un joven deja al terminar una lección — la
// líder los ve todos juntos y puede responder desde su panel.
export function getComentariosDe(asignacionId) {
  const state = load()
  return state.comentarios[asignacionId] || []
}

export function agregarComentario({ asignacionId, jovenUid, texto }) {
  const state = load()
  if (!state.comentarios[asignacionId]) state.comentarios[asignacionId] = []
  state.comentarios[asignacionId].push({
    id: `com-${Date.now()}`,
    texto,
    autorUid: jovenUid,
    fecha: new Date().toISOString(),
    respuesta: null,
    respuestaFecha: null,
  })
  save(state)
  return state.comentarios[asignacionId]
}

export function responderComentario({ asignacionId, comentarioId, respuesta }) {
  const state = load()
  const lista = state.comentarios[asignacionId] || []
  const comentario = lista.find((c) => c.id === comentarioId)
  if (comentario) {
    comentario.respuesta = respuesta
    comentario.respuestaFecha = new Date().toISOString()
  }
  save(state)
  return lista
}

export function getComentariosPendientes() {
  const state = load()
  const pendientes = []
  Object.entries(state.comentarios).forEach(([asignacionId, lista]) => {
    lista.forEach((c) => {
      if (c.respuesta) return
      const asignacion = state.asignaciones.find((a) => a.id === asignacionId)
      const leccion = state.lecciones.find((l) => l.id === asignacion?.leccionId)
      const joven = state.usuarios.find((u) => u.uid === c.autorUid)
      pendientes.push({ asignacionId, comentario: c, leccion, joven })
    })
  })
  return pendientes.sort((a, b) => new Date(b.comentario.fecha) - new Date(a.comentario.fecha))
}

// Tareas personales — lo que la líder deja a un joven en particular después
// de una plática 1:1, sin que forme parte del currículo compartido (no suma
// a insignias ni elegibilidad, es puro seguimiento personal).
export function getTareasDe(jovenUid) {
  const state = load()
  return (state.tareasPersonales[jovenUid] || [])
    .slice()
    .sort((a, b) => new Date(b.fechaCreada) - new Date(a.fechaCreada))
}

export function asignarTareaPersonal({ jovenUid, titulo, descripcion, liderUid }) {
  const state = load()
  if (!state.tareasPersonales[jovenUid]) state.tareasPersonales[jovenUid] = []
  state.tareasPersonales[jovenUid].push({
    id: `tarea-${Date.now()}`,
    titulo,
    descripcion: descripcion || '',
    asignadaPor: liderUid,
    fechaCreada: new Date().toISOString(),
    estado: 'pendiente',
    fechaCompletada: null,
  })
  save(state)
  return getTareasDe(jovenUid)
}

export function alternarTareaPersonal({ jovenUid, tareaId }) {
  const state = load()
  const tarea = (state.tareasPersonales[jovenUid] || []).find((t) => t.id === tareaId)
  if (tarea) {
    tarea.estado = tarea.estado === 'completado' ? 'pendiente' : 'completado'
    tarea.fechaCompletada = tarea.estado === 'completado' ? new Date().toISOString() : null
  }
  save(state)
  return getTareasDe(jovenUid)
}

export function eliminarTareaPersonal({ jovenUid, tareaId }) {
  const state = load()
  state.tareasPersonales[jovenUid] = (state.tareasPersonales[jovenUid] || []).filter((t) => t.id !== tareaId)
  save(state)
  return getTareasDe(jovenUid)
}

export function getTareasPendientesTotal(jovenUid) {
  return getTareasDe(jovenUid).filter((t) => t.estado !== 'completado').length
}

export function getRankingCampamento() {
  const jovenes = getJovenes()
  return jovenes
    .map((j) => {
      const insignias = getInsigniasDe(j.uid)
      return {
        joven: j,
        totalCompletadas: insignias.totalCompletadas,
        nivelActual: insignias.nivelActual,
        racha: getRachaSemanas(j.uid),
        insigniasTotal:
          insignias.porLeccion.filter((b) => b.desbloqueada).length +
          insignias.porSerie.filter((b) => b.desbloqueada).length +
          (insignias.nivelActual ? 1 : 0),
      }
    })
    .sort((a, b) => b.totalCompletadas - a.totalCompletadas)
}

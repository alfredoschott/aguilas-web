// Sonidos cortos generados con Web Audio API — nada de archivos de audio
// que descargar, solo un par de tonos por evento. Se respeta la preferencia
// de silencio del propio dispositivo (localStorage, por-visitante).
let contexto = null

function obtenerContexto() {
  if (typeof window === 'undefined') return null
  try {
    if (!contexto) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext
      if (!AudioContextCtor) return null
      contexto = new AudioContextCtor()
    }
    if (contexto.state === 'suspended') contexto.resume()
    return contexto
  } catch {
    return null
  }
}

export function sonidosActivos() {
  try {
    return localStorage.getItem('radgen-sonidos') !== 'no'
  } catch {
    return true
  }
}

export function setSonidosActivos(valor) {
  try {
    localStorage.setItem('radgen-sonidos', valor ? 'si' : 'no')
  } catch {
    // Almacenamiento bloqueado (ventana privada, etc.) — no es crítico.
  }
}

// Cada nota es {frecuencia, inicio (segundos desde ahora), duración}. Se
// arma con osciladores simples tipo "sine"/"triangle" — nada de samples.
function reproducirNotas(notas, { tipo = 'sine', volumen = 0.08 } = {}) {
  if (!sonidosActivos()) return
  const ctx = obtenerContexto()
  if (!ctx) return

  notas.forEach(({ frecuencia, inicio, duracion }) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = tipo
    osc.frequency.value = frecuencia
    const tInicio = ctx.currentTime + inicio
    const tFin = tInicio + duracion

    gain.gain.setValueAtTime(0, tInicio)
    gain.gain.linearRampToValueAtTime(volumen, tInicio + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, tFin)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(tInicio)
    osc.stop(tFin + 0.02)
  })
}

export function sonidoCompletar() {
  reproducirNotas([{ frecuencia: 660, inicio: 0, duracion: 0.12 }, { frecuencia: 880, inicio: 0.1, duracion: 0.15 }])
}

export function sonidoReto() {
  reproducirNotas([{ frecuencia: 523, inicio: 0, duracion: 0.1 }, { frecuencia: 659, inicio: 0.08, duracion: 0.12 }])
}

export function sonidoBono() {
  reproducirNotas(
    [
      { frecuencia: 784, inicio: 0, duracion: 0.09 },
      { frecuencia: 988, inicio: 0.08, duracion: 0.09 },
      { frecuencia: 1319, inicio: 0.16, duracion: 0.2 },
    ],
    { tipo: 'triangle', volumen: 0.09 },
  )
}

export function sonidoNivel() {
  reproducirNotas(
    [
      { frecuencia: 523, inicio: 0, duracion: 0.1 },
      { frecuencia: 659, inicio: 0.1, duracion: 0.1 },
      { frecuencia: 784, inicio: 0.2, duracion: 0.1 },
      { frecuencia: 1047, inicio: 0.3, duracion: 0.3 },
    ],
    { tipo: 'triangle', volumen: 0.1 },
  )
}

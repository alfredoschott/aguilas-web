import { useEffect, useState } from 'react'

const PREFIJO = 'radgen_edu_borrador:'

function leer(clave) {
  try {
    return localStorage.getItem(PREFIJO + clave) || ''
  } catch {
    return ''
  }
}

function escribir(clave, valor) {
  try {
    if (valor) localStorage.setItem(PREFIJO + clave, valor)
    else localStorage.removeItem(PREFIJO + clave)
  } catch {
    // localStorage puede fallar (modo privado, cuota llena): el borrador
    // simplemente no persiste, sin romper el formulario.
  }
}

// Autoguarda el texto de un campo mientras se escribe, para no perderlo si
// se cierra la pestaña sin enviar. `clave` puede cambiar entre renders
// (p. ej. al cambiar de joven seleccionado) y cada una guarda su propio
// borrador de forma aislada.
export function useBorrador(clave) {
  const [valor, setValor] = useState(() => leer(clave))
  const [claveAnterior, setClaveAnterior] = useState(clave)

  // Patrón de React para "reiniciar estado cuando cambia una prop": se
  // ajusta durante el render, sin pasar por un efecto.
  if (clave !== claveAnterior) {
    setClaveAnterior(clave)
    setValor(leer(clave))
  }

  useEffect(() => {
    escribir(clave, valor)
  }, [clave, valor])

  function limpiar() {
    escribir(clave, '')
    setValor('')
  }

  return [valor, setValor, limpiar]
}

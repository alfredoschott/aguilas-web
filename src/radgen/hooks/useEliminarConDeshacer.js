import { useRef, useState } from 'react'

// Borrado optimista con ventana para deshacer: el ítem desaparece de la
// lista al toque, pero la eliminación real en el store se retrasa unos
// segundos. Si el usuario da "Deshacer" a tiempo, se cancela y el ítem
// vuelve a su posición original; si no, se confirma en el store.
//
// Importante: cada setState de aquí se llama directamente desde las
// funciones expuestas (nunca anidado dentro del updater de otro setState).
// React StrictMode invoca dos veces los updaters funcionales para detectar
// impurezas — un setState anidado dentro de otro se ejecutaría dos veces
// también, duplicando el ítem restaurado.
export default function useEliminarConDeshacer({ lista, setLista, eliminar, retrasoMs = 5000 }) {
  const [pendiente, setPendiente] = useState(null) // { item, index, mensaje }
  const timeoutRef = useRef(null)

  function confirmarPendiente(actual) {
    if (!timeoutRef.current) return
    clearTimeout(timeoutRef.current)
    timeoutRef.current = null
    if (actual) eliminar(actual.item.id)
    setPendiente(null)
  }

  function solicitar(item, mensaje) {
    confirmarPendiente(pendiente)
    const index = lista.findIndex((i) => i.id === item.id)
    setLista((prev) => prev.filter((i) => i.id !== item.id))
    setPendiente({ item, index, mensaje })
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      eliminar(item.id)
      setPendiente(null)
    }, retrasoMs)
  }

  function deshacer() {
    if (!timeoutRef.current || !pendiente) return
    clearTimeout(timeoutRef.current)
    timeoutRef.current = null
    setLista((prev) => {
      const copia = [...prev]
      copia.splice(Math.min(pendiente.index, copia.length), 0, pendiente.item)
      return copia
    })
    setPendiente(null)
  }

  return { pendiente, solicitar, deshacer }
}

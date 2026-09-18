import { useRef, useState } from 'react'

// Arrastrar para reordenar bloques con mouse o con el dedo (Pointer Events
// cubre ambos con la misma API). A diferencia de un primer intento más
// simple, aquí el bloque arrastrado sí sigue al puntero de verdad
// (translateY relativo a donde empezó el arrastre) y el arreglo real NO se
// reordena hasta soltar — mientras se arrastra solo se calcula a qué
// posición correspondería soltarlo, y los demás bloques se corren
// (translateY) para abrirle espacio. Reordenar el estado en cada
// pointermove (como en la primera versión) era lo que se sentía trabado:
// cada movimiento del dedo disparaba un re-render de toda la lista más un
// recálculo de layout.
export default function useArrastrarBloques(lista, setLista) {
  const refsRef = useRef(new Map())
  const naturalRectRef = useRef(null)
  const pointerStartYRef = useRef(0)
  const indiceOriginalRef = useRef(null)

  const [arrastrandoId, setArrastrandoId] = useState(null)
  const [offsetY, setOffsetY] = useState(0)
  const [indiceDestino, setIndiceDestino] = useState(null)

  function registrarRef(id, el) {
    if (el) refsRef.current.set(id, el)
    else refsRef.current.delete(id)
  }

  function iniciar(e, id) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const el = refsRef.current.get(id)
    if (!el) return
    naturalRectRef.current = el.getBoundingClientRect()
    pointerStartYRef.current = e.clientY
    indiceOriginalRef.current = lista.findIndex((b) => b.id === id)
    setArrastrandoId(id)
    setOffsetY(0)
    setIndiceDestino(indiceOriginalRef.current)
  }

  function mover(e) {
    if (!arrastrandoId || !naturalRectRef.current) return
    const delta = e.clientY - pointerStartYRef.current
    setOffsetY(delta)

    const centroVisual = naturalRectRef.current.top + naturalRectRef.current.height / 2 + delta

    let idCercano = null
    let distMin = Infinity
    refsRef.current.forEach((el, id) => {
      if (id === arrastrandoId) return
      const rect = el.getBoundingClientRect()
      const centro = rect.top + rect.height / 2
      const distancia = Math.abs(centroVisual - centro)
      if (distancia < distMin) {
        distMin = distancia
        idCercano = id
      }
    })

    if (idCercano) {
      const indice = lista.findIndex((b) => b.id === idCercano)
      if (indice !== -1) setIndiceDestino(indice)
    }
  }

  function terminar() {
    if (arrastrandoId && indiceDestino !== null && indiceDestino !== indiceOriginalRef.current) {
      setLista((prev) => {
        const i = prev.findIndex((b) => b.id === arrastrandoId)
        if (i === -1) return prev
        const copia = [...prev]
        const [item] = copia.splice(i, 1)
        copia.splice(indiceDestino, 0, item)
        return copia
      })
    }
    setArrastrandoId(null)
    setOffsetY(0)
    setIndiceDestino(null)
    naturalRectRef.current = null
    indiceOriginalRef.current = null
  }

  // Cuánto debe correrse (arriba o abajo) un bloque que NO se está
  // arrastrando, para abrirle espacio al que sí se arrastra en la posición
  // donde se soltaría ahora mismo.
  function calcularDesplazamiento(id, indice) {
    if (!arrastrandoId || id === arrastrandoId || indiceDestino === null) return 0
    const origen = indiceOriginalRef.current
    const alto = (naturalRectRef.current?.height || 0) + 14 // 14 = margin-bottom de .re-bloque
    if (indiceDestino > origen && indice > origen && indice <= indiceDestino) return -alto
    if (indiceDestino < origen && indice >= indiceDestino && indice < origen) return alto
    return 0
  }

  return {
    arrastrandoId,
    offsetY,
    registrarRef,
    iniciar,
    mover,
    terminar,
    calcularDesplazamiento,
  }
}

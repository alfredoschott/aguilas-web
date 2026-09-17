// Un subconjunto mínimo de Markdown (**negrita**, *cursiva*, saltos de
// línea) — lo justo para que la líder pueda dar énfasis al escribir una
// lección, sin necesitar un editor de texto enriquecido de verdad ni
// guardar HTML (que traería riesgo de inyección) en Firestore.

function parsearLinea(linea, keyBase) {
  const partes = []
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let ultimoIndice = 0
  let match
  let i = 0
  while ((match = regex.exec(linea))) {
    if (match.index > ultimoIndice) partes.push(linea.slice(ultimoIndice, match.index))
    if (match[1] !== undefined) {
      partes.push(<strong key={`${keyBase}-${i}`}>{match[1]}</strong>)
    } else {
      partes.push(<em key={`${keyBase}-${i}`}>{match[2]}</em>)
    }
    ultimoIndice = regex.lastIndex
    i += 1
  }
  if (ultimoIndice < linea.length) partes.push(linea.slice(ultimoIndice))
  return partes
}

// Para mostrar en pantalla: convierte el texto guardado a nodos de React,
// con <br/> por cada salto de línea que la líder haya metido a propósito.
export function renderTextoFormateado(texto) {
  if (!texto) return null
  const lineas = texto.split('\n')
  return lineas.map((linea, li) => (
    <span key={li}>
      {parsearLinea(linea, li)}
      {li < lineas.length - 1 && <br />}
    </span>
  ))
}

// Para contextos de una sola línea (previews truncados, certificados,
// avisos del navegador) donde los asteriscos de Markdown se verían como
// texto roto en vez de renderizarse.
export function textoPlano(texto) {
  if (!texto) return ''
  return texto.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/\n+/g, ' ')
}

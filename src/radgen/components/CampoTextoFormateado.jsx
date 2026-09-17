import { useRef } from 'react'

// Envuelve (o desenvuelve, si ya estaba envuelto) la selección actual con un
// marcador de Markdown — sin selección, inserta el par de marcadores y dejar
// el cursor en medio, para poder escribir directo en negrita/cursiva.
function aplicarMarcador(valor, inicio, fin, marcador) {
  const seleccion = valor.slice(inicio, fin)
  const yaEnvuelto =
    seleccion.length >= marcador.length * 2 && seleccion.startsWith(marcador) && seleccion.endsWith(marcador)

  if (yaEnvuelto) {
    const sinMarcador = seleccion.slice(marcador.length, seleccion.length - marcador.length)
    return {
      texto: valor.slice(0, inicio) + sinMarcador + valor.slice(fin),
      cursorInicio: inicio,
      cursorFin: fin - marcador.length * 2,
    }
  }

  return {
    texto: valor.slice(0, inicio) + marcador + seleccion + marcador + valor.slice(fin),
    cursorInicio: inicio + marcador.length,
    cursorFin: fin + marcador.length,
  }
}

// Un <textarea> con negrita/cursiva rápidas — nada de HTML ni un editor de
// texto enriquecido de verdad, solo Markdown mínimo que luego se interpreta
// al mostrarlo (ver utils/formatoTexto).
export default function CampoTextoFormateado({ value, onChange, rows = 3, placeholder }) {
  const ref = useRef(null)

  function aplicar(marcador) {
    const el = ref.current
    if (!el) return
    const { selectionStart, selectionEnd } = el
    const { texto, cursorInicio, cursorFin } = aplicarMarcador(value, selectionStart, selectionEnd, marcador)
    onChange(texto)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(cursorInicio, cursorFin)
    })
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div className="re-formato-barra">
        <button type="button" className="re-formato-btn" title="Negrita" onClick={() => aplicar('**')}>
          <strong>N</strong>
        </button>
        <button type="button" className="re-formato-btn" title="Cursiva" onClick={() => aplicar('*')}>
          <em>C</em>
        </button>
        <span className="re-formato-ayuda">Selecciona texto y toca N o C — Enter para un salto de línea.</span>
      </div>
      <textarea
        ref={ref}
        className="re-input"
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ resize: 'vertical', fontFamily: 'inherit', marginBottom: 0 }}
      />
    </div>
  )
}

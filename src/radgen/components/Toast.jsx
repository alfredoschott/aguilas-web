// Aviso flotante para el patrón "Eliminado — Deshacer".
export default function Toast({ mensaje, onDeshacer }) {
  if (!mensaje) return null

  return (
    <div className="re-toast" role="status">
      <span>{mensaje}</span>
      <button type="button" className="re-toast__deshacer" onClick={onDeshacer}>
        Deshacer
      </button>
    </div>
  )
}

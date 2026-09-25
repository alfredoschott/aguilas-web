// Una tarea individual que la líder deja a un joven fuera del currículo
// (por ejemplo, después de una plática 1:1). onEliminar es opcional: el
// joven solo puede marcarla como hecha, la líder también puede borrarla.
// Sin onToggle se muestra de solo lectura (vista de supervisión).
export default function TareaPersonal({ tarea, onToggle, onEliminar }) {
  const completada = tarea.estado === 'completado'

  return (
    <div className="re-tarea">
      {onToggle ? (
        <button
          type="button"
          className={`re-tarea__check ${completada ? 'activo' : ''}`}
          onClick={() => onToggle(tarea.id)}
          aria-label={completada ? 'Marcar como pendiente' : 'Marcar como hecha'}
        >
          {completada ? '✔' : ''}
        </button>
      ) : (
        <span className={`re-tarea__check ${completada ? 'activo' : ''}`} aria-label={completada ? 'Hecha' : 'Pendiente'}>
          {completada ? '✔' : ''}
        </span>
      )}
      <div className="re-tarea__cuerpo">
        <p className="re-tarea__titulo" style={{ textDecoration: completada ? 'line-through' : 'none' }}>
          {tarea.titulo}
        </p>
        {tarea.descripcion && <p className="re-tarea__descripcion">{tarea.descripcion}</p>}
        {onEliminar && (
          <button className="re-vinculo re-vinculo--peligro" style={{ marginTop: 6 }} onClick={() => onEliminar(tarea.id)}>
            Eliminar
          </button>
        )}
      </div>
    </div>
  )
}

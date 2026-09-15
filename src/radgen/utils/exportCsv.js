// Exporta la tabla de estado a un CSV descargable — útil para compartir
// con otros líderes o guardar un respaldo antes del campamento.
function celda(valor) {
  return `"${String(valor ?? '').replace(/"/g, '""')}"`
}

export function exportarEstadoCsv(tabla) {
  const encabezados = ['Joven', 'Lección', 'Estado', 'Fecha asignada', 'Fecha completada', 'Quiz']
  const filas = tabla.map((f) => [
    f.joven?.nombre,
    f.leccion?.titulo,
    f.estado === 'completado' ? 'Completado' : 'Pendiente',
    new Date(f.fechaAsignada).toLocaleDateString('es-MX'),
    f.fechaCompletado ? new Date(f.fechaCompletado).toLocaleDateString('es-MX') : '',
    f.quizScore ? `${f.quizScore.correctas}/${f.quizScore.total}` : '',
  ])

  const csv = [encabezados, ...filas].map((fila) => fila.map(celda).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `radgen-education-estado-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}

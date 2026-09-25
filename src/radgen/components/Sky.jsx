import skySaludando from '../../assets/sky-saludando.webp'
import skyEstudiando from '../../assets/sky-estudiando.webp'
import skyCaminando from '../../assets/sky-caminando.webp'
import skyRelajado from '../../assets/sky-relajado.webp'
import skyLogrado from '../../assets/sky-logrado.webp'

// Sky, la mascota de RadGen. Cinco artes reales, una por pose. Se usa
// chica y en flujo normal del documento (nunca posicionada encima del
// contenido) para no competir con el texto ni la funcionalidad.
const POSES = {
  saludando: { src: skySaludando, animacion: 're-sky--flotar' }, // saludo, bienvenida
  estudiando: { src: skyEstudiando, animacion: 're-sky--flotar' }, // leyendo/tomando notas
  caminando: { src: skyCaminando, animacion: 're-sky--flotar' }, // en camino, progreso
  relajado: { src: skyRelajado, animacion: 're-sky--flotar-lento' }, // laptop, panel de líder
  logrado: { src: skyLogrado, animacion: 're-sky--celebrar' }, // puño en alto, logro
}

export default function Sky({ size = 56, pose = 'saludando', mensaje, animado = true, className = '' }) {
  const { src, animacion } = POSES[pose] || POSES.saludando
  return (
    <div className={`re-sky-wrap ${className}`}>
      {mensaje && <div className="re-burbuja">{mensaje}</div>}
      <img
        src={src}
        alt="Sky, la mascota de RadGen"
        className={`re-sky ${animado ? animacion : ''}`}
        style={{ height: size, width: 'auto', flexShrink: 0 }}
      />
    </div>
  )
}

const COLORES = ['#3a7bff', '#8fb4ff', '#FF3B3B', '#F5F3EE']
const COLORES_DORADO = ['#f0c14b', '#cf9a2e', '#3a7bff', '#FF3B3B', '#F5F3EE']

function pieza(i, colores) {
  const izquierda = Math.random() * 100
  const retraso = Math.random() * 0.4
  const duracion = 1.6 + Math.random() * 1.2
  const rotacionFinal = 360 + Math.random() * 360
  const color = colores[i % colores.length]
  const ancho = 6 + Math.random() * 6
  return (
    <span
      key={i}
      className="re-confeti__pieza"
      style={{
        left: `${izquierda}%`,
        backgroundColor: color,
        width: ancho,
        height: ancho * 1.6,
        animationDelay: `${retraso}s`,
        animationDuration: `${duracion}s`,
        '--rot-final': `${rotacionFinal}deg`,
      }}
    />
  )
}

// `dorado` suma tonos dorados a la mezcla — para el momento de subir de
// rango, que merece verse más grande que desbloquear una cápsula cualquiera.
// `contenida` la ancla al contenedor con position:relative más cercano en
// vez de a toda la pantalla — para ráfagas chicas, como acertar una
// pregunta del quiz, que no deben tapar el resto de la página.
export default function Confetti({ piezas = 26, dorado = false, contenida = false }) {
  const colores = dorado ? COLORES_DORADO : COLORES
  return (
    <div className={`re-confeti ${contenida ? 're-confeti--contenida' : ''}`} aria-hidden="true">
      {Array.from({ length: piezas }, (_, i) => pieza(i, colores))}
    </div>
  )
}

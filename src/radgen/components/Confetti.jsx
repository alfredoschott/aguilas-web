const COLORES = ['#3a7bff', '#8fb4ff', '#FF3B3B', '#F5F3EE']

function pieza(i) {
  const izquierda = Math.random() * 100
  const retraso = Math.random() * 0.4
  const duracion = 1.6 + Math.random() * 1.2
  const rotacionFinal = 360 + Math.random() * 360
  const color = COLORES[i % COLORES.length]
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

export default function Confetti({ piezas = 26 }) {
  return (
    <div className="re-confeti" aria-hidden="true">
      {Array.from({ length: piezas }, (_, i) => pieza(i))}
    </div>
  )
}

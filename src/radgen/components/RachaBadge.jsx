// Insignia de racha que escala visualmente con las semanas seguidas — un
// 2 se ve como un logro chico, un 8+ se siente como un logro de verdad.
function tierDe(semanas) {
  if (semanas >= 8) return 4
  if (semanas >= 5) return 3
  if (semanas >= 3) return 2
  return 1
}

export default function RachaBadge({ semanas, size = 'normal' }) {
  if (!semanas || semanas <= 0) return null
  const tier = tierDe(semanas)

  return (
    <div className={`re-racha re-racha--t${tier} re-racha--${size}`}>
      <span className="re-racha__llama" aria-hidden="true">🔥</span>
      {semanas} semana{semanas === 1 ? '' : 's'} seguida{semanas === 1 ? '' : 's'}
    </div>
  )
}

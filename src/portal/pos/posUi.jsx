// Piezas visuales del POS: contadores animados, avatares, gráficas SVG.
import { useEffect, useState } from 'react'
import { dinero } from './posUtils'
import { useCountUp, colorDe, iniciales } from './posUiHelpers'

export function Dinero({ valor, decimales = false }) {
  const v = useCountUp(valor)
  return <>{dinero(decimales ? v : Math.round(v))}</>
}
export function Cantidad({ valor }) {
  const v = useCountUp(valor, 500)
  return <>{Math.round(v)}</>
}

export function Avatar({ nombre, size = 38 }) {
  const c = colorDe(nombre)
  return (
    <span className="pos-avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: `color-mix(in srgb, ${c} 22%, #141414)`, color: c, borderColor: `color-mix(in srgb, ${c} 45%, transparent)` }}>
      {iniciales(nombre)}
    </span>
  )
}

// Barra apilada efectivo / transferencia / por cobrar.
export function BarraEstado({ efectivo, transferencia, pendiente, leyenda = true }) {
  const total = efectivo + transferencia + pendiente
  const pct = (v) => (total > 0 ? (v / total) * 100 : 0)
  return (
    <div>
      <div className="pos-barra" role="img" aria-label={`Efectivo ${dinero(efectivo)}, transferencia ${dinero(transferencia)}, por cobrar ${dinero(pendiente)}`}>
        <span className="pos-barra-seg" style={{ width: `${pct(efectivo)}%`, background: 'var(--pos-ef)' }} />
        <span className="pos-barra-seg" style={{ width: `${pct(transferencia)}%`, background: 'var(--pos-tr)' }} />
        <span className="pos-barra-seg" style={{ width: `${pct(pendiente)}%`, background: 'var(--pos-pe)' }} />
      </div>
      {leyenda && (
        <div className="pos-leyenda">
          <span><i style={{ background: 'var(--pos-ef)' }} />Efectivo {dinero(efectivo)}</span>
          <span><i style={{ background: 'var(--pos-tr)' }} />Transferencia {dinero(transferencia)}</span>
          <span><i style={{ background: 'var(--pos-pe)' }} />Por cobrar {dinero(pendiente)}</span>
        </div>
      )}
    </div>
  )
}

// Anillo de progreso (porcentaje cobrado).
export function Anillo({ pct, size = 112, grosor = 11, children }) {
  const r = (size - grosor) / 2
  const c = 2 * Math.PI * r
  const [dibujado, setDibujado] = useState(0)
  useEffect(() => { const t = setTimeout(() => setDibujado(pct), 60); return () => clearTimeout(t) }, [pct])
  return (
    <div className="pos-anillo" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--portal-card-border)" strokeWidth={grosor} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--pos-accent)" strokeWidth={grosor} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, dibujado))} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="pos-anillo-centro">{children}</div>
    </div>
  )
}

// Dona con segmentos; el centro es libre.
export function Dona({ segmentos, size = 170, grosor = 22, children }) {
  const total = segmentos.reduce((a, s) => a + s.valor, 0)
  const r = (size - grosor) / 2
  const c = 2 * Math.PI * r
  const [listo, setListo] = useState(false)
  useEffect(() => { const t = setTimeout(() => setListo(true), 60); return () => clearTimeout(t) }, [])
  let acumulado = 0
  return (
    <div className="pos-anillo" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--portal-card-border)" strokeWidth={grosor} />
        {total > 0 && segmentos.map((s) => {
          const largo = (s.valor / total) * c
          const el = (
            <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={grosor}
              strokeDasharray={`${listo ? Math.max(largo - 2, 0) : 0} ${c}`} strokeDashoffset={-acumulado}
              transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.2,.8,.2,1)' }} />
          )
          acumulado += largo
          return el
        })}
      </svg>
      <div className="pos-anillo-centro">{children}</div>
    </div>
  )
}

// Barras de las últimas ventas: cobrado (color del ministerio) + por cobrar (ámbar).
export function GraficaVentas({ filas }) {
  const [activa, setActiva] = useState(null)
  const [listo, setListo] = useState(false)
  useEffect(() => { const t = setTimeout(() => setListo(true), 80); return () => clearTimeout(t) }, [])
  const max = Math.max(1, ...filas.map((f) => f.cobrado + f.pendiente))
  return (
    <div className="pos-grafica" onMouseLeave={() => setActiva(null)}>
      {filas.map((f, i) => {
        const alto = ((f.cobrado + f.pendiente) / max) * 100
        const hCob = f.cobrado + f.pendiente > 0 ? (f.cobrado / (f.cobrado + f.pendiente)) * 100 : 0
        const ultima = i === filas.length - 1
        return (
          <button key={f.id} type="button" className="pos-grafica-col" data-activa={activa === i} onMouseEnter={() => setActiva(i)} onFocus={() => setActiva(i)} onBlur={() => setActiva(null)}
            aria-label={`${f.etiqueta}: ${dinero(f.cobrado + f.pendiente)}`}>
            {activa === i && <span className="pos-grafica-tip"><strong>{dinero(f.cobrado + f.pendiente)}</strong><small>{f.pedidos} pedidos</small></span>}
            <span className="pos-grafica-barra" style={{ height: listo ? `${Math.max(alto, 3)}%` : '0%', transitionDelay: `${i * 60}ms`, opacity: ultima || activa === i ? 1 : 0.62 }}>
              <span className="pos-grafica-pend" style={{ height: `${100 - hCob}%` }} />
            </span>
            <span className="pos-grafica-etiq">{f.etiqueta}</span>
          </button>
        )
      })}
    </div>
  )
}

export function CheckAnimado({ size = 84 }) {
  return (
    <svg className="pos-check" width={size} height={size} viewBox="0 0 52 52" aria-hidden="true">
      <circle className="pos-check-circulo" cx="26" cy="26" r="24" fill="none" />
      <path className="pos-check-palomita" fill="none" d="M15 27l8 8 14-16" />
    </svg>
  )
}

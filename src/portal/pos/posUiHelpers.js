import { useEffect, useRef, useState } from 'react'
import { UtensilsCrossed, CupSoda, IceCreamCone, Package, PackagePlus } from 'lucide-react'
import { normalizar } from './posUtils'

export const reducirMovimiento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Anima un número desde su valor anterior hasta el nuevo.
export function useCountUp(objetivo, ms = 700) {
  const [valor, setValor] = useState(objetivo)
  const desde = useRef(objetivo)
  const reducido = reducirMovimiento()
  useEffect(() => {
    if (reducido) return undefined
    const inicio = performance.now()
    const origen = desde.current
    let raf
    const paso = (t) => {
      const p = Math.min(1, (t - inicio) / ms)
      const e = 1 - (1 - p) ** 3
      const v = origen + (objetivo - origen) * e
      desde.current = v
      setValor(v)
      if (p < 1) raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [objetivo, ms, reducido])
  return reducido ? objetivo : valor
}

const PALETA = ['#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#10B981', '#3B82F6', '#EF4444', '#84CC16']
export function colorDe(texto) {
  let h = 0
  for (const c of normalizar(texto)) h = (h * 31 + c.charCodeAt(0)) % 997
  return PALETA[h % PALETA.length]
}
export function iniciales(nombre) {
  const p = (nombre || '?').trim().split(/\s+/)
  return ((p[0]?.[0] || '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}
export function categoriaInfo(categoria) {
  const n = normalizar(categoria)
  if (n.includes('combo') || n.includes('paquete') || n.includes('promo')) return { Icono: PackagePlus, color: '#A78BFA' }
  if (n.includes('comida') || n.includes('plat') || n.includes('antojit')) return { Icono: UtensilsCrossed, color: '#F59E0B' }
  if (n.includes('beb')) return { Icono: CupSoda, color: '#38BDF8' }
  if (n.includes('postre') || n.includes('dulce')) return { Icono: IceCreamCone, color: '#F472B6' }
  return { Icono: Package, color: '#A3A3A3' }
}


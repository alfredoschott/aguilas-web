// El mismo código sirve dos sitios: la iglesia (aguilascfctizayuca.com) y
// RadGen (radgenmx.com). Aquí se decide cuál es el actual según el dominio
// y se arman los enlaces entre uno y otro.
//
//   radgen  → radgenmx.com (y radgen.localhost en desarrollo)
//   iglesia → aguilascfctizayuca.com
//   todo    → localhost, previews de Vercel, etc.: se sirve todo junto
export const URL_IGLESIA = 'https://www.aguilascfctizayuca.com'
export const URL_RADGEN_SITIO = 'https://radgenmx.com'

function dominio() {
  return typeof window === 'undefined' ? '' : window.location.hostname
}

export function modoSitio() {
  const h = dominio()
  if (/(^|\.)radgenmx\.com$/.test(h) || h.startsWith('radgen.')) return 'radgen'
  if (/(^|\.)aguilascfctizayuca\.com$/.test(h)) return 'iglesia'
  return 'todo'
}

// Página de presentación de RadGen.
export function urlRadgen() {
  const modo = modoSitio()
  if (modo === 'radgen') return '/'
  if (modo === 'iglesia') return `${URL_RADGEN_SITIO}/`
  return '/radgen'
}

// RadGen Education (la plataforma). `sub` empieza con "/" (ej. "/lider").
export function urlEducation(sub = '') {
  return `${modoSitio() === 'iglesia' ? URL_RADGEN_SITIO : ''}/education${sub}`
}

// Sitio de la iglesia.
export function urlIglesia() {
  return modoSitio() === 'radgen' ? `${URL_IGLESIA}/` : '/'
}

export const esExterna = (url) => /^https?:\/\//.test(url)

export const TITULO_RADGEN = 'RadGen MX | Una generación con identidad y propósito'
export const TITULO_EDUCATION = 'RadGen Education | RadGen MX'
const DESCRIPCION_RADGEN =
  'RadGen es el ministerio de jóvenes de Águilas CFC Tizayuca: fe real, amigos de verdad y un propósito que vale la pena. Conoce RadGen Education, la plataforma para crecer en tu fe.'

function etiqueta(selector, crear) {
  let el = document.querySelector(selector)
  if (!el && crear) {
    el = document.createElement(crear.tag)
    Object.entries(crear.attrs).forEach(([k, v]) => el.setAttribute(k, v))
    document.head.appendChild(el)
  }
  return el
}

// Lo que se ve en la pestaña del navegador (ícono, color, nombre al guardarlo
// en la pantalla de inicio) cuando se entra por radgenmx.com.
export function aplicarIdentidadRadgen() {
  if (modoSitio() !== 'radgen') return
  document.title = TITULO_RADGEN
  document.querySelectorAll('link[rel="icon"]').forEach((l) => l.remove())
  const icono = document.createElement('link')
  icono.rel = 'icon'
  icono.type = 'image/png'
  icono.href = '/radgen-favicon.png'
  document.head.appendChild(icono)
  etiqueta('link[rel="apple-touch-icon"]', { tag: 'link', attrs: { rel: 'apple-touch-icon' } })?.setAttribute('href', '/radgen-apple-touch.png')
  etiqueta('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', 'RadGen')
  etiqueta('meta[name="theme-color"]')?.setAttribute('content', '#0f0f12')
  etiqueta('meta[name="description"]')?.setAttribute('content', DESCRIPCION_RADGEN)
  document.querySelector('script[type="application/ld+json"]')?.remove()
}

// Título de la pestaña según la pantalla (solo en radgenmx.com).
export function tituloRadgenPara(pathname) {
  if (modoSitio() !== 'radgen') return null
  if (pathname.startsWith('/education')) return TITULO_EDUCATION
  if (pathname === '/') return TITULO_RADGEN
  return null
}

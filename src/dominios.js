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

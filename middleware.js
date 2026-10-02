export const config = {
  matcher: ['/'],
}

// Meta tags específicas por ruta. Se usan para que WhatsApp/Instagram/Facebook
// (que no ejecutan JS y solo leen el HTML crudo) muestren la previsualización
// correcta en vez de la de la página principal (la iglesia).
const META_RADGEN = {
  title: 'RadGen MX | Una generación con identidad y propósito',
  description:
    'RadGen es el ministerio de jóvenes de Águilas CFC Tizayuca: fe real, amigos de verdad y un propósito que vale la pena. Conoce RadGen Education, la plataforma para crecer en tu fe.',
  image: 'https://radgenmx.com/radgen-og.jpg',
  imageWidth: '1200',
  imageHeight: '630',
  url: 'https://radgenmx.com/',
}

// RadGen vive en radgenmx.com; la raíz de ese dominio es su presentación.
// La raíz de aguilascfctizayuca.com (la iglesia) no se toca.
const esDominioRadgen = (host) => /(^|\.)radgenmx\.com$/.test(host)

const JSON_LD_RADGEN = {"@context": "https://schema.org", "@graph": [{"@type": "WebSite", "@id": "https://radgenmx.com/#sitio", "url": "https://radgenmx.com/", "name": "RadGen MX", "alternateName": ["RadGen", "RadGen Education"], "inLanguage": "es-MX"}, {"@type": "Organization", "@id": "https://radgenmx.com/#organizacion", "name": "RadGen MX", "alternateName": "RadGen", "url": "https://radgenmx.com/", "logo": "https://radgenmx.com/radgen-icon-512.png", "image": "https://radgenmx.com/radgen-og.jpg", "description": "Ministerio de jóvenes de Águilas CFC Tizayuca, Hidalgo, México.", "parentOrganization": {"@type": "Church", "name": "Águilas Centro Familiar Cristiano Tizayuca", "url": "https://www.aguilascfctizayuca.com/"}, "sameAs": ["https://www.instagram.com/radgen.mx/"]}]}

const escapar = (t) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// Cambia el atributo content de la etiqueta <meta> cuyo name/property es `clave`.
function poner(html, atributo, clave, valor) {
  const etiqueta = new RegExp(`(<meta\\s+${atributo}="${clave}"\\s+content=")[^"]*(")`)
  return html.replace(etiqueta, (_, a, b) => `${a}${escapar(valor)}${b}`)
}

function aplicarMeta(html, meta) {
  const { title, description, image, imageWidth, imageHeight, url } = meta
  let salida = html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapar(title)}</title>`)
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, (_, a, b) => `${a}${url}${b}`)
  salida = poner(salida, 'name', 'description', description)
  salida = poner(salida, 'name', 'twitter:title', title)
  salida = poner(salida, 'name', 'twitter:description', description)
  salida = poner(salida, 'name', 'twitter:image', image)
  salida = poner(salida, 'property', 'og:title', title)
  salida = poner(salida, 'property', 'og:description', description)
  salida = poner(salida, 'property', 'og:image', image)
  salida = poner(salida, 'property', 'og:image:width', imageWidth)
  salida = poner(salida, 'property', 'og:image:height', imageHeight)
  salida = poner(salida, 'property', 'og:url', url)
  salida = poner(salida, 'name', 'apple-mobile-web-app-title', 'RadGen')
  salida = poner(salida, 'name', 'theme-color', '#0f0f12')
  return salida
    .replace(/<link rel="icon"[^>]*>/, '<link rel="icon" type="image/png" href="/radgen-favicon.png" />')
    .replace(/<link rel="apple-touch-icon"[^>]*>/, '<link rel="apple-touch-icon" href="/radgen-apple-touch.png" />')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${JSON.stringify(JSON_LD_RADGEN)}</script>`)
}

// Esto es puramente cosmético (mejora cómo se ve el link al compartirlo) —
// nunca debe poder tumbar la página real. Si algo falla aquí (el fetch
// interno a /index.html, lo que sea), se deja pasar la petición normal en
// vez de responder con un error.
export default async function middleware(request) {
  try {
    const { pathname, hostname } = new URL(request.url)
    if (!esDominioRadgen(hostname) || pathname !== '/') return

    const response = await fetch(new URL('/index.html', request.url))
    if (!response.ok) return

    const html = aplicarMeta(await response.text(), META_RADGEN)
    return new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' },
    })
  } catch {
    return
  }
}

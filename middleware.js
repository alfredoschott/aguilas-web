export const config = {
  matcher: ['/', '/radgen'],
}

// Meta tags específicas por ruta. Se usan para que WhatsApp/Instagram/Facebook
// (que no ejecutan JS y solo leen el HTML crudo) muestren la previsualización
// correcta en vez de la de la página principal (la iglesia).
const META_RADGEN = {
    title: 'RadGen Education | Águilas CFC Tizayuca',
    description:
      'Plataforma de discipulado gamificado para los jóvenes de Águilas CFC: misiones, insignias y niveles para crecer en la fe.',
    image: 'https://radgenmx.com/radgen-education-logo.png',
    imageWidth: '900',
    imageHeight: '900',
    url: 'https://radgenmx.com/',
}

// RadGen vive en radgenmx.com; la raíz de ese dominio es su presentación.
// La raíz de aguilascfctizayuca.com (la iglesia) no se toca.
const esDominioRadgen = (host) => /(^|\.)radgenmx\.com$/.test(host)

class MetaRewriter {
  constructor(meta) {
    this.meta = meta
  }

  element(element) {
    const { title, description, image, imageWidth, imageHeight, url } = this.meta

    switch (element.tagName) {
      case 'title':
        element.setInnerContent(title)
        break
      case 'link':
        if (element.getAttribute('rel') === 'canonical') {
          element.setAttribute('href', url)
        }
        break
      case 'meta': {
        const name = element.getAttribute('name')
        const property = element.getAttribute('property')

        if (name === 'description') element.setAttribute('content', description)
        if (name === 'twitter:title') element.setAttribute('content', title)
        if (name === 'twitter:description') element.setAttribute('content', description)
        if (name === 'twitter:image') element.setAttribute('content', image)

        if (property === 'og:title') element.setAttribute('content', title)
        if (property === 'og:description') element.setAttribute('content', description)
        if (property === 'og:image') element.setAttribute('content', image)
        if (property === 'og:image:width') element.setAttribute('content', imageWidth)
        if (property === 'og:image:height') element.setAttribute('content', imageHeight)
        if (property === 'og:url') element.setAttribute('content', url)
        break
      }
    }
  }
}

// Esto es puramente cosmético (mejora cómo se ve el link al compartirlo) —
// nunca debe poder tumbar la página real. Si algo falla aquí (el fetch
// interno a /index.html, HTMLRewriter, lo que sea), se deja pasar la
// petición normal en vez de responder con un error.
export default async function middleware(request) {
  try {
    const { pathname, hostname } = new URL(request.url)
    if (!esDominioRadgen(hostname) || pathname !== '/') return
    const meta = META_RADGEN

    const response = await fetch(new URL('/index.html', request.url))
    if (!response.ok) return

    const rewriter = new HTMLRewriter()
      .on('title', new MetaRewriter(meta))
      .on('link', new MetaRewriter(meta))
      .on('meta', new MetaRewriter(meta))

    return rewriter.transform(response)
  } catch {
    return
  }
}

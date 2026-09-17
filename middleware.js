export const config = {
  matcher: ['/radgen'],
}

// Meta tags específicas por ruta. Se usan para que WhatsApp/Instagram/Facebook
// (que no ejecutan JS y solo leen el HTML crudo) muestren la previsualización
// correcta en vez de la de la página principal (la iglesia).
const ROUTE_META = {
  '/radgen': {
    title: 'RadGen Education | Águilas CFC Tizayuca',
    description:
      'Plataforma de discipulado gamificado para los jóvenes de Águilas CFC: misiones, insignias y niveles para crecer en la fe.',
    image: 'https://www.aguilascfctizayuca.com/radgen-education-logo.png',
    imageWidth: '900',
    imageHeight: '900',
    url: 'https://www.aguilascfctizayuca.com/radgen',
  },
}

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

export default async function middleware(request) {
  const { pathname } = new URL(request.url)
  const meta = ROUTE_META[pathname]
  if (!meta) return

  const response = await fetch(new URL('/index.html', request.url))
  const rewriter = new HTMLRewriter()
    .on('title', new MetaRewriter(meta))
    .on('link', new MetaRewriter(meta))
    .on('meta', new MetaRewriter(meta))

  return rewriter.transform(response)
}

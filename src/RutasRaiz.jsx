import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { modoSitio, tituloRadgenPara, URL_RADGEN_SITIO } from './dominios'

// Cada mitad del sitio se descarga solo cuando se visita: quien entra a
// RadGen Education no baja el sitio de la iglesia ni el portal, y viceversa.
const App = lazy(() => import('./App.jsx'))
const RadGen = lazy(() => import('./pages/RadGen'))
const RadgenEducationApp = lazy(() => import('./radgen/RadgenEducationApp.jsx'))

// Enlaces viejos (/radgen/education/...) → la ruta nueva /education/...
function RutaVieja() {
  const { pathname, search, hash } = useLocation()
  return <Navigate to={pathname.replace(/^\/radgen\/education/, '/education') + search + hash} replace />
}

// En el dominio de la iglesia, RadGen vive en radgenmx.com. (Vercel ya
// redirige en el servidor; esto cubre lo que se escape.)
function IrARadgen() {
  const { pathname, search, hash } = useLocation()
  useEffect(() => {
    const ruta = pathname.replace(/^\/radgen(?=\/education)/, '').replace(/^\/radgen$/, '/')
    window.location.replace(URL_RADGEN_SITIO + ruta + search + hash)
  }, [pathname, search, hash])
  return null
}

export default function RutasRaiz() {
  const modo = modoSitio()
  const { pathname } = useLocation()

  useEffect(() => {
    const titulo = tituloRadgenPara(pathname)
    if (titulo) document.title = titulo
  }, [pathname])

  return (
    <Suspense fallback={null}>
      <Routes>
        {modo === 'iglesia' ? (
          <>
            <Route path="/education/*" element={<IrARadgen />} />
            <Route path="/radgen/*" element={<IrARadgen />} />
          </>
        ) : (
          <>
            <Route path="/education/*" element={<RadgenEducationApp />} />
            <Route path="/radgen/education/*" element={<RutaVieja />} />
          </>
        )}
        {modo === 'radgen' && (
          <>
            <Route path="/" element={<RadGen />} />
            <Route path="/radgen" element={<Navigate to="/" replace />} />
          </>
        )}
        <Route path="/*" element={<App />} />
      </Routes>
    </Suspense>
  )
}

import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'

// Cada mitad del sitio se descarga solo cuando se visita: quien entra a
// RadGen Education no baja el sitio de la iglesia ni el portal, y viceversa.
const App = lazy(() => import('./App.jsx'))
const RadgenEducationApp = lazy(() => import('./radgen/RadgenEducationApp.jsx'))

export default function RutasRaiz() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/radgen/education/*" element={<RadgenEducationApp />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </Suspense>
  )
}

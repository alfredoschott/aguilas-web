import { Suspense, lazy } from 'react'
import { Routes, Route, Outlet } from 'react-router-dom'
import PaginaPrincipal from './pages/PaginaPrincipal'
import { PortalAuthProvider } from './portal/PortalAuthContext'
import ProtectedRoute from './portal/ProtectedRoute'

// La página principal va directo (es la entrada más común); todo lo demás
// se descarga hasta que alguien lo visita.
const RadGen = lazy(() => import('./pages/RadGen'))
const Bienvenida = lazy(() => import('./pages/Bienvenida'))
const PortalLogin = lazy(() => import('./portal/PortalLogin'))
const PortalDashboard = lazy(() => import('./portal/PortalDashboard'))
const NuevoEvento = lazy(() => import('./portal/NuevoEvento'))
const EditarEvento = lazy(() => import('./portal/EditarEvento'))
const PortalCalendario = lazy(() => import('./portal/PortalCalendario'))
const AgendaPastoral = lazy(() => import('./portal/AgendaPastoral'))
const InventarioMinisterio = lazy(() => import('./portal/InventarioMinisterio'))
const NuevoItemInventario = lazy(() => import('./portal/NuevoItemInventario'))
const EditarItemInventario = lazy(() => import('./portal/EditarItemInventario'))
const PrestamosInventario = lazy(() => import('./portal/PrestamosInventario'))
const VisitasNuevas = lazy(() => import('./portal/VisitasNuevas'))
const PortalAdmin = lazy(() => import('./portal/PortalAdmin'))

function PortalLayout() {
  return (
    <PortalAuthProvider>
      <Outlet />
    </PortalAuthProvider>
  )
}

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<PaginaPrincipal />} />
        <Route path="/radgen" element={<RadGen />} />
        <Route path="/bienvenida" element={<Bienvenida />} />

        <Route path="/lideres" element={<PortalLayout />}>
          <Route index element={<PortalLogin />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <PortalDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="eventos/nuevo"
            element={
              <ProtectedRoute>
                <NuevoEvento />
              </ProtectedRoute>
            }
          />
          <Route
            path="eventos/:id/editar"
            element={
              <ProtectedRoute>
                <EditarEvento />
              </ProtectedRoute>
            }
          />
          <Route
            path="calendario"
            element={
              <ProtectedRoute>
                <PortalCalendario />
              </ProtectedRoute>
            }
          />
          <Route
            path="agenda-pastoral"
            element={
              <ProtectedRoute>
                <AgendaPastoral />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventario"
            element={
              <ProtectedRoute>
                <InventarioMinisterio />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventario/nuevo"
            element={
              <ProtectedRoute>
                <NuevoItemInventario />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventario/:id/editar"
            element={
              <ProtectedRoute>
                <EditarItemInventario />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventario/prestamos"
            element={
              <ProtectedRoute>
                <PrestamosInventario />
              </ProtectedRoute>
            }
          />
          <Route
            path="visitas"
            element={
              <ProtectedRoute>
                <VisitasNuevas />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin"
            element={
              <ProtectedRoute>
                <PortalAdmin />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
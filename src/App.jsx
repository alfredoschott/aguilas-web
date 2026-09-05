import { Routes, Route, Outlet } from 'react-router-dom'
import PaginaPrincipal from './pages/PaginaPrincipal'
import RadGen from './pages/RadGen'
import Bienvenida from './pages/Bienvenida'
import { PortalAuthProvider } from './portal/PortalAuthContext'
import PortalLogin from './portal/PortalLogin'
import PortalDashboard from './portal/PortalDashboard'
import NuevoEvento from './portal/NuevoEvento'
import EditarEvento from './portal/EditarEvento'
import PortalCalendario from './portal/PortalCalendario'
import AgendaPastoral from './portal/AgendaPastoral'
import ProtectedRoute from './portal/ProtectedRoute'
import InventarioMinisterio from './portal/InventarioMinisterio'
import NuevoItemInventario from './portal/NuevoItemInventario'
import EditarItemInventario from './portal/EditarItemInventario'
import PrestamosInventario from './portal/PrestamosInventario'
import VisitasNuevas from './portal/VisitasNuevas'
import PortalAdmin from './portal/PortalAdmin'

function PortalLayout() {
  return (
    <PortalAuthProvider>
      <Outlet />
    </PortalAuthProvider>
  )
}

function App() {
  return (
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
  )
}

export default App
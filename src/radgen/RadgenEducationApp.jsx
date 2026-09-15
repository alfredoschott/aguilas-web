import { useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { getUsuarioActual } from './store'
import LoginScreen from './screens/LoginScreen'
import LessonListScreen from './screens/LessonListScreen'
import LessonDetailScreen from './screens/LessonDetailScreen'
import LeaderDashboard from './screens/LeaderDashboard'
import BadgesScreen from './screens/BadgesScreen'
import ProyectorScreen from './screens/ProyectorScreen'
import PerfilJovenScreen from './screens/PerfilJovenScreen'
import LessonEditorScreen from './screens/LessonEditorScreen'
import TopBar from './components/TopBar'
import './radgen.css'

export default function RadgenEducationApp() {
  const [usuario, setUsuario] = useState(() => getUsuarioActual())
  const location = useLocation()
  const esProyector = location.pathname.endsWith('/proyector')

  function requiereSesion(rolNecesario, elemento) {
    if (!usuario) return <Navigate to="/radgen/education" replace />
    if (rolNecesario && usuario.rol !== rolNecesario) {
      return <Navigate to="/radgen/education" replace />
    }
    return elemento
  }

  if (esProyector) {
    return (
      <div className="radgen-edu">
        <Routes>
          <Route path="/proyector" element={requiereSesion('lider', <ProyectorScreen />)} />
        </Routes>
      </div>
    )
  }

  return (
    <div className="radgen-edu">
      <TopBar usuario={usuario} onSesion={setUsuario} />
      <div className="re-page">
        <Routes>
          <Route path="/" element={<LoginScreen onSesion={setUsuario} />} />
          <Route
            path="/lecciones"
            element={requiereSesion('joven', <LessonListScreen usuario={usuario} />)}
          />
          <Route
            path="/leccion/:asignacionId"
            element={requiereSesion('joven', <LessonDetailScreen usuario={usuario} />)}
          />
          <Route
            path="/insignias"
            element={requiereSesion('joven', <BadgesScreen usuario={usuario} />)}
          />
          <Route
            path="/lider"
            element={requiereSesion('lider', <LeaderDashboard usuario={usuario} />)}
          />
          <Route
            path="/lider/joven/:uid"
            element={requiereSesion('lider', <PerfilJovenScreen usuario={usuario} />)}
          />
          <Route
            path="/lider/leccion/nueva"
            element={requiereSesion('lider', <LessonEditorScreen />)}
          />
          <Route
            path="/lider/leccion/:leccionId/editar"
            element={requiereSesion('lider', <LessonEditorScreen />)}
          />
          <Route path="*" element={<Navigate to="/radgen/education" replace />} />
        </Routes>
      </div>
    </div>
  )
}

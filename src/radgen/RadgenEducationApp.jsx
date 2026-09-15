import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { observarSesion, observarModoPreRegistro } from './store'
import LoginScreen from './screens/LoginScreen'
import LessonListScreen from './screens/LessonListScreen'
import LessonDetailScreen from './screens/LessonDetailScreen'
import LeaderDashboard from './screens/LeaderDashboard'
import BadgesScreen from './screens/BadgesScreen'
import ProyectorScreen from './screens/ProyectorScreen'
import PerfilJovenScreen from './screens/PerfilJovenScreen'
import LessonEditorScreen from './screens/LessonEditorScreen'
import PerfilScreen from './screens/PerfilScreen'
import PreRegistroScreen from './screens/PreRegistroScreen'
import TopBar from './components/TopBar'
import Sky from './components/Sky'
import './radgen.css'

export default function RadgenEducationApp() {
  const [usuario, setUsuario] = useState(undefined) // undefined = verificando sesión
  const [modoPreRegistro, setModoPreRegistro] = useState(true)
  const location = useLocation()
  const esProyector = location.pathname.endsWith('/proyector')

  useEffect(() => {
    const unsub = observarSesion(setUsuario)
    return unsub
  }, [])

  useEffect(() => {
    const unsub = observarModoPreRegistro(setModoPreRegistro)
    return unsub
  }, [])

  // El dueño del proyecto puede entrar a las pantallas de líder aunque su
  // cuenta esté registrada como joven, para probar/revisar el panel.
  const esAdmin = usuario?.email === 'schottalfredo@gmail.com'

  function requiereSesion(rolNecesario, elemento) {
    if (!usuario) return <Navigate to="/radgen/education" replace />
    if (rolNecesario && usuario.rol !== rolNecesario && !(rolNecesario === 'lider' && esAdmin)) {
      return <Navigate to="/radgen/education" replace />
    }
    return elemento
  }

  // Mientras dure el pre-registro, un joven solo puede ver/editar su perfil
  // — el currículo (lecciones, insignias) queda oculto hasta que la líder
  // lo active desde su panel.
  function requiereCurriculoActivo(elemento) {
    const bloqueado = requiereSesion('joven', elemento)
    if (bloqueado !== elemento) return bloqueado
    if (modoPreRegistro) return <Navigate to="/radgen/education/pre-registro" replace />
    return elemento
  }

  if (usuario === undefined && !esProyector) {
    return (
      <div className="radgen-edu" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Sky size={80} pose="estudiando" animado />
      </div>
    )
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
      <TopBar usuario={usuario} onSesion={setUsuario} modoPreRegistro={modoPreRegistro} />
      <div className="re-page">
        <Routes>
          <Route path="/" element={<LoginScreen onSesion={setUsuario} />} />
          <Route
            path="/lecciones"
            element={requiereCurriculoActivo(<LessonListScreen usuario={usuario} />)}
          />
          <Route
            path="/leccion/:asignacionId"
            element={requiereCurriculoActivo(<LessonDetailScreen usuario={usuario} />)}
          />
          <Route
            path="/insignias"
            element={requiereCurriculoActivo(<BadgesScreen usuario={usuario} />)}
          />
          <Route
            path="/pre-registro"
            element={requiereSesion('joven', <PreRegistroScreen usuario={usuario} />)}
          />
          <Route
            path="/perfil"
            element={requiereSesion(null, <PerfilScreen usuario={usuario} onActualizar={setUsuario} />)}
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

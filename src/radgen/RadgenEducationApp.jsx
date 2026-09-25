import { Suspense, lazy, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { observarSesion, observarAppPausada } from './store'
import LoginScreen from './screens/LoginScreen'
import LessonListScreen from './screens/LessonListScreen'

// Entrar y ver tus lecciones va directo; el resto de pantallas (sobre todo
// las de líder: panel, editor, proyector) se descarga solo al abrirlas, para
// que un joven en su celular no baje código que nunca va a usar.
const LessonDetailScreen = lazy(() => import('./screens/LessonDetailScreen'))
const LeaderDashboard = lazy(() => import('./screens/LeaderDashboard'))
const BadgesScreen = lazy(() => import('./screens/BadgesScreen'))
const ProyectorScreen = lazy(() => import('./screens/ProyectorScreen'))
const PerfilJovenScreen = lazy(() => import('./screens/PerfilJovenScreen'))
const LessonEditorScreen = lazy(() => import('./screens/LessonEditorScreen'))
const LeccionPreviewScreen = lazy(() => import('./screens/LeccionPreviewScreen'))
const SeriePreviewScreen = lazy(() => import('./screens/SeriePreviewScreen'))
const PerfilScreen = lazy(() => import('./screens/PerfilScreen'))
const PerfilPublicoScreen = lazy(() => import('./screens/PerfilPublicoScreen'))
const AppPausadaScreen = lazy(() => import('./screens/AppPausadaScreen'))
const AsistenciaScreen = lazy(() => import('./screens/AsistenciaScreen'))
const DueloScreen = lazy(() => import('./screens/DueloScreen'))
const MemorizarVersiculoScreen = lazy(() => import('./screens/MemorizarVersiculoScreen'))
const CompanerosScreen = lazy(() => import('./screens/CompanerosScreen'))
const VistaJovenScreen = lazy(() => import('./screens/VistaJovenScreen'))

import TopBar from './components/TopBar'
import Sky from './components/Sky'
import './radgen.css'

function CargandoPantalla() {
  return (
    <div className="re-shell" style={{ textAlign: 'center' }}>
      <Sky size={72} pose="estudiando" animado />
    </div>
  )
}

export default function RadgenEducationApp() {
  const [usuario, setUsuario] = useState(undefined) // undefined = verificando sesión
  const [pausado, setPausado] = useState(false)
  const location = useLocation()
  const esProyector = location.pathname.endsWith('/proyector')

  useEffect(() => {
    const unsub = observarSesion(setUsuario)
    return unsub
  }, [])

  useEffect(() => {
    const unsub = observarAppPausada(setPausado)
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

  // Mientras la app esté pausada, un joven solo puede ver/editar su perfil
  // — el currículo (lecciones, insignias) queda oculto hasta que la líder
  // la reactive desde Ajustes.
  // Compañeros, duelos y perfiles públicos: para jóvenes (si el currículo no
  // está en pausa) y también para líderes, que pueden retar y ser retadas.
  function requiereComunidad(elemento) {
    if (usuario?.rol === 'lider') return requiereSesion('lider', elemento)
    return requiereCurriculoActivo(elemento)
  }

  function requiereCurriculoActivo(elemento) {
    const bloqueado = requiereSesion('joven', elemento)
    if (bloqueado !== elemento) return bloqueado
    if (pausado) return <Navigate to="/radgen/education/pausado" replace />
    return elemento
  }

  if (usuario === undefined) {
    return (
      <div className="radgen-edu" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Sky size={80} pose="estudiando" animado />
      </div>
    )
  }

  if (esProyector) {
    return (
      <div className="radgen-edu">
        <Suspense fallback={<CargandoPantalla />}>
          <Routes>
            <Route path="/proyector" element={requiereSesion('lider', <ProyectorScreen />)} />
          </Routes>
        </Suspense>
      </div>
    )
  }

  return (
    <div className="radgen-edu">
      <TopBar usuario={usuario} onSesion={setUsuario} pausado={pausado} />
      <div className="re-page">
        <Suspense fallback={<CargandoPantalla />}>
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
              path="/leccion/:asignacionId/memorizar"
              element={requiereCurriculoActivo(<MemorizarVersiculoScreen usuario={usuario} />)}
            />
            <Route
              path="/companeros"
              element={requiereComunidad(<CompanerosScreen usuario={usuario} />)}
            />
            <Route
              path="/insignias"
              element={requiereCurriculoActivo(<BadgesScreen usuario={usuario} onActualizar={setUsuario} />)}
            />
            <Route
              path="/joven/:uid"
              element={requiereComunidad(<PerfilPublicoScreen usuario={usuario} />)}
            />
            <Route
              path="/duelo/:dueloId"
              element={requiereComunidad(<DueloScreen usuario={usuario} />)}
            />
            <Route path="/asistencia/:codigo" element={<AsistenciaScreen usuario={usuario} />} />
            <Route
              path="/pausado"
              element={requiereSesion('joven', <AppPausadaScreen usuario={usuario} />)}
            />
            <Route
              path="/perfil"
              element={requiereSesion(null, <PerfilScreen usuario={usuario} onActualizar={setUsuario} />)}
            />
            <Route
              path="/lider"
              element={requiereSesion('lider', <LeaderDashboard usuario={usuario} />)}
            />
            <Route path="/lider/vista-joven" element={requiereSesion('lider', <VistaJovenScreen />)} />
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
            <Route
              path="/lider/leccion/:leccionId/preview"
              element={requiereSesion('lider', <LeccionPreviewScreen />)}
            />
            <Route
              path="/lider/serie/:serieId/preview"
              element={requiereSesion('lider', <SeriePreviewScreen />)}
            />
            <Route path="*" element={<Navigate to="/radgen/education" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  )
}

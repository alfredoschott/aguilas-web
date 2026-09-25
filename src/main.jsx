import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import RutasRaiz from './RutasRaiz.jsx'
import DevNav from './components/DevNav.jsx'

// Evita que el navegador restaure/salte a un scroll previo (o al hash de la
// URL, ej. #servicios) antes de que el splash y el contenido terminen de
// montarse — se veía como un salto hacia abajo apenas cargaba o se
// refrescaba la página. El splash siempre es el punto de entrada.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}
if (window.location.hash) {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}
window.scrollTo(0, 0)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <RutasRaiz />
      {import.meta.env.DEV && <DevNav />}
    </BrowserRouter>
  </StrictMode>,
)
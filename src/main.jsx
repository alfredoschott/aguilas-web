import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import RadgenEducationApp from './radgen/RadgenEducationApp.jsx'
import DevNav from './components/DevNav.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/radgen/education/*" element={<RadgenEducationApp />} />
        <Route path="/*" element={<App />} />
      </Routes>
      {import.meta.env.DEV && <DevNav />}
    </BrowserRouter>
  </StrictMode>,
)

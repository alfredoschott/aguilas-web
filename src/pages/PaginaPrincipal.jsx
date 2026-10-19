import { useState, useLayoutEffect } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import ProximosEventos from '../components/ProximosEventos'
import Anuncios from '../components/Anuncios'
import Servicios from '../components/Servicios'
import Nosotros from '../components/Nosotros'
import Valores from '../components/Valores'
import RadGenPromo from '../components/RadGenPromo'
import Aniversario from '../components/Aniversario'
import Galeria from '../components/Galeria'
import Contacto from '../components/Contacto'
import Footer from '../components/Footer'
import LogoAnimado from '../components/LogoAnimado'
import RedesSociales from '../components/RedesSociales'
import WhatsAppFlotante from '../components/WhatsAppFlotante'
import BotonArriba from '../components/BotonArriba'
import ScrollProgress from '../components/ScrollProgress'

function PaginaPrincipal() {
  const [logoVisible, setLogoVisible] = useState(false)

  // El splash de entrada siempre empieza desde arriba, aunque la URL traiga
  // un hash (#servicios) de una navegación previa — evita el salto hacia
  // abajo justo al terminar de montar las secciones.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <ScrollProgress />
      <LogoAnimado onComplete={() => setLogoVisible(true)} />
      <Navbar logoVisible={logoVisible} />
      <Hero />
      <Aniversario />
      <ProximosEventos />
      <Anuncios />
      <Servicios />
      <Nosotros />
      <Valores />
      <RadGenPromo />
      <Galeria />
      <Contacto />
      <RedesSociales />
      <Footer />
      <WhatsAppFlotante />
      <BotonArriba />
    </>
  )
}

export default PaginaPrincipal
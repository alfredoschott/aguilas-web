import { Link, useSearchParams } from 'react-router-dom'
import { RESPONSABLE, FECHA_AVISO } from './datosResponsable'
import { PUNTOS_AUTORIZACION, TEXTO_FOTOS } from './textoAutorizacion'
import './legal.css'

function Linea({ etiqueta, valor }) {
  return (
    <p className="formato__linea">
      <span>{etiqueta}</span>
      <span>{valor}</span>
    </p>
  )
}

// El mismo permiso del enlace, en una hoja para imprimir y firmar en papel
// (para familias que prefieren papel o no usan WhatsApp). `?joven=Nombre`
// precarga el nombre del joven.
export default function FormatoAutorizacion() {
  const [params] = useSearchParams()
  const joven = params.get('joven') || ''

  return (
    <main className="formato">
      <div className="formato__acciones">
        <button type="button" onClick={() => window.print()}>
          🖨 Imprimir
        </button>
        <Link to="/privacidad">Ver aviso de privacidad</Link>
      </div>

      <div className="formato__hoja">
        <p style={{ fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.1em' }}>
          {RESPONSABLE.nombre.toUpperCase()} · RADGEN EDUCATION
        </p>
        <h1>Autorización de papá, mamá o tutor</h1>
        <p style={{ fontSize: '0.8rem' }}>Formato vigente desde el {FECHA_AVISO}</p>

        <Linea etiqueta="Nombre del joven:" valor={joven} />
        <Linea etiqueta="Nombre de quien autoriza:" />
        <p className="formato__linea">
          <span>Parentesco:</span>
          <span style={{ border: 'none' }}>☐ Mamá &nbsp;&nbsp; ☐ Papá &nbsp;&nbsp; ☐ Tutor legal</span>
        </p>

        <p>
          Como papá, mamá o tutor legal del joven mencionado, autorizo a {RESPONSABLE.nombre}, con domicilio en{' '}
          {RESPONSABLE.domicilio}:
        </p>
        <ul>
          {PUNTOS_AUTORIZACION.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="formato__casilla">(Opcional, marque si está de acuerdo) {TEXTO_FOTOS}</p>
        <p>
          Sé que puedo consultar el Aviso de privacidad completo en aguilascfctizayuca.com/privacidad y retirar esta
          autorización cuando quiera escribiendo por WhatsApp al {RESPONSABLE.whatsapp}.
        </p>

        <Linea etiqueta="Teléfono de contacto:" />
        <Linea etiqueta="Fecha:" />
        <Linea etiqueta="Firma:" />
      </div>
    </main>
  )
}

import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { RESPONSABLE, FECHA_AVISO } from './datosResponsable'
import './legal.css'

const SECCIONES = [
  ['responsable', 'Quién es responsable'],
  ['datos', 'Qué datos'],
  ['sensibles', 'Datos sensibles'],
  ['menores', 'Menores de edad'],
  ['finalidades', 'Para qué'],
  ['terceros', 'Con quién'],
  ['cookies', 'Cookies'],
  ['derechos', 'Tus derechos'],
  ['conservacion', 'Cuánto tiempo'],
  ['cambios', 'Cambios'],
]

// Aviso de privacidad integral, uno solo para el sitio de Águilas, RadGen y
// RadGen Education (los tres viven en el mismo dominio y la misma base de
// datos). Los datos del responsable salen de datosResponsable.js.
export default function AvisoPrivacidad() {
  const contacto = (
    <>
      por WhatsApp al <a href={RESPONSABLE.whatsappUrl}>{RESPONSABLE.whatsapp}</a>
      {RESPONSABLE.correo && (
        <>
          {' '}o al correo <a href={`mailto:${RESPONSABLE.correo}`}>{RESPONSABLE.correo}</a>
        </>
      )}
    </>
  )

  return (
    <main className="legal">
      <article className="legal__contenido">
        <Link to="/" className="legal__volver">
          <ArrowLeft size={16} aria-hidden="true" /> Volver al inicio
        </Link>

        <p className="legal__eyebrow">Legal</p>
        <h1>Aviso de privacidad</h1>
        <p className="legal__fecha">Última actualización: {FECHA_AVISO}</p>

        <div className="legal__resumen">
          <p>
            <strong>En corto:</strong> solo pedimos los datos que necesitamos para contactarte y acompañarte. No los
            vendemos, no los usamos para publicidad y no tenemos rastreadores de terceros. Puedes pedir que los
            corrijamos o borremos cuando quieras.
          </p>
          <p>
            Para los jóvenes menores de edad en RadGen Education pedimos la autorización de su papá, mamá o tutor.
          </p>
        </div>

        <nav className="legal__indice" aria-label="Secciones del aviso">
          {SECCIONES.map(([id, titulo]) => (
            <a key={id} href={`#${id}`}>
              {titulo}
            </a>
          ))}
        </nav>

        <h2 id="responsable">1. Quién es responsable de tus datos</h2>
        <p>
          <strong>{RESPONSABLE.nombre}</strong> (“{RESPONSABLE.nombreCorto}”, “nosotros”), con domicilio en{' '}
          {RESPONSABLE.domicilio}, es responsable del uso y protección de tus datos personales conforme a la Ley Federal
          de Protección de Datos Personales en Posesión de los Particulares. Esto aplica a este sitio, a la página de
          RadGen y a la plataforma RadGen Education.
        </p>
        <p>Para cualquier tema de privacidad puedes escribirnos {contacto}.</p>

        <h2 id="datos">2. Qué datos recabamos</h2>
        <h3>Si nos visitas o nos dejas tus datos en el sitio</h3>
        <ul>
          <li>
            <strong>Formulario de bienvenida:</strong> tu nombre y tu número de WhatsApp.
          </li>
          <li>
            <strong>Registro de RadGen:</strong> tu nombre, teléfono o WhatsApp y, si quieres, tu edad y un mensaje.
          </li>
        </ul>
        <h3>Si usas RadGen Education (jóvenes)</h3>
        <ul>
          <li>Nombre y correo electrónico de la cuenta de Google con la que inicias sesión.</li>
          <li>Lo que tú decidas agregar a tu perfil: foto, apodo, biografía, colores y marcos.</li>
          <li>
            Tu avance: cápsulas completadas, respuestas de quizzes, experiencia (XP), insignias, rachas, duelos,
            asistencia a reuniones y versículos memorizados.
          </li>
          <li>Las preguntas y comentarios que escribas dentro de la plataforma.</li>
          <li>
            Notas de seguimiento que tu líder puede escribir para acompañarte mejor. Solo las ven los líderes.
          </li>
          <li>
            Si eres menor de edad: el nombre y parentesco de quien te autorizó y la fecha en que lo hizo.
          </li>
        </ul>
        <h3>Si eres líder o servidor (portal interno)</h3>
        <ul>
          <li>Tu correo de Google, tu nombre y el ministerio al que perteneces, para darte acceso al portal.</li>
        </ul>

        <h2 id="sensibles">3. Datos personales sensibles</h2>
        <p>
          Que te registres en una actividad de una iglesia puede revelar tus <strong>creencias religiosas</strong>, que
          la ley considera un dato sensible. Por eso te pedimos tu <strong>consentimiento expreso</strong> (la casilla
          que marcas antes de enviar un formulario, o la autorización de tus papás en RadGen Education). Nunca usamos
          esta información para nada distinto a acompañarte en la comunidad.
        </p>

        <h2 id="menores">4. Menores de edad</h2>
        <p>
          Muchos de los jóvenes de RadGen son menores de 18 años. Para ellos pedimos la{' '}
          <strong>autorización de su papá, mamá o tutor legal</strong>, ya sea en un enlace que les enviamos o en un
          formato firmado en papel. Si todavía no la tenemos, los líderes se ponen en contacto con la familia para
          completarla.
        </p>
        <p>
          Las fotos de actividades en las que aparezcan menores solo se publican en nuestras redes si su papá, mamá o
          tutor lo autorizó. Si ves una foto tuya o de tu hijo(a) que quieras que quitemos, escríbenos y la retiramos.
        </p>

        <h2 id="finalidades">5. Para qué usamos tus datos</h2>
        <h3>Finalidades necesarias</h3>
        <ul>
          <li>Contactarte después de tu visita o de tu registro y darte la bienvenida.</li>
          <li>Invitarte a reuniones, eventos y actividades de la iglesia y de RadGen.</li>
          <li>
            Darte acceso a RadGen Education, guardar tu avance, calcular tu experiencia e insignias y mostrarte en el
            ranking del grupo (solo con tu nombre o apodo, nivel e insignias).
          </li>
          <li>Que tus líderes puedan dar seguimiento y acompañamiento espiritual.</li>
        </ul>
        <h3>Finalidades opcionales</h3>
        <ul>
          <li>Publicar fotos de actividades en nuestras redes sociales.</li>
        </ul>
        <p>
          Si no quieres que usemos tus datos para las finalidades opcionales, escríbenos {contacto} y lo respetamos,
          sin que eso cambie nada de lo demás.
        </p>

        <h2 id="terceros">6. Con quién compartimos tus datos</h2>
        <p>
          <strong>No vendemos ni rentamos tus datos</strong>, ni los compartimos con nadie para publicidad. Para que el
          sitio y la plataforma funcionen usamos proveedores de infraestructura tecnológica (alojamiento web, base de
          datos, inicio de sesión y almacenamiento de imágenes), que tratan los datos solo por encargo nuestro y bajo
          sus propias medidas de seguridad. También usamos un servicio de video para las cápsulas y un servicio de
          mapas para mostrar nuestra ubicación.
        </p>
        <p>
          Si tú das clic en un enlace hacia <strong>WhatsApp, Facebook</strong> o <strong>Instagram</strong>, esa
          plataforma trata tus datos conforme a su propio aviso de privacidad, no al nuestro.
        </p>
        <p>
          Algunos de estos servicios guardan información fuera de México. Solo compartiríamos datos con una autoridad si
          la ley nos lo exige.
        </p>

        <h2 id="cookies">7. Cookies y tecnologías similares</h2>
        <p>
          <strong>No usamos cookies de publicidad ni de analítica.</strong> Tu navegador guarda algunos datos
          necesarios para que el sitio funcione, como tu sesión iniciada o tus preferencias de sonido. Los videos de
          YouTube y el mapa de Google pueden usar sus propias cookies cuando los reproduces o los abres; puedes
          borrarlas o bloquearlas desde la configuración de tu navegador.
        </p>

        <h2 id="derechos">8. Tus derechos (ARCO) y cómo retirar tu consentimiento</h2>
        <p>
          Tienes derecho a <strong>acceder</strong> a tus datos, <strong>rectificarlos</strong>,{' '}
          <strong>cancelarlos</strong> (que los borremos) u <strong>oponerte</strong> a su uso, y también a retirar
          tu consentimiento en cualquier momento. Si eres menor de edad, tu papá, mamá o tutor puede hacerlo por ti.
        </p>
        <p>
          Escríbenos {contacto} con tu nombre, qué quieres que hagamos y un dato para confirmar que eres tú (por
          ejemplo, el correo o teléfono con el que te registraste). Te respondemos en un máximo de{' '}
          <strong>20 días hábiles</strong>. Si crees que no atendimos bien tu solicitud, puedes acudir a la autoridad
          encargada de la protección de datos personales.
        </p>
        <p>
          En RadGen Education también puedes corregir tu nombre, foto y biografía tú mismo desde <em>Mi perfil</em>.
        </p>

        <h2 id="conservacion">9. Cuánto tiempo guardamos tus datos</h2>
        <p>
          Mientras formes parte de la comunidad o mientras tu cuenta esté activa. Si nos pides borrarlos los
          eliminamos, salvo lo que la ley nos pida conservar. Las cuentas de RadGen Education que dejen de usarse por
          mucho tiempo también pueden eliminarse.
        </p>

        <h2 id="cambios">10. Cambios a este aviso</h2>
        <p>
          Si cambiamos este aviso, publicaremos la nueva versión en esta misma página con su fecha de actualización, y
          si el cambio es importante te lo avisaremos por WhatsApp o dentro de RadGen Education.
        </p>

        <p className="legal__pie">
          ¿Usas RadGen Education? Lee también los <Link to="/terminos">Términos de uso</Link>.
        </p>
      </article>
    </main>
  )
}

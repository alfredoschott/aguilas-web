import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { RESPONSABLE, FECHA_AVISO } from './datosResponsable'
import './legal.css'

// Reglas de uso de RadGen Education, escritas para que un joven las entienda.
export default function TerminosRadgen() {
  return (
    <main className="legal">
      <article className="legal__contenido">
        <Link to="/radgen/education" className="legal__volver">
          <ArrowLeft size={16} aria-hidden="true" /> Volver a RadGen Education
        </Link>

        <p className="legal__eyebrow">RadGen Education</p>
        <h1>Términos de uso</h1>
        <p className="legal__fecha">Última actualización: {FECHA_AVISO}</p>

        <div className="legal__resumen">
          <p>
            <strong>En corto:</strong> RadGen Education es un espacio para crecer en la fe con tu grupo. Trata a todos
            con respeto, no compartas datos personales y diviértete.
          </p>
        </div>

        <h2>1. Qué es RadGen Education</h2>
        <p>
          Es la plataforma de discipulado de los jóvenes de {RESPONSABLE.nombre}: cápsulas, quizzes, retos, duelos,
          insignias y niveles. Es gratuita y la administran los líderes de RadGen.
        </p>

        <h2>2. Tu cuenta</h2>
        <ul>
          <li>Entras con tu cuenta de Google y el código de invitación que te da tu líder.</li>
          <li>Tu cuenta es personal: no la compartas ni entres con la de alguien más.</li>
          <li>
            Si tienes menos de 18 años necesitas la autorización de tu papá, mamá o tutor. Te ayudamos a pedírsela
            desde la plataforma.
          </li>
        </ul>

        <h2>3. Cómo convivimos aquí</h2>
        <ul>
          <li>Respeta a todos en comentarios, preguntas y duelos. Nada de burlas, insultos ni presión.</li>
          <li>No publiques tu teléfono, dirección, redes ni datos de otras personas.</li>
          <li>Tu foto y tu biografía deben ser apropiadas para todo el grupo.</li>
          <li>Haz tus cápsulas y quizzes tú mismo: la idea es aprender, no solo subir de nivel.</li>
        </ul>
        <p>
          Los líderes pueden quitar comentarios o fotos que no cumplan estas reglas y, si algo se repite, pausar una
          cuenta mientras platican contigo y tu familia.
        </p>

        <h2>4. Experiencia, insignias y certificados</h2>
        <p>
          La experiencia (XP), los niveles, las insignias y los certificados son para motivarte y reconocer tu
          esfuerzo. No tienen valor en dinero ni se pueden cambiar por premios, salvo que tus líderes organicen algo
          especial.
        </p>

        <h2>5. El contenido</h2>
        <p>
          Las cápsulas, videos, imágenes y a Sky los hicieron los líderes y el equipo de {RESPONSABLE.nombreCorto}.{' '}
          <strong>
            © {new Date().getFullYear()} {RESPONSABLE.nombre}. Todos los derechos reservados.
          </strong>{' '}
          Puedes compartir tus insignias, tu carta y tus certificados en tus redes; el resto del contenido es para
          usarse dentro de la plataforma y no puede copiarse ni redistribuirse sin permiso.
        </p>

        <h2>6. Tu privacidad</h2>
        <p>
          Cómo cuidamos tus datos está explicado en el <Link to="/privacidad">Aviso de privacidad</Link>.
        </p>

        <h2>7. Cambios y dudas</h2>
        <p>
          Podemos actualizar estas reglas; si cambia algo importante te lo avisaremos dentro de la plataforma. Si tienes
          dudas, pregúntale a tu líder o escríbenos por WhatsApp al{' '}
          <a href={RESPONSABLE.whatsappUrl}>{RESPONSABLE.whatsapp}</a>.
        </p>
      </article>
    </main>
  )
}

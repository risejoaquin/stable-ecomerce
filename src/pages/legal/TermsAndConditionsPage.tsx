import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/SEO';
import { UixPageShell } from '../../components/uix/UixPageShell';

export function TermsAndConditionsPage() {
  return (
    <UixPageShell mainClassName="uix-customer-page">
      <SEO
        title="Términos y Condiciones"
        description="Términos y condiciones de uso y compra en la tienda Selfcare Sinners."
        canonicalPath="/terms"
      />
      <section className="uix-customer-hero uix-legal-hero">
        <div>
          <p className="uix-eyebrow">Condiciones de uso</p>
          <h1>Términos y Condiciones</h1>
          <p>Reglas y directrices para el uso de la tienda, catálogo, compras y servicios de Selfcare Sinners.</p>
        </div>
        <span className="uix-legal-updated">Última actualización: 11 de octubre de 2026</span>
      </section>

      <section className="uix-legal-stack" aria-label="Términos y Condiciones">
        <article className="uix-legal-card">
          <h2>1. Aceptación de los términos y uso del sitio</h2>
          <p>
            El acceso y uso de este sitio web implican la aceptación plena y sin reservas de estos Términos y Condiciones.
            Al navegar en la tienda, consultar el catálogo o realizar pedidos, el usuario acepta conducirse conforme a la
            normatividad aplicable y a las presentes directrices operativas.
          </p>
        </article>

        <article className="uix-legal-card">
          <h2>2. Cuentas de usuario y seguridad</h2>
          <p>
            Para determinadas funciones o seguimiento de pedidos, el usuario puede registrar una cuenta. Es responsabilidad
            del usuario salvaguardar la confidencialidad de sus credenciales de acceso y notificar oportunamente cualquier uso no
            autorizado. La información proporcionada debe ser verídica, exacta y actualizada.
          </p>
        </article>

        <article className="uix-legal-card">
          <h2>3. Catálogo, disponibilidad y precios</h2>
          <p>
            Los productos mostrados en el catálogo están sujetos a disponibilidad de inventario. Los precios se expresan en pesos
            mexicanos (MXN) e incluyen los impuestos aplicables salvo indicación expresa en contrario. Nos reservamos el derecho de
            actualizar productos, descripciones y precios sin previo aviso. En caso de falta sobrevenida de existencias tras una orden,
            nos pondremos en contacto con el cliente para coordinar una alternativa o el reembolso correspondiente.
          </p>
        </article>

        <article className="uix-legal-card">
          <h2>4. Pedidos y procesamiento de pagos</h2>
          <p>
            La realización de un pedido constituye una solicitud formal de compra sujeta a validación y confirmación de pago.
            Los pagos se procesan de forma segura a través de pasarelas de pago autorizadas e independientes (como Stripe). La tienda
            no recopila ni almacena información completa de instrumentos de pago sensibles (como números completos de tarjeta o códigos CVV).
          </p>
        </article>

        <article className="uix-legal-card">
          <h2>5. Envíos y entrega</h2>
          <p>
            Los productos se envían al domicilio especificado por el cliente durante el proceso de compra, dentro de las zonas
            de cobertura disponibles. Los plazos y tarifas de envío se calculan y muestran antes de concretar el pago. Los tiempos
            de tránsito son estimados y pueden verse afectados por circunstancias logísticas o de paquetería.
          </p>
        </article>

        <article className="uix-legal-card">
          <h2>6. Cancelaciones y devoluciones</h2>
          <p>
            Las solicitudes de cancelación, devolución y reembolso se rigen por los requisitos y plazos descritos en nuestra{' '}
            <Link to="/returns">Política de Devolución</Link>. Te invitamos a consultar dicha política para conocer los criterios de
            elegibilidad y el procedimiento aplicable.
          </p>
        </article>

        <article className="uix-legal-card">
          <h2>7. Responsabilidades del usuario y uso aceptable</h2>
          <p>
            El usuario se compromete a no utilizar el sitio para fines ilícitos, lesivos de derechos de terceros o que puedan
            dañar, sobrecargar o deteriorar el servicio. Queda estrictamente prohibido intentar vulnerar medidas de seguridad,
            realizar accesos no autorizados, extraer datos mediante métodos automatizados no permitidos o utilizar indebidamente
            medios de pago.
          </p>
        </article>

        <article className="uix-legal-card">
          <h2>8. Propiedad intelectual y marcas</h2>
          <p>
            Todos los contenidos del sitio web, incluyendo textos, gráficos, logotipos, diseños, interfaces, fotografías, código
            y las marcas comerciales de Selfcare Sinners y la marca BLACK RELIC, están protegidos por la legislación de propiedad
            intelectual e industrial. El uso del sitio no concede licencias ni cesión de derechos sobre dichos activos fuera del uso
            personal y no comercial de la tienda.
          </p>
        </article>

        <article className="uix-legal-card">
          <h2>9. Limitación de responsabilidad</h2>
          <p>
            La tienda y sus servicios se proporcionan en el estado en que se encuentran y según disponibilidad técnica. En la máxima
            medida permitida por la ley aplicable y sin perjuicio de los derechos irrenunciables de los consumidores, la tienda no
            asume responsabilidad por interrupciones temporales causadas por factores externos, fallas de conectividad o mantenimiento necesario.
          </p>
        </article>

        <article className="uix-legal-card">
          <h2>10. Privacidad y tratamiento de datos</h2>
          <p>
            El tratamiento de datos personales asociados a tu cuenta, pedidos o navegación se realiza conforme a nuestra{' '}
            <Link to="/privacy">Política de Privacidad</Link>. Si deseas conocer el proceso o solicitar la revisión, rectificación o
            eliminación de tus datos personales, consulta nuestra sección de{' '}
            <Link to="/data-deletion">Eliminación de datos</Link>.
          </p>
        </article>

        <article className="uix-legal-card">
          <h2>11. Modificaciones a los términos</h2>
          <p>
            Nos reservamos el derecho de modificar o actualizar estos Términos y Condiciones cuando resulte necesario para reflejar
            cambios operativos, técnicos o normativos. Las actualizaciones serán efectivas desde el momento de su publicación en esta
            página con la fecha de última actualización correspondiente.
          </p>
        </article>

        <article className="uix-legal-card">
          <h2>12. Contacto y atención a clientes</h2>
          <p>
            Para cualquier duda, aclaración o comentario relativo a estos términos o a la experiencia en la tienda, puedes ponerte
            en contacto a través de nuestra página de <Link to="/contact">Contacto</Link> o los canales de soporte indicados en el sitio.
          </p>
        </article>

        <article className="uix-legal-card">
          <h2>Enlaces relacionados</h2>
          <p>
            Para mayor información sobre nuestras directrices, consulta la <Link to="/privacy">Política de Privacidad</Link>, el
            procedimiento de <Link to="/data-deletion">Eliminación de datos</Link>, las condiciones de la{' '}
            <Link to="/returns">Política de Devolución</Link> o escríbenos directamente en <Link to="/contact">Contacto</Link>.
          </p>
        </article>
      </section>
    </UixPageShell>
  );
}

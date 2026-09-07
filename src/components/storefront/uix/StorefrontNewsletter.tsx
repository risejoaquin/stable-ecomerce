export function StorefrontNewsletter() {
  return (
    <section className="uix-newsletter-panel" aria-label="Newsletter Selfcare Sinners">
      <div>
        <p className="uix-eyebrow">Sinner letters</p>
        <h2>Rituales, drops y beneficios antes que nadie.</h2>
        <p>Una experiencia de marca más cuidada también vive fuera de la tienda: correos limpios, útiles y con identidad premium.</p>
      </div>
      <form onSubmit={(event) => event.preventDefault()}>
        <label className="sr-only" htmlFor="uix-newsletter-email">Correo electrónico</label>
        <input id="uix-newsletter-email" type="email" placeholder="tu@email.com" />
        <button type="submit">Unirme</button>
      </form>
    </section>
  );
}

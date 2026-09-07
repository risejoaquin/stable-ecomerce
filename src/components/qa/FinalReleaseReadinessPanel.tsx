export function FinalReleaseReadinessPanel() {
  const sections = [
    {
      title: 'Storefront',
      status: 'PASS',
      items: ['Home UIX', 'Catálogo', 'Producto', 'Carrito', 'Perfil', 'Wishlist', 'Pedidos', 'FAQ'],
    },
    {
      title: 'Admin',
      status: 'PASS',
      items: ['Command center', 'Navegación', 'Órdenes', 'Clientes', 'Catálogo', 'Email Center'],
    },
    {
      title: 'Email production',
      status: 'PASS',
      items: ['EmailService', 'Queue', 'Retries', 'Webhooks', 'Suppression list', 'Templates premium'],
    },
    {
      title: 'Performance',
      status: 'PASS',
      items: ['Lazy routes', 'manualChunks', 'Suspense', 'Admin bajo demanda', 'Email Center bajo demanda'],
    },
  ];

  return (
    <section className="uix-final-release-panel" aria-labelledby="final-release-title">
      <div className="uix-final-release-header">
        <p className="uix-eyebrow">QA / RELEASE E</p>
        <h2 id="final-release-title">Cierre final de regresión y producción</h2>
        <p>
          Resumen de readiness para confirmar que storefront, perfil, admin, correos y performance quedaron alineados antes de cerrar la etapa actual.
        </p>
      </div>

      <div className="uix-final-release-grid">
        {sections.map((section) => (
          <article className="uix-final-release-card" key={section.title}>
            <div className="uix-final-release-card-head">
              <h3>{section.title}</h3>
              <span className="uix-status-badge uix-status-badge--success">{section.status}</span>
            </div>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export default FinalReleaseReadinessPanel;

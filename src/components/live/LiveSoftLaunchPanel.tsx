import React from 'react';

export function LiveSoftLaunchPanel() {
  return (
    <section className="premium-panel live-soft-launch-panel">
      <div className="premium-panel__eyebrow">LIVE-01</div>
      <h2>Real Traffic Soft Launch</h2>
      <p>
        Command center para observar tráfico real, conversión, checkout, revenue,
        soporte, campañas, incidentes y acciones de mejora durante el lanzamiento controlado.
      </p>
      <div className="premium-grid premium-grid--three">
        <article className="premium-card"><strong>Traffic</strong><span>Sesiones y canales</span></article>
        <article className="premium-card"><strong>Checkout</strong><span>Fricción y abandono</span></article>
        <article className="premium-card"><strong>Revenue</strong><span>Ventas y atribución</span></article>
        <article className="premium-card"><strong>Support</strong><span>Señales reales</span></article>
        <article className="premium-card"><strong>Campaigns</strong><span>Health y ROAS inicial</span></article>
        <article className="premium-card"><strong>Iteration</strong><span>Acciones priorizadas</span></article>
      </div>
    </section>
  );
}

export default LiveSoftLaunchPanel;

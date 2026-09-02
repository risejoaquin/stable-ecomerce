export function FinalVisualQAPanel() {
  const groups = [
    ['Storefront', 'Home, catálogo, detalle de producto y landing pages usan el mismo lenguaje premium.'],
    ['Conversion', 'Carrito, checkout y post-compra mantienen confianza, claridad y CTA fuerte.'],
    ['Mobile', 'Navegación, cards, formularios y CTA respetan tamaño táctil y jerarquía.'],
    ['Consistency', 'Botones, badges, inputs, cards, estados vacíos y mensajes usan tokens comunes.'],
  ];

  return (
    <section className="ss-section ss-container" aria-label="Final visual QA">
      <p className="ss-eyebrow">Final Visual QA</p>
      <h2 className="ss-title">Rediseño integrado, consistente y listo para tráfico real.</h2>
      <div className="grid gap-4 md:grid-cols-4 mt-8">
        {groups.map(([title, copy]) => (
          <article key={title} className="card p-5">
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="ss-copy text-sm mt-2">{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

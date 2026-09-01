import React from 'react';

const pillars = [
  'Identidad visual final',
  'Design system consolidado',
  'Componentes normalizados',
  'Contenido comercial final',
  'Microcopy y confianza',
  'Assets listos para campañas',
];

export function BrandSystemPanel() {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">POST-LAUNCH 23</p>
        <h2 className="mt-2 text-2xl font-semibold text-neutral-950">Visual Brand System & Content Finalization</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
          Panel de referencia para revisar identidad visual, estándares de componentes, contenido comercial,
          microcopy, consistencia visual y preparación de assets para campañas.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pillars.map((pillar) => (
          <article key={pillar} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
            <p className="text-sm font-medium text-neutral-900">{pillar}</p>
            <p className="mt-2 text-xs leading-5 text-neutral-600">
              Estándar listo para validar consistencia visual, claridad comercial y confianza de usuario.
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default BrandSystemPanel;

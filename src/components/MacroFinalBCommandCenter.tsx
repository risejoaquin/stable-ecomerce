import React from 'react';

export function MacroFinalBCommandCenter() {
  const areas = [
    'Internationalization readiness',
    'Multi-currency readiness',
    'Tax/legal readiness',
    'Advanced personalization',
    'Recommendation engine',
    'Customer data platform',
    'Scale governance freeze',
    'Maintenance mode controls',
    'Product v2 roadmap'
  ];

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">Macro Final B</p>
        <h2 className="text-2xl font-semibold text-neutral-950">Internationalization, Personalization & Scale Governance</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Command center para cerrar PL33, PL34 y PL35: expansión, personalización avanzada,
          CDP, congelamiento de escala, mantenimiento y roadmap v2.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {areas.map((area) => (
          <div key={area} className="rounded-xl border border-neutral-200 p-4">
            <p className="text-sm font-medium text-neutral-900">{area}</p>
            <p className="mt-1 text-xs text-neutral-500">Ready for operational validation</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default MacroFinalBCommandCenter;

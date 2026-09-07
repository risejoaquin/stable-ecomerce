export default function CustomerSuccessPanel() {
  const pillars = [
    'Post-purchase journey',
    'Customer satisfaction',
    'Support follow-up',
    'Repeat purchase',
    'Retention activation',
    'Post-purchase emails',
    'Complaints and returns',
    'NPS / CSAT',
    'Recurring customers'
  ];

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">POST-LAUNCH 27</p>
        <h2 className="text-2xl font-bold text-neutral-950">Customer Success & Retention Operations</h2>
        <p className="text-neutral-600">
          Capa de operación post-compra para satisfacción, soporte, recompra, retención y conversión de compradores en clientes recurrentes.
        </p>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {pillars.map((pillar) => (
          <div key={pillar} className="rounded-xl border bg-neutral-50 p-4 text-sm font-medium text-neutral-800">
            {pillar}
          </div>
        ))}
      </div>
    </section>
  );
}

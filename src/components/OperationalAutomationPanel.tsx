export function OperationalAutomationPanel() {
  const items = [
    'Reportes recurrentes',
    'Revisiones diarias/semanales',
    'Alertas comerciales y técnicas',
    'Detección de anomalías',
    'Riesgos revenue/conversión',
    'Seguimiento campañas',
    'Soporte y retención',
    'Workflow ejecutivo recurrente'
  ];

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">POST-LAUNCH 29</p>
        <h2 className="text-2xl font-semibold text-neutral-950">Operational Automation & Alerting Workflows</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Capa de automatización operativa para convertir reportes, alertas, campañas, soporte,
          retención y revisión ejecutiva en un flujo proactivo de mejora continua.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm font-medium text-neutral-800">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

export default OperationalAutomationPanel;

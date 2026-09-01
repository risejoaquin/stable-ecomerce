import React from 'react';

export function LiveGrowthLoopPanel() {
  const items = [
    'Live operations monitoring',
    'Real sales measurement',
    'Channel behavior analytics',
    'Conversion experiments',
    'A/B prioritization',
    'Commercial bottleneck detection',
    'Campaign iteration loop',
    'Risk and cost control',
    'Continuous improvement reports'
  ];

  return (
    <section className="rounded-2xl border p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">POST-LAUNCH 26</p>
        <h2 className="text-2xl font-semibold">Live Operations & Growth Iteration Loop</h2>
        <p className="text-muted-foreground">
          Control operativo para tráfico real, conversión, campañas, ventas, riesgos, costos y mejora continua.
        </p>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="rounded-xl border bg-background p-4 text-sm">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

export default LiveGrowthLoopPanel;

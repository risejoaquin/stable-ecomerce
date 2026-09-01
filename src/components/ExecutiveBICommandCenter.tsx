import React from 'react';

export default function ExecutiveBICommandCenter() {
  const sections = [
    'Executive KPIs',
    'Business command center',
    'Commercial health',
    'Technical health',
    'Funnel analytics',
    'Channel comparison',
    'Decision priorities',
    'Investor reporting',
    'BI insights',
    'Operating reviews'
  ];

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">POST-LAUNCH 28</p>
        <h2 className="text-2xl font-semibold">Executive Operating System</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          KPI command center and business intelligence layer for revenue, conversion,
          retention, operations, health, funnel and executive decisions.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <div key={section} className="rounded-xl border p-4">
            <div className="text-sm font-medium">{section}</div>
            <div className="mt-1 text-xs text-muted-foreground">Ready for executive review</div>
          </div>
        ))}
      </div>
    </section>
  );
}

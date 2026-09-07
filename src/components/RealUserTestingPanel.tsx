import React from 'react';

export function RealUserTestingPanel() {
  const items = [
    'Real user test runs',
    'Conversion QA',
    'Abandonment analysis',
    'Mobile real-device validation',
    'Checkout real-flow validation',
    'Feedback loop actions',
  ];

  return (
    <section className="real-user-testing-panel" aria-labelledby="real-user-testing-title">
      <div>
        <p className="eyebrow">Post-Launch 22</p>
        <h2 id="real-user-testing-title">Real User Testing & Conversion QA</h2>
        <p>
          Cierra la brecha entre smoke tests y comportamiento humano real mediante feedback, fricción,
          abandono, mobile real y checkout real.
        </p>
      </div>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

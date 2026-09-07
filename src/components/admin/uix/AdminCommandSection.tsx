import React from 'react';

export function AdminCommandSection({
  eyebrow,
  title,
  action,
  children,
  className = '',
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`uix-admin-command-section ${className}`.trim()}>
      <div className="uix-admin-command-section__header">
        <div>
          {eyebrow && <p className="uix-admin-eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        {action && <div className="uix-admin-command-section__action">{action}</div>}
      </div>
      {children}
    </section>
  );
}

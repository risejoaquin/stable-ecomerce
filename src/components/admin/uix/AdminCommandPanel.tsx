import React from 'react';

export function AdminCommandPanel({
  title,
  label,
  action,
  children,
  className = '',
}: {
  title: string;
  label?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={`uix-admin-command-panel ${className}`.trim()}>
      <header className="uix-admin-command-panel__header">
        <div>
          {label && <p className="uix-admin-eyebrow">{label}</p>}
          <h3>{title}</h3>
        </div>
        {action && <div className="uix-admin-command-panel__action">{action}</div>}
      </header>
      {children}
    </article>
  );
}

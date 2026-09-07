import React from 'react';

export function AdminCommandList({ children, empty }: { children?: React.ReactNode; empty?: string }) {
  if (!children) {
    return <p className="uix-admin-command-empty">{empty || 'Sin datos para mostrar.'}</p>;
  }
  return <div className="uix-admin-command-list">{children}</div>;
}

export function AdminCommandListRow({
  title,
  subtitle,
  meta,
  status,
  tone = 'neutral',
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  status?: React.ReactNode;
  tone?: 'neutral' | 'ok' | 'warning' | 'danger';
}) {
  return (
    <div className="uix-admin-command-list-row">
      <div className="uix-admin-command-list-row__main">
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div className="uix-admin-command-list-row__meta">
        {meta && <strong>{meta}</strong>}
        {status && <em className={`is-${tone}`}>{status}</em>}
      </div>
    </div>
  );
}

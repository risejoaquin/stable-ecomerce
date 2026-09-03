import React from 'react';
import type { LucideIcon } from 'lucide-react';

export function AdminCommandMetric({
  label,
  value,
  detail,
  icon: Icon,
  priority = 'neutral',
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon: LucideIcon;
  priority?: 'critical' | 'warning' | 'success' | 'revenue' | 'neutral';
}) {
  return (
    <article className={`uix-admin-command-metric is-${priority}`}>
      <div className="uix-admin-command-metric__icon" aria-hidden="true"><Icon size={18} /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {detail && <span>{detail}</span>}
      </div>
    </article>
  );
}

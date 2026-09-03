import React from 'react';

type UixStatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const statusTone: Record<string, UixStatusTone> = {
  pagado: 'success',
  paid: 'success',
  empacado: 'info',
  enviado: 'info',
  entregado: 'success',
  completed: 'success',
  pendiente: 'warning',
  pending: 'warning',
  cancelado: 'danger',
  failed: 'danger',
  error: 'danger',
};

export function getUixStatusTone(status?: string): UixStatusTone {
  return statusTone[String(status || '').toLowerCase()] || 'neutral';
}

export function UixStatusBadge({ status, label }: { status?: string; label?: string }) {
  const tone = getUixStatusTone(status);
  const normalized = label || String(status || 'Sin estado').replace(/_/g, ' ');
  return <span className={`uix-status-badge uix-status-badge--${tone}`}>{normalized}</span>;
}

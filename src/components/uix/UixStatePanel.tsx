import React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, PackageOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

type UixStateTone = 'loading' | 'empty' | 'error' | 'success';

type UixStatePanelProps = {
  tone: UixStateTone;
  title: string;
  description?: string;
  actionText?: string;
  actionTo?: string;
  onAction?: () => void;
  compact?: boolean;
};

const iconByTone: Record<UixStateTone, React.ReactNode> = {
  loading: <Loader2 size={24} className="uix-state-panel__spin" aria-hidden="true" />,
  empty: <PackageOpen size={24} aria-hidden="true" />,
  error: <AlertTriangle size={24} aria-hidden="true" />,
  success: <CheckCircle2 size={24} aria-hidden="true" />,
};

export function UixStatePanel({ tone, title, description, actionText, actionTo, onAction, compact = false }: UixStatePanelProps) {
  const action = actionText && (actionTo || onAction) ? (
    actionTo ? <Link to={actionTo} className="uix-action-primary">{actionText}</Link> : <button type="button" onClick={onAction} className="uix-action-primary">{actionText}</button>
  ) : null;

  return (
    <section className={`uix-state-panel uix-state-panel--${tone} ${compact ? 'uix-state-panel--compact' : ''}`.trim()} aria-live={tone === 'loading' || tone === 'error' ? 'polite' : undefined}>
      <div className="uix-state-panel__icon">{iconByTone[tone]}</div>
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {action && <div className="uix-state-panel__action">{action}</div>}
      </div>
    </section>
  );
}

import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export function AdminCommandAlert({ alerts = [] }: { alerts?: Array<{ code?: string; level?: string; message?: string }> }) {
  const hasAlerts = alerts.length > 0;
  return (
    <section className={`uix-admin-command-alert ${hasAlerts ? 'has-alerts' : 'is-clear'}`}>
      <div className="uix-admin-command-alert__icon" aria-hidden="true">
        {hasAlerts ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
      </div>
      <div>
        <p className="uix-admin-eyebrow">Prioridad crítica</p>
        <h2>{hasAlerts ? 'Requiere atención operativa' : 'Operación estable'}</h2>
        <p>{hasAlerts ? 'Resuelve primero alertas, pagos y stock antes de optimizar campañas.' : 'No hay alertas críticas activas. Mantén revisión diaria de órdenes, pagos y stock.'}</p>
      </div>
      {hasAlerts && (
        <div className="uix-admin-command-alert__items">
          {alerts.slice(0, 3).map((alert, index) => (
            <div key={alert.code || index}>
              <strong>{alert.level || 'alerta'}</strong>
              <span>{alert.message || alert.code || 'Alerta operativa'}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

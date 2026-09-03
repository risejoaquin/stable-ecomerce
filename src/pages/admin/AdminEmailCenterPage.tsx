import React, { useState } from 'react';
import { Mail, Send, RotateCw, ShieldCheck, AlertTriangle, CheckCircle2, Clock, Ban, Eye } from 'lucide-react';
import { useAdminEmailActions, useAdminEmailEvents, useAdminEmailHealth, useAdminEmailQueue, useAdminEmailTemplates } from '../../hooks/useAdminEmail';

const statusClass = (status?: string) => {
  if (['sent', 'delivered', 'opened', 'clicked'].includes(String(status))) return 'is-ok';
  if (['failed', 'bounced', 'complained', 'failed_validation'].includes(String(status))) return 'is-risk';
  if (['queued', 'processing', 'delivery_delayed'].includes(String(status))) return 'is-warning';
  return '';
};

const EmailStatCard = ({ label, value, icon: Icon, tone = '' }: any) => (
  <div className={`ss-email-stat-card ${tone}`}>
    <span><Icon size={18} /></span>
    <p>{label}</p>
    <strong>{value}</strong>
  </div>
);

export function AdminEmailCenterPage() {
  const [testEmail, setTestEmail] = useState('');
  const [purpose, setPurpose] = useState('order_confirmation');
  const [previewHtml, setPreviewHtml] = useState('');
  const events = useAdminEmailEvents();
  const queue = useAdminEmailQueue();
  const health = useAdminEmailHealth();
  const templates = useAdminEmailTemplates();
  const actions = useAdminEmailActions();

  const eventRows = events.data?.data || [];
  const queueRows = queue.data?.data || [];
  const templateRows = templates.data?.data || [];
  const failedCount = eventRows.filter((event: any) => ['failed', 'bounced', 'complained', 'failed_validation'].includes(String(event.status))).length;
  const deliveredCount = eventRows.filter((event: any) => ['delivered', 'opened', 'clicked', 'sent'].includes(String(event.status))).length;
  const queuedCount = queueRows.filter((item: any) => ['queued', 'processing'].includes(String(item.status))).length;
  const suppressedCount = eventRows.filter((event: any) => String(event.status) === 'suppressed').length;

  const handlePreview = async (templatePurpose: string) => {
    setPurpose(templatePurpose);
    const result = await actions.previewTemplate.mutateAsync({ purpose: templatePurpose });
    setPreviewHtml(result?.html || '');
  };

  const handleSendTest = async () => {
    await actions.sendTest.mutateAsync({ to: testEmail, purpose });
    setTestEmail('');
  };

  return (
    <div className="ss-email-center-page">
      <section className="ss-email-center-hero">
        <div>
          <p className="ss-admin-kicker">Email production center</p>
          <h1>Centro de correos</h1>
          <p>Cola, eventos, entregabilidad, previews y pruebas de templates en un solo panel operativo.</p>
        </div>
        <div className="ss-email-health-card">
          <span className={health.data?.productionSafe ? 'is-ok' : 'is-risk'}>{health.data?.productionSafe ? 'Producción segura' : 'Revisar configuración'}</span>
          <strong>{health.data?.provider || 'resend'}</strong>
          <small>{health.data?.configured ? 'RESEND_API_KEY + EMAIL_FROM configurados' : 'Proveedor incompleto'}</small>
        </div>
      </section>

      <section className="ss-email-stat-grid">
        <EmailStatCard label="Enviados / entregados" value={deliveredCount} icon={CheckCircle2} tone="ok" />
        <EmailStatCard label="Pendientes en cola" value={queuedCount} icon={Clock} tone="warning" />
        <EmailStatCard label="Fallidos / rebotes" value={failedCount} icon={AlertTriangle} tone="risk" />
        <EmailStatCard label="Suprimidos" value={suppressedCount} icon={Ban} />
      </section>

      <section className="ss-email-center-grid">
        <div className="ss-admin-panel ss-email-panel-large">
          <div className="ss-admin-panel-head">
            <div><p className="ss-admin-kicker">Delivery</p><h3>Cola de correos</h3></div>
            <button className="ss-account-secondary" onClick={() => actions.processQueue.mutate()} disabled={actions.processQueue.isPending}>
              <RotateCw size={15} /> Procesar cola
            </button>
          </div>
          <div className="ss-email-table">
            <div className="ss-email-table-head"><span>Destinatario</span><span>Propósito</span><span>Estado</span><span>Intentos</span></div>
            {queueRows.length ? queueRows.slice(0, 8).map((row: any) => (
              <div className="ss-email-table-row" key={row.id}>
                <span>{row.to_email || row.to || 'sin-email'}</span>
                <span>{row.purpose || 'generic'}</span>
                <em className={statusClass(row.status)}>{row.status || 'queued'}</em>
                <span>{row.attempt_count ?? row.attempts ?? 0}</span>
              </div>
            )) : <p className="ss-admin-empty">No hay correos pendientes.</p>}
          </div>
        </div>

        <div className="ss-admin-panel">
          <div className="ss-admin-panel-head"><div><p className="ss-admin-kicker">QA</p><h3>Enviar prueba</h3></div><Send size={18} /></div>
          <label className="ss-email-field">Email destino<input value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="admin@selfcaresinners.com" /></label>
          <label className="ss-email-field">Template<select value={purpose} onChange={(event) => setPurpose(event.target.value)}>{templateRows.map((template: any) => <option key={template.key} value={template.key}>{template.name}</option>)}</select></label>
          <button className="ss-account-action" onClick={handleSendTest} disabled={!testEmail || actions.sendTest.isPending}>Enviar correo de prueba</button>
        </div>
      </section>

      <section className="ss-email-center-grid">
        <div className="ss-admin-panel">
          <div className="ss-admin-panel-head"><div><p className="ss-admin-kicker">Templates</p><h3>Catálogo premium</h3></div><Mail size={18} /></div>
          <div className="ss-email-template-list">
            {templateRows.map((template: any) => (
              <button key={template.key} className="ss-email-template-item" onClick={() => handlePreview(template.key)}>
                <strong>{template.name}</strong>
                <span>{template.description}</span>
                <em>{template.criticality}</em>
              </button>
            ))}
          </div>
        </div>

        <div className="ss-admin-panel ss-email-panel-large">
          <div className="ss-admin-panel-head"><div><p className="ss-admin-kicker">Observabilidad</p><h3>Eventos recientes</h3></div><Eye size={18} /></div>
          <div className="ss-email-table">
            <div className="ss-email-table-head"><span>Destinatario</span><span>Propósito</span><span>Estado</span><span>Fecha</span></div>
            {eventRows.length ? eventRows.slice(0, 10).map((event: any) => (
              <div className="ss-email-table-row" key={event.id}>
                <span>{event.to_email || event.recipient || event.to || 'sin-email'}</span>
                <span>{event.purpose || 'generic'}</span>
                <em className={statusClass(event.status)}>{event.status || 'unknown'}</em>
                <span>{event.created_at ? new Date(event.created_at).toLocaleString() : '—'}</span>
              </div>
            )) : <p className="ss-admin-empty">Sin eventos recientes.</p>}
          </div>
        </div>
      </section>

      {previewHtml && (
        <section className="ss-admin-panel ss-email-preview-panel">
          <div className="ss-admin-panel-head"><div><p className="ss-admin-kicker">Preview</p><h3>Template seleccionado</h3></div><ShieldCheck size={18} /></div>
          <iframe title="Email template preview" srcDoc={previewHtml} className="ss-email-preview-frame" />
        </section>
      )}
    </div>
  );
}

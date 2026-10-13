import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/SEO';
import { UixPageShell } from '../../components/uix/UixPageShell';
import { ShieldCheck, CheckCircle2, AlertCircle, Send, RotateCcw } from 'lucide-react';

const dataCategories = [
  'Datos de cuenta y perfil, si creaste una cuenta en la tienda.',
  'Datos de contacto enviados por formularios de soporte o comunicación.',
  'Datos de pedidos necesarios para procesar compras, soporte, devoluciones y obligaciones contables.',
  'Datos de carrito, wishlist y preferencias operativas asociadas a la tienda.',
  'Eventos tecnicos de medicion y marketing, incluidos identificadores de evento usados para deduplicacion con Meta cuando la integracion este habilitada.',
];

const procedure = [
  'Envia una solicitud desde el formulario en esta pagina, desde la pagina de contacto o al canal de soporte publicado, usando el mismo correo asociado a tu cuenta o compra.',
  'Incluye, si aplica, el ID o referencia de pedido. Por seguridad, no envies datos de tarjeta, contrasenas, codigos 2FA, tokens ni documentos sensibles.',
  'El equipo revisara la solicitud y verificara tu identidad razonablemente a traves del correo registrado para evitar solicitudes no autorizadas.',
  'Se confirmara que datos pueden eliminarse o anonimizarse, y que informacion debe conservarse de forma justificada por obligaciones legales, fiscales, contables, antifraude o de resolucion de disputas.',
  'Esta pagina no ejecuta eliminaciones automaticas en produccion. Las solicitudes se atienden mediante revision manual controlada y no se promete eliminacion instantanea.',
];

const REQUEST_TYPE_OPTIONS = [
  { id: 'account', label: 'Datos de cuenta y perfil' },
  { id: 'contact', label: 'Mensajes de contacto y soporte' },
  { id: 'orders', label: 'Historial de pedidos y compras' },
  { id: 'marketing', label: 'Comunicaciones comerciales y promociones' },
  { id: 'meta_events', label: 'Eventos tecnicos de medicion / Meta' },
  { id: 'other', label: 'Otros datos asociados' },
] as const;

type RequestType = typeof REQUEST_TYPE_OPTIONS[number]['id'];

export function DataDeletionPage() {
  const [email, setEmail] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [requestTypes, setRequestTypes] = useState<RequestType[]>(['account']);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ requestId: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTypeToggle = (type: RequestType) => {
    setRequestTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Por favor ingresa un correo electronico valido.');
      return;
    }

    if (requestTypes.length === 0) {
      setErrorMessage('Por favor selecciona al menos una categoria de datos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/privacy/data-deletion-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          orderReference: orderReference.trim() || undefined,
          requestTypes,
          details: details.trim() || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Error al enviar la solicitud');
      }

      const data = await response.json();
      setSubmissionResult({
        requestId: data.requestId || 'RECIBIDO'
      });
      setEmail('');
      setOrderReference('');
      setDetails('');
      setRequestTypes(['account']);
    } catch {
      setErrorMessage('No pudimos procesar tu solicitud en este momento. Por favor verifica tus datos o comunicate con nosotros a traves de Contacto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmissionResult(null);
    setErrorMessage(null);
  };

  return (
    <UixPageShell mainClassName="uix-customer-page">
      <SEO
        title="Eliminacion de datos"
        description="Como solicitar la eliminacion o revision de datos personales relacionados con Selfcare Sinners."
        canonicalPath="/data-deletion"
      />
      <section className="uix-customer-hero uix-legal-hero">
        <div>
          <p className="uix-eyebrow">Privacidad y Cumplimiento</p>
          <h1>Eliminacion de datos</h1>
          <p>Procedimiento e intake seguro para solicitar revision, eliminacion o anonimizacion de datos personales asociados a tu cuenta, compra o contacto.</p>
        </div>
        <span className="uix-legal-updated">Ultima actualizacion: 11 de octubre de 2026</span>
      </section>

      <section className="uix-legal-stack" aria-label="Informacion sobre eliminacion de datos">
        <article className="uix-legal-card">
          <h2>Que puedes solicitar</h2>
          <p>Puedes pedir revision, eliminacion o anonimizacion de datos personales que hayas proporcionado al usar la tienda, sujeto a verificaciones de identidad y a obligaciones legales de conservacion.</p>
          <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem', color: 'var(--ss-soft-muted)', lineHeight: '1.75' }}>
            {dataCategories.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>

        <article className="uix-legal-card">
          <h2>Procedimiento real</h2>
          <ol style={{ marginTop: '0.75rem', paddingLeft: '1.25rem', color: 'var(--ss-soft-muted)', lineHeight: '1.75' }}>
            {procedure.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </article>

        <article className="uix-legal-card">
          <h2>Conservacion y obligaciones legales</h2>
          <p>
            Determinadas categorias de datos (como registros contables, comprobantes de compra o informacion necesaria para atender garantias y prevencion de fraudes) deben conservarse durante los plazos legalmente exigibles antes de poder destruirse o anonimizarse de manera definitiva.
          </p>
        </article>

        <article className="uix-legal-card" aria-label="Formulario de solicitud para revision manual">
          <h2>Formulario de solicitud para revision manual</h2>
          <p style={{ marginBottom: '1rem' }}>
            Ingresa los datos para registrar tu solicitud en nuestra cola de revision manual. Este formulario no elimina datos de forma automatica ni instantanea.
          </p>

          {submissionResult ? (
            <div
              data-testid="data-deletion-success"
              style={{
                padding: '1.5rem',
                borderRadius: '16px',
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                display: 'grid',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', fontWeight: 700 }}>
                <CheckCircle2 size={20} />
                <span>Solicitud recibida para revision manual</span>
              </div>
              <p style={{ margin: 0, color: 'var(--ss-soft-text)', fontSize: '0.9rem' }}>
                Folio de seguimiento: <strong>{submissionResult.requestId}</strong>
              </p>
              <p style={{ margin: 0, color: 'var(--ss-soft-muted)', fontSize: '0.85rem' }}>
                Tu solicitud ha sido ingresada a nuestro proceso de revision manual. No se ha ejecutado ninguna eliminacion automatica de datos. Nos pondremos en contacto contigo a traves del correo registrado para dar seguimiento al estado de tu peticion.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="uix-action-secondary"
                style={{
                  marginTop: '0.5rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  alignSelf: 'start',
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem'
                }}
              >
                <RotateCcw size={14} /> Registrar otra solicitud
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="uix-contact-form" style={{ marginTop: '0.5rem' }}>
              {errorMessage && (
                <div
                  role="alert"
                  data-testid="data-deletion-error"
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#b91c1c',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.85rem'
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <label>
                <span>Correo electronico registrado *</span>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  disabled={isSubmitting}
                />
              </label>

              <label>
                <span>Referencia o ID de pedido (opcional)</span>
                <input
                  type="text"
                  value={orderReference}
                  onChange={(e) => setOrderReference(e.target.value)}
                  placeholder="Ej. ss-ord-..."
                  disabled={isSubmitting}
                />
              </label>

              <div>
                <span style={{ color: 'var(--ss-soft-text)', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                  Categorias solicitadas *
                </span>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {REQUEST_TYPE_OPTIONS.map((opt) => (
                    <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--ss-soft-text)' }}>
                      <input
                        type="checkbox"
                        checked={requestTypes.includes(opt.id)}
                        onChange={() => handleTypeToggle(opt.id)}
                        disabled={isSubmitting}
                        style={{ width: 'auto', minHeight: 'auto' }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label>
                <span>Detalles adicionales (opcional)</span>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe detalles adicionales de tu solicitud (max. 1000 caracteres)."
                  disabled={isSubmitting}
                />
              </label>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--ss-soft-muted)', background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '10px' }}>
                <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--ss-soft-accent)' }} />
                <span>
                  Aviso de seguridad: No incluyas contrasenas, numeros de tarjeta, claves bancarias ni datos altamente sensibles.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="uix-action-primary uix-contact-submit"
              >
                {isSubmitting ? 'Registrando solicitud...' : <><Send size={16} /> Enviar solicitud para revision manual</>}
              </button>
            </form>
          )}
        </article>

        <article className="uix-legal-card">
          <h2>Datos relacionados con Meta</h2>
          <p>Cuando existan integraciones de medicion con Meta, las solicitudes internas pueden revisar eventos enviados por la tienda y sus identificadores tecnicos. Las preferencias, controles o eliminaciones dentro de plataformas Meta pueden requerir que uses tambien las herramientas de tu cuenta de Meta.</p>
        </article>

        <article className="uix-legal-card">
          <h2>Enlaces relacionados</h2>
          <p>Consulta la <Link to="/privacy">Politica de Privacidad</Link>, los <Link to="/terms">Terminos y Condiciones</Link> o envia una solicitud desde <Link to="/contact">Contacto</Link>.</p>
        </article>
      </section>
    </UixPageShell>
  );
}

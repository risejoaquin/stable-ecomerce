import React, { useState } from 'react';
import { SEO } from '../../components/SEO';
import { toast } from 'react-hot-toast';
import { Mail, MessageCircle, Send } from 'lucide-react';
import { UixPageShell } from '../../components/uix/UixPageShell';

export function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('No fue posible enviar el mensaje');
      toast.success('Mensaje enviado. Te responderemos lo antes posible.');
      setFormData({ name: '', email: '', message: '' });
    } catch {
      toast.error('No pudimos enviar tu mensaje. Inténtalo nuevamente más tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <UixPageShell mainClassName="uix-customer-page">
      <SEO title="Contáctanos" description="Contacta al equipo de Selfcare Sinners para soporte de compras y pedidos." canonicalPath="/contact" />
      <section className="uix-customer-hero">
        <div>
          <p className="uix-eyebrow">Soporte Selfcare Sinners</p>
          <h1>Estamos para ayudarte</h1>
          <p>Cuéntanos qué necesitas. Si tu consulta es sobre una compra, agrega tu ID de pedido para poder ayudarte más rápido.</p>
        </div>
        <div className="uix-contact-proof"><Mail size={18} /><span>Soporte por correo</span></div>
      </section>

      <section className="uix-contact-layout">
        <aside className="uix-contact-side">
          <MessageCircle size={24} />
          <p className="uix-eyebrow">Antes de escribir</p>
          <h2>Incluye contexto suficiente.</h2>
          <p>Correo de compra, ID de pedido y una descripción concreta nos ayudan a resolver tu solicitud sin mensajes adicionales.</p>
        </aside>

        <form onSubmit={handleSubmit} className="uix-contact-form">
          <label>
            <span>Nombre</span>
            <input required type="text" autoComplete="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Tu nombre" />
          </label>
          <label>
            <span>Correo</span>
            <input required type="email" autoComplete="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="tu@email.com" />
          </label>
          <label>
            <span>Mensaje</span>
            <textarea required rows={6} value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} placeholder="¿Cómo podemos ayudarte?" />
          </label>
          <button type="submit" disabled={isSubmitting} className="uix-action-primary uix-contact-submit">
            {isSubmitting ? 'Enviando...' : <><Send size={16} /> Enviar mensaje</>}
          </button>
        </form>
      </section>
    </UixPageShell>
  );
}

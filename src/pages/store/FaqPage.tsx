import { Link } from 'react-router-dom';
import { StoreHeader } from '../../components/storefront/StoreHeader';
import { SEO } from '../../components/SEO';
import { useStoreConfig } from '../../hooks/useStoreConfig';

const faqs = [
  ['¿Necesito crear cuenta para comprar?', 'No. Puedes comprar como invitado con tu correo. Si tienes cuenta, tus pedidos quedan vinculados a Mi cuenta.'],
  ['¿Cuándo se descuenta el inventario?', 'El inventario se descuenta cuando Stripe confirma el pago exitoso. Así evitamos consumir stock por carritos abandonados.'],
  ['¿Cómo rastreo mi pedido?', 'En la página Rastrear pedido usando el ID de orden y el correo usado en checkout.'],
  ['¿Puedo aplicar cupones?', 'Sí. El carrito valida cupones activos, mínimos de compra y límites de uso antes de crear la orden.'],
  ['¿Dónde están las políticas?', 'Privacidad, términos, devoluciones y contacto están visibles en el footer para que puedas revisar antes de comprar.'],
  ['¿Qué hago si mi pago fue aceptado pero no veo el pedido?', 'Contáctanos con tu correo, ID de orden o comprobante. El panel operativo registra eventos Stripe, auditoría e inventario para reconciliar rápido.'],
];

export function FaqPage() {
  const { data: store } = useStoreConfig();
  const themeColor = store?.config?.themeColor || '#6B705C';
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      <SEO title="FAQ | Selfcare Sinners" description="Preguntas frecuentes de compra, pagos, pedidos, rastreo y devoluciones." />
      <StoreHeader />
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-12">
        <p className="text-xs uppercase tracking-[0.25em] font-black opacity-50 mb-3">Ayuda</p>
        <h1 className="font-serif text-4xl sm:text-5xl mb-4">Preguntas frecuentes</h1>
        <p className="opacity-70 mb-8">Información clara para comprar en Selfcare Sinners con menos fricción.</p>
        <div className="space-y-4">
          {faqs.map(([q, a]) => (
            <article key={q} className="bg-white border border-[#E5E5E1] rounded-3xl p-6">
              <h2 className="font-black text-lg mb-2">{q}</h2>
              <p className="opacity-70 leading-relaxed">{a}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 bg-white border border-[#E5E5E1] rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-black text-xl">¿No encontraste respuesta?</h2>
            <p className="opacity-65">Escríbenos desde contacto y agrega tu ID de pedido si aplica.</p>
          </div>
          <Link to="/contact" className="px-5 py-3 rounded-2xl text-white font-black" style={{ backgroundColor: themeColor }}>Contactar</Link>
        </div>
      </main>
    </div>
  );
}

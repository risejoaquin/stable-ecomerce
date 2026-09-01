import { ArrowRight, Sparkles } from 'lucide-react';

export function PremiumHero({ featuredImage, featuredName }: { featuredImage?: string; featuredName?: string }) {
  return (
    <section className="premium-hero">
      <div className="premium-container premium-hero-grid">
        <div>
          <span className="premium-kicker"><Sparkles size={14} /> Premium Clean Beauty</span>
          <h1>Skincare curado para una rutina que sí se siente premium.</h1>
          <p>Una tienda más editorial, clara y confiable: producto protagonista, beneficios visibles, navegación simple y compra sin fricción.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a className="premium-button-primary" href="#catalogo">Comprar ahora <ArrowRight size={18} /></a>
            <a className="premium-button-secondary" href="#rutinas">Ver rutinas</a>
          </div>
        </div>
        <div className="premium-hero-card">
          {featuredImage ? <img src={featuredImage} alt={featuredName || 'Producto destacado'} /> : null}
          <div className="premium-hero-badge">
            <p className="mb-1 text-xs font-black uppercase tracking-[.18em] text-black/50">Selección destacada</p>
            <h2 className="text-2xl font-black tracking-[-.04em]">{featuredName || 'Rutinas limpias, seguras y fáciles de sostener'}</h2>
            <p className="mt-2 text-sm text-black/60">Compra segura, seguimiento claro y experiencia optimizada para móvil.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

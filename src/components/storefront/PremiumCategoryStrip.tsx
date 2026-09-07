const defaults = ['Limpiadores', 'Hidratación', 'Protección solar', 'Rutinas'];
export function PremiumCategoryStrip({ categories = defaults }: { categories?: string[] }) {
  return <section className="premium-section"><div className="premium-container"><div className="premium-category-grid">{categories.map((name) => <a key={name} href={`/#${name.toLowerCase()}`} className="premium-category-card"><p className="text-xs font-black uppercase tracking-[.18em] text-black/40">Categoría</p><h3 className="mt-2 text-xl font-black tracking-[-.03em]">{name}</h3><p className="mt-2 text-sm text-black/55">Explora selección curada.</p></a>)}</div></div></section>;
}

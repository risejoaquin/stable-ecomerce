import { ShoppingBag } from 'lucide-react';

export function PremiumProductCard({ product, onAdd }: { product: any; onAdd?: (product: any) => void }) {
  const image = product?.images?.[0] || product?.image;
  const price = Number(product?.price || 0);
  return (
    <article className="premium-product-card">
      <div className="premium-product-media">
        {image ? <img src={image} alt={product?.name || 'Producto'} loading="lazy" /> : <div className="grid h-full place-items-center text-sm text-black/40">Selfcare Sinners</div>}
        <span className="absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-black/65 backdrop-blur">Curado</span>
      </div>
      <div className="premium-product-body">
        <h3 className="premium-product-title">{product?.name || 'Producto seleccionado'}</h3>
        <p className="premium-product-benefit mt-1">{product?.short_description || product?.description || 'Selección premium para tu rutina diaria.'}</p>
        <div className="premium-price-row">
          <span className="premium-price">MXN ${price.toFixed(2)}</span>
          <button onClick={() => onAdd?.(product)} className="grid h-10 w-10 place-items-center rounded-full bg-black text-white" aria-label="Añadir al carrito"><ShoppingBag size={17} /></button>
        </div>
      </div>
    </article>
  );
}

import { Link } from 'react-router-dom';
import { ShoppingBag, Search, UserRound, Menu } from 'lucide-react';

export function PremiumHeader({ cartCount = 0 }: { cartCount?: number }) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/80 backdrop-blur-xl">
      <div className="premium-container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="text-lg font-black tracking-[-0.04em]">Selfcare Sinners</Link>
        <nav className="hidden items-center gap-7 text-sm font-bold text-black/70 md:flex">
          <a href="/#catalogo">Comprar</a>
          <a href="/#rutinas">Rutinas</a>
          <Link to="/faq">FAQ</Link>
          <Link to="/track">Rastrear</Link>
        </nav>
        <div className="flex items-center gap-2">
          <button className="hidden h-10 w-10 place-items-center rounded-full border border-black/10 bg-white sm:grid" aria-label="Buscar"><Search size={18} /></button>
          <Link to="/profile" className="hidden h-10 w-10 place-items-center rounded-full border border-black/10 bg-white sm:grid" aria-label="Perfil"><UserRound size={18} /></Link>
          <button className="relative h-10 w-10 rounded-full bg-black text-white" aria-label="Carrito">
            <ShoppingBag size={18} className="mx-auto" />
            {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#d8a7a0] px-1 text-[10px] font-black text-black">{cartCount}</span>}
          </button>
          <button className="grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white md:hidden" aria-label="Menú"><Menu size={18} /></button>
        </div>
      </div>
    </header>
  );
}

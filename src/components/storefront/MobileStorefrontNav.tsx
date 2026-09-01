import { Home, Search, ShoppingBag, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
export function MobileStorefrontNav({ cartCount = 0 }: { cartCount?: number }) {
  return <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 rounded-full border border-black/10 bg-white/90 p-2 shadow-2xl backdrop-blur md:hidden"><Link className="grid place-items-center py-2" to="/"><Home size={18}/></Link><a className="grid place-items-center py-2" href="/#catalogo"><Search size={18}/></a><button className="relative grid place-items-center py-2"><ShoppingBag size={18}/>{cartCount>0&&<span className="absolute right-5 top-1 h-4 min-w-4 rounded-full bg-black px-1 text-[10px] text-white">{cartCount}</span>}</button><Link className="grid place-items-center py-2" to="/profile"><UserRound size={18}/></Link></nav>;
}

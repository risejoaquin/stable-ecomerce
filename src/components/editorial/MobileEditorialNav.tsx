import { Link } from 'react-router-dom';
import { Grid3X3, Heart, Home, ShoppingBag, UserRound } from 'lucide-react';

export function MobileEditorialNav({ cartCount = 0, onCartOpen }: { cartCount?: number; onCartOpen?: () => void }) {
  return (
    <nav className="ss-mobile-nav" aria-label="Navegación mobile de tienda">
      <Link to="/"><Home size={17} aria-hidden="true" /><span>Inicio</span></Link>
      <a href="/#shop"><Grid3X3 size={17} aria-hidden="true" /><span>Tienda</span></a>
      <Link to="/wishlist"><Heart size={17} aria-hidden="true" /><span>Favoritos</span></Link>
      <Link to="/profile" className="ss-mobile-account-link"><UserRound size={17} aria-hidden="true" /><span>Cuenta</span></Link>
      <button onClick={onCartOpen} type="button"><ShoppingBag size={17} aria-hidden="true" /><span>Bolsa {cartCount}</span></button>
    </nav>
  );
}

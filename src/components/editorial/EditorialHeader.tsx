import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function EditorialHeader({ cartCount = 0, onCartOpen, backButton = false }: { cartCount?: number; onCartOpen?: () => void; backButton?: boolean }) {
  return (
    <header className="ss-editorial-header">
      <div className="ss-editorial-header-inner">
        <nav className="ss-editorial-nav" aria-label="Navegación de tienda">
          {backButton ? <Link to="/" className="ss-editorial-back-button"><ArrowLeft size={15} /> &nbsp;VOLVER</Link> : <a href="/#shop">Tienda</a>}
          <a href="/#lookbook">Rutinas</a>
          <Link to="/faq">Ayuda</Link>
        </nav>
        <Link to="/" className="ss-editorial-logo ss-display" aria-label="Selfcare Sinners home">
          Selfcare Sinners
          <span>Skincare consciente</span>
        </Link>
        <button className="ss-editorial-cart-button" onClick={onCartOpen} type="button">Bolsa ({cartCount})</button>
      </div>
    </header>
  );
}

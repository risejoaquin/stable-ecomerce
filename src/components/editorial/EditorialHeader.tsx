import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function EditorialHeader({ cartCount = 0, onCartOpen, backButton = false }: { cartCount?: number; onCartOpen?: () => void; backButton?: boolean }) {
  return (
    <header className="ss-editorial-header">
      <div className="ss-editorial-header-inner">
        <nav className="ss-editorial-nav" aria-label="Storefront navigation">
          {backButton ? <Link to="/" className="ss-editorial-back-button"><ArrowLeft size={15} /> &nbsp;BACK</Link> : <a href="/#shop">SHOP</a>}
          <a href="/#lookbook">LOOKBOOK</a>
          <Link to="/faq">FAQ</Link>
        </nav>
        <Link to="/" className="ss-editorial-logo ss-display" aria-label="Selfcare Sinners home">
          SELFCARE<br />SINNERS
          <span>SKINCARE EDITORIAL</span>
        </Link>
        <button className="ss-editorial-cart-button" onClick={onCartOpen} type="button">BAG ({cartCount})</button>
      </div>
    </header>
  );
}

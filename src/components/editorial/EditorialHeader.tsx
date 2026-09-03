import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, ShoppingBag } from 'lucide-react';
import { AccountMenu } from '../account/AccountMenu';

type EditorialHeaderProps = {
  cartCount?: number;
  onCartOpen?: () => void;
  backButton?: boolean;
};

export function EditorialHeader({ cartCount = 0, onCartOpen, backButton = false }: EditorialHeaderProps) {
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

        <div className="ss-editorial-actions" aria-label="Acciones de cuenta y compra">
          <AccountMenu />
          <Link to="/wishlist" className="ss-editorial-icon-link" aria-label="Ir a favoritos">
            <Heart size={17} aria-hidden="true" />
            <span>Wishlist</span>
          </Link>
          <button className="ss-editorial-cart-button" onClick={onCartOpen} type="button" aria-label={`Abrir bolsa con ${cartCount} productos`}>
            <ShoppingBag size={17} aria-hidden="true" />
            <span>Bolsa ({cartCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, CreditCard, Grid3X3, Heart, Home, LayoutDashboard, LogIn, LogOut, MapPin, Package, Settings, ShoppingBag, TicketPercent, UserRound, X } from 'lucide-react';
import { SignInButton } from '../AuthMock';
import { useAuthSafe } from '../../hooks/useAuthSafe';
import { logoutUser } from '../../lib/auth-session';

const mobileAccountLinks = [
  { to: '/profile', label: 'Mi perfil', icon: UserRound },
  { to: '/my-orders', label: 'Mis pedidos', icon: Package },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/profile#rewards', label: 'Rewards y cupones', icon: TicketPercent },
  { to: '/profile#direcciones', label: 'Direcciones', icon: MapPin },
  { to: '/profile#pagos', label: 'Métodos de pago', icon: CreditCard },
  { to: '/profile#notificaciones', label: 'Notificaciones', icon: Bell },
  { to: '/profile#configuracion', label: 'Configuración', icon: Settings },
];


export function MobileEditorialNav({ cartCount = 0, onCartOpen }: { cartCount?: number; onCartOpen?: () => void }) {
  const [accountOpen, setAccountOpen] = React.useState(false);
  const { isSignedIn, role } = useAuthSafe();

  React.useEffect(() => {
    if (!accountOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false);
    };
    document.body.classList.add('ss-mobile-sheet-open');
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('ss-mobile-sheet-open');
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountOpen]);

  return (
    <>
      <nav className="ss-mobile-nav" aria-label="Navegación mobile de tienda">
        <Link to="/"><Home size={17} aria-hidden="true" /><span>Inicio</span></Link>
        <a href="/#shop"><Grid3X3 size={17} aria-hidden="true" /><span>Tienda</span></a>
        <Link to="/wishlist"><Heart size={17} aria-hidden="true" /><span>Favoritos</span></Link>
        {isSignedIn ? (
          <button type="button" className="ss-mobile-account-link" onClick={() => setAccountOpen(true)} aria-haspopup="dialog" aria-expanded={accountOpen}>
            <UserRound size={17} aria-hidden="true" /><span>Cuenta</span>
          </button>
        ) : (
          <SignInButton mode="modal">
            <button type="button" className="ss-mobile-account-link">
              <LogIn size={17} aria-hidden="true" /><span>Ingresar</span>
            </button>
          </SignInButton>
        )}
        <button onClick={onCartOpen} type="button"><ShoppingBag size={17} aria-hidden="true" /><span>Bolsa {cartCount}</span></button>
      </nav>

      {accountOpen && (
        <div className="ss-mobile-account-overlay" role="presentation" onClick={() => setAccountOpen(false)}>
          <section className="ss-mobile-account-sheet" role="dialog" aria-modal="true" aria-label="Menú de cuenta" onClick={(event) => event.stopPropagation()}>
            <div className="ss-mobile-account-handle" aria-hidden="true" />
            <div className="ss-mobile-account-head">
              <div>
                <span>Selfcare Sinners</span>
                <strong>Mi cuenta</strong>
                <small>Accesos rápidos de tu perfil</small>
              </div>
              <button type="button" onClick={() => setAccountOpen(false)} aria-label="Cerrar menú de cuenta">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="ss-mobile-account-list">
              {role === 'admin' && (
                <Link to="/admin" onClick={() => setAccountOpen(false)} className="ss-mobile-account-item ss-mobile-account-admin">
                  <LayoutDashboard size={18} aria-hidden="true" />
                  <span>Panel administrador</span>
                </Link>
              )}
              {mobileAccountLinks.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} onClick={() => setAccountOpen(false)} className="ss-mobile-account-item">
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>

            <button type="button" className="ss-mobile-account-logout" onClick={() => logoutUser({ redirectTo: '/' })}>
              <LogOut size={18} aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
          </section>
        </div>
      )}
    </>
  );
}

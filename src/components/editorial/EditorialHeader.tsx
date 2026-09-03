import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, CreditCard, Heart, LayoutDashboard, LogIn, LogOut, MapPin, Package, Settings, ShoppingBag, TicketPercent, UserRound } from 'lucide-react';
import { SignInButton } from '../AuthMock';
import { useAuthSafe } from '../../hooks/useAuthSafe';
import { logoutUser } from '../../lib/auth-session';

type EditorialHeaderProps = {
  cartCount?: number;
  onCartOpen?: () => void;
  backButton?: boolean;
};

const accountLinks = [
  { to: '/profile', label: 'Mi perfil', description: 'Resumen de cuenta', icon: UserRound },
  { to: '/my-orders', label: 'Mis pedidos', description: 'Historial y seguimiento', icon: Package },
  { to: '/wishlist', label: 'Wishlist', description: 'Productos guardados', icon: Heart },
  { to: '/profile#direcciones', label: 'Direcciones', description: 'Envío y facturación', icon: MapPin },
  { to: '/profile#pagos', label: 'Métodos de pago', description: 'Tarjetas guardadas', icon: CreditCard },
  { to: '/profile#rewards', label: 'Rewards / cupones', description: 'Beneficios disponibles', icon: TicketPercent },
  { to: '/profile#notificaciones', label: 'Notificaciones', description: 'Alertas y preferencias', icon: Bell },
  { to: '/profile#configuracion', label: 'Configuración', description: 'Seguridad y privacidad', icon: Settings },
];


function AccountDropdown() {
  const { isSignedIn, role } = useAuthSafe();
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button className="ss-editorial-icon-link ss-editorial-account-trigger" type="button" aria-label="Iniciar sesión">
          <LogIn size={17} aria-hidden="true" />
          <span>Ingresar</span>
        </button>
      </SignInButton>
    );
  }

  return (
    <div className="ss-account-menu" ref={menuRef}>
      <button
        className="ss-editorial-icon-link ss-editorial-account-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="ss-account-dropdown"
        aria-label="Abrir menú de cuenta"
        onClick={() => setOpen((current) => !current)}
      >
        <UserRound size={17} aria-hidden="true" />
        <span>Cuenta</span>
      </button>

      {open && (
        <div id="ss-account-dropdown" className="ss-account-dropdown" role="menu" aria-label="Apartados de cuenta">
          <div className="ss-account-dropdown-head">
            <span className="ss-account-avatar" aria-hidden="true">SS</span>
            <div>
              <strong>Mi cuenta</strong>
              <small>Gestiona pedidos, rewards y soporte</small>
            </div>
          </div>

          <div className="ss-account-dropdown-grid">
            {role === 'admin' && (
              <Link to="/admin" className="ss-account-dropdown-item ss-account-admin-item" role="menuitem" onClick={() => setOpen(false)}>
                <LayoutDashboard size={17} aria-hidden="true" />
                <span><strong>Panel administrador</strong><small>Operación y catálogo</small></span>
              </Link>
            )}
            {accountLinks.map(({ to, label, description, icon: Icon }) => (
              <Link key={to} to={to} className="ss-account-dropdown-item" role="menuitem" onClick={() => setOpen(false)}>
                <Icon size={17} aria-hidden="true" />
                <span><strong>{label}</strong><small>{description}</small></span>
              </Link>
            ))}
          </div>

          <button className="ss-account-logout" type="button" role="menuitem" onClick={() => logoutUser({ redirectTo: '/' })}>
            <LogOut size={17} aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  );
}

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
          <AccountDropdown />
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

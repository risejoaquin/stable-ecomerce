import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut, UserRound } from 'lucide-react';
import { useAuthSafe } from '../../hooks/useAuthSafe';
import { logoutUser } from '../../lib/auth-session';
import { openAuthDialog } from '../../lib/auth-modal';
import { getAccountNavigationLinks } from './account-links';

type AccountMenuProps = {
  triggerClassName?: string;
  triggerLabel?: string;
  anonymousLabel?: string;
};

export function AccountMenu({ triggerClassName = 'ss-editorial-icon-link ss-editorial-account-trigger', triggerLabel = 'Cuenta', anonymousLabel = 'Ingresar' }: AccountMenuProps) {
  const { isSignedIn, role } = useAuthSafe();
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const links = React.useMemo(() => getAccountNavigationLinks(role), [role]);

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
      <button className={triggerClassName} type="button" aria-label="Iniciar sesión" onClick={() => openAuthDialog('signin')}>
        <LogIn size={17} aria-hidden="true" />
        {anonymousLabel ? <span>{anonymousLabel}</span> : null}
      </button>
    );
  }

  return (
    <div className="ss-account-menu" ref={menuRef}>
      <button
        className={triggerClassName}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="ss-account-dropdown"
        aria-label="Abrir menú de cuenta"
        onClick={() => setOpen((current) => !current)}
      >
        <UserRound size={17} aria-hidden="true" />
        <span>{triggerLabel}</span>
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
            {links.map(({ to, label, description, icon: Icon, adminOnly }) => (
              <Link key={to} to={to} className={`ss-account-dropdown-item${adminOnly ? ' ss-account-admin-item' : ''}`} role="menuitem" onClick={() => setOpen(false)}>
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

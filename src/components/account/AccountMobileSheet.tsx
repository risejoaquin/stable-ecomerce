import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut, UserRound, X } from 'lucide-react';
import { useAuthSafe } from '../../hooks/useAuthSafe';
import { logoutUser } from '../../lib/auth-session';
import { openAuthDialog } from '../../lib/auth-modal';
import { getAccountNavigationLinks } from './account-links';

type AccountMobileSheetProps = {
  buttonClassName?: string;
};

export function AccountMobileSheet({ buttonClassName = 'ss-mobile-account-link' }: AccountMobileSheetProps) {
  const [accountOpen, setAccountOpen] = React.useState(false);
  const { isSignedIn, role } = useAuthSafe();
  const links = React.useMemo(() => getAccountNavigationLinks(role), [role]);

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

  if (!isSignedIn) {
    return (
      <button type="button" className={buttonClassName} aria-label="Iniciar sesión" onClick={() => openAuthDialog('signin')}>
        <LogIn size={17} aria-hidden="true" /><span>Ingresar</span>
      </button>
    );
  }

  return (
    <>
      <button type="button" className={buttonClassName} onClick={() => setAccountOpen(true)} aria-haspopup="dialog" aria-expanded={accountOpen} aria-label="Abrir menú de cuenta">
        <UserRound size={17} aria-hidden="true" /><span>Cuenta</span>
      </button>

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
              {links.map(({ to, label, icon: Icon, adminOnly }) => (
                <Link key={to} to={to} onClick={() => setAccountOpen(false)} className={`ss-mobile-account-item${adminOnly ? ' ss-mobile-account-admin' : ''}`}>
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

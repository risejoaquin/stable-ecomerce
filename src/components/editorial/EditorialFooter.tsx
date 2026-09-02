import { Link } from 'react-router-dom';

export function EditorialFooter({ storeName = 'Selfcare Sinners' }: { storeName?: string }) {
  return (
    <footer className="ss-editorial-footer">
      <div className="ss-footer-inner">
        <div>
          <p className="ss-topline">Beauty commerce</p>
          <h2 className="ss-footer-logo ss-display">SELFCARE<br />SINNERS</h2>
          <p style={{ color: 'rgba(251,247,240,.68)', marginTop: '1rem' }}>© {new Date().getFullYear()} {storeName}. Skincare seleccionado con dirección editorial.</p>
        </div>
        <nav className="ss-footer-links">
          <Link to="/faq">FAQ</Link>
          <Link to="/contact">Contacto</Link>
          <Link to="/returns">Devoluciones</Link>
          <Link to="/privacy">Privacidad</Link>
          <Link to="/terms">Términos</Link>
        </nav>
      </div>
    </footer>
  );
}

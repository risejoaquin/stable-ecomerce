import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function EditorialLookbookSection() {
  return (
    <section id="lookbook" className="ss-editorial-section">
      <div className="ss-section-head">
        <div>
          <p className="ss-topline">Campaign edits</p>
          <h2 className="ss-section-title ss-display">LOOKBOOK<br />ROUTINES</h2>
        </div>
        <p className="ss-section-note">Bloques editoriales para vender por intención: piel limpia, barrera, hidratación, rutina de noche y recompra.</p>
      </div>
      <div className="ss-lookbook-grid">
        <div className="ss-lookbook-tile">
          <p className="ss-topline">Night ritual</p>
          <h3 className="ss-lookbook-title ss-display">RESET<br />YOUR SKIN</h3>
          <p style={{ color: 'rgba(251,247,240,.72)', maxWidth: '30rem', marginTop: '1rem' }}>Una composición visual más editorial para campañas, contenido educativo y bundles.</p>
        </div>
        <div className="ss-lookbook-tile light">
          <p className="ss-topline">Daily edit</p>
          <h3 className="ss-lookbook-title ss-display">CLEAN<br />STACK</h3>
          <Link className="ss-btn-outline" to="/#shop" style={{ marginTop: '1.2rem', width: 'fit-content' }}>Shop edit <ArrowRight size={15} /></Link>
        </div>
      </div>
    </section>
  );
}

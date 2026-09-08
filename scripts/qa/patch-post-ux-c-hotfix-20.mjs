import fs from 'node:fs';

const path = 'src/pages/store/ProductDetailPage.tsx';
let source = fs.readFileSync(path, 'utf8');

const already = `{secondaryContentReady && (
          <>
            {similarProducts.length > 0 && (`;

if (source.includes(already)) {
  console.log('SKIP HOTFIX 20 below-fold deferral already applied');
  process.exit(0);
}

const from = `        {similarProducts.length > 0 && (
          <section className="ss-editorial-section">
            <div className="ss-section-head">
              <div>
                <p className="ss-topline">También te puede gustar</p>
                <h2 className="ss-section-title ss-display">Completa<br />tu rutina</h2>
              </div>
            </div>
            <div className="ss-collection-grid">
              {similarProducts.map((similar: any) => <EditorialProductCard key={similar.id} product={similar} />)}
            </div>
          </section>
        )}

        <section className="ss-editorial-section">
          <div className="ss-section-head">
            <div>
              <p className="ss-topline">Comunidad</p>
              <h2 className="ss-section-title ss-display">Reseñas</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2"><Suspense fallback={null}><LazyReviewList productId={product.id} themeColor="#0b0b0a" /></Suspense></div>
            <div>{isSignedIn ? <Suspense fallback={null}><LazyReviewForm productId={product.id} themeColor="#0b0b0a" /></Suspense> : <div className="border p-8" style={{ borderColor: 'var(--ss-line)' }}>Inicia sesión para escribir una reseña.</div>}</div>
          </div>
        </section>

        <EditorialFooter storeName={currentStore.name || 'Selfcare Sinners'} />
        <MobileEditorialNav cartCount={cartItemCount} onCartOpen={() => setIsCartOpen(true)} />`;

const to = `        {secondaryContentReady && (
          <>
            {similarProducts.length > 0 && (
              <section className="ss-editorial-section">
                <div className="ss-section-head">
                  <div>
                    <p className="ss-topline">También te puede gustar</p>
                    <h2 className="ss-section-title ss-display">Completa<br />tu rutina</h2>
                  </div>
                </div>
                <div className="ss-collection-grid">
                  {similarProducts.map((similar: any) => <EditorialProductCard key={similar.id} product={similar} />)}
                </div>
              </section>
            )}

            <section className="ss-editorial-section">
              <div className="ss-section-head">
                <div>
                  <p className="ss-topline">Comunidad</p>
                  <h2 className="ss-section-title ss-display">Reseñas</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2"><Suspense fallback={null}><LazyReviewList productId={product.id} themeColor="#0b0b0a" /></Suspense></div>
                <div>{isSignedIn ? <Suspense fallback={null}><LazyReviewForm productId={product.id} themeColor="#0b0b0a" /></Suspense> : <div className="border p-8" style={{ borderColor: 'var(--ss-line)' }}>Inicia sesión para escribir una reseña.</div>}</div>
              </div>
            </section>

            <EditorialFooter storeName={currentStore.name || 'Selfcare Sinners'} />
          </>
        )}

        <MobileEditorialNav cartCount={cartItemCount} onCartOpen={() => setIsCartOpen(true)} />`;

if (!source.includes(from)) {
  throw new Error('HOTFIX 20 expected below-fold block not found');
}

source = source.replace(from, to);
fs.writeFileSync(path, source, 'utf8');

console.log('PATCH HOTFIX 20 defer below-fold PDP DOM behind secondaryContentReady');
console.log('PASS POST-UX C HOTFIX 20 patch applied');

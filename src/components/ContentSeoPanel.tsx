export function ContentSeoPanel() {
  return (
    <section className="rounded-3xl border bg-white p-6 shadow-sm">
      <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">POST-LAUNCH 24</p>
      <h2 className="mt-2 text-2xl font-semibold text-neutral-950">Production Content, SEO & Campaign Landing Pages</h2>
      <p className="mt-3 text-neutral-600">
        Panel de referencia para contenido final, profundidad SEO, landings comerciales, intención de búsqueda,
        contenido educativo y readiness para tráfico orgánico/pagado.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-neutral-50 p-4"><strong>Content</strong><p>Copy final de producción.</p></div>
        <div className="rounded-2xl bg-neutral-50 p-4"><strong>SEO</strong><p>Profundidad e intención.</p></div>
        <div className="rounded-2xl bg-neutral-50 p-4"><strong>Campaigns</strong><p>Landing pages listas.</p></div>
      </div>
    </section>
  );
}

import React from 'react';
import { BarChart3, Boxes, Megaphone, MessageSquare, Plus, ShieldCheck, Star, TrendingUp } from 'lucide-react';
import { useAdminCampaigns, useAdminReviews, useCommercialSummary, useCreateCampaign, useModerateReview, useProductReadiness, useConversionSummary } from '../../hooks/useCommercial';

function MetricCard({ title, value, helper, icon: Icon }: { title: string; value: React.ReactNode; helper?: string; icon: any }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">{title}</p>
        <p className="text-2xl font-serif text-[var(--color-text)] mt-2">{value}</p>
        {helper && <p className="text-xs text-gray-500 mt-1">{helper}</p>}
      </div>
      <div className="w-11 h-11 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
        <Icon size={20} />
      </div>
    </div>
  );
}

export function AdminCommercialPage() {
  const { data: summary, isLoading: summaryLoading } = useCommercialSummary();
  const { data: readiness } = useProductReadiness();
  const { data: campaigns } = useAdminCampaigns();
  const { data: reviews } = useAdminReviews('pending');
  const { data: conversion } = useConversionSummary();
  const createCampaign = useCreateCampaign();
  const moderateReview = useModerateReview();
  const [campaignName, setCampaignName] = React.useState('');

  const createQuickCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) return;
    createCampaign.mutate({
      name: campaignName.trim(),
      type: 'promotion',
      status: 'draft',
      channel: 'storefront',
      notes: 'Created from commercial operations panel.'
    }, { onSuccess: () => setCampaignName('') });
  };

  if (summaryLoading) {
    return <div className="p-10 text-gray-500">Cargando operación comercial...</div>;
  }

  const readinessRows = readiness?.data || [];
  const pendingReviews = reviews?.data || [];
  const campaignRows = Array.isArray(campaigns) ? campaigns : [];

  return (
    <div className="uix-admin-responsive-page bg-[var(--color-background)] min-h-full flex flex-col gap-8" data-mobile-ux-d="commercial">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--color-primary)] font-bold mb-2">Post-launch 02</p>
          <h2 className="font-serif text-3xl text-[var(--color-text)]">Commercial Operations</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl">Catálogo, campañas, reviews y señales comerciales listas para crecimiento controlado.</p>
        </div>
        <div className="bg-white rounded-full border border-gray-100 px-4 py-2 text-xs font-bold text-gray-600 shadow-sm flex items-center gap-2">
          <ShieldCheck size={16} className="text-green-600" /> Growth readiness console
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <MetricCard title="Productos activos" value={summary?.catalog?.activeProducts || 0} helper={`${summary?.catalog?.incompleteProducts || 0} por completar`} icon={Boxes} />
        <MetricCard title="Ingresos 30 días" value={`MXN $${Number(summary?.customers?.revenue30d || 0).toFixed(2)}`} helper={`${summary?.customers?.orders30d || 0} órdenes recientes`} icon={TrendingUp} />
        <MetricCard title="Campañas activas" value={summary?.campaigns?.active || 0} helper={`${summary?.campaigns?.total || 0} campañas totales`} icon={Megaphone} />
        <MetricCard title="Reviews" value={summary?.reviews?.total || 0} helper={`${summary?.reviews?.pending || 0} pendientes · ${summary?.reviews?.averageRating || 0}★ promedio`} icon={Star} />
        <MetricCard title="Conversión 30 días" value={`${conversion?.funnel?.checkoutToPaidRate || 0}%`} helper={`${conversion?.funnel?.checkoutStarted || 0} checkouts · ${conversion?.funnel?.paidOrders || 0} pagados`} icon={TrendingUp} />
      </div>



      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-gray-900">Funnel de conversión</h3>
            <p className="text-xs text-gray-500">Eventos de producto, carrito y checkout de los últimos 30 días.</p>
          </div>
          <BarChart3 size={20} className="text-gray-400" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Vistas de producto</p><p className="font-bold text-xl">{conversion?.funnel?.productViews || 0}</p></div>
          <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Añadidos al carrito</p><p className="font-bold text-xl">{conversion?.funnel?.addToCart || 0}</p></div>
          <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Checkout iniciado</p><p className="font-bold text-xl">{conversion?.funnel?.checkoutStarted || 0}</p></div>
          <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Ingresos</p><p className="font-bold text-xl">MXN ${Number(conversion?.funnel?.revenue || 0).toFixed(2)}</p></div>
        </div>
      </section>

      {summary?.alerts?.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-3">Alertas comerciales</h3>
          <div className="space-y-2">
            {summary.alerts.map((alert: any) => (
              <div key={alert.code} className="text-sm bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-amber-900">{alert.message}</div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Readiness de catálogo</h3>
              <p className="text-xs text-gray-500">Completa SEO, imágenes, categoría, stock y variantes antes de campañas.</p>
            </div>
            <BarChart3 size={20} className="text-gray-400" />
          </div>
          <div className="overflow-auto">
            <table className="uix-admin-data-table w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Producto</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Score</th>
                  <th className="p-4">Checks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {readinessRows.slice(0, 10).map((row: any) => (
                  <tr key={row.id}>
                    <td className="p-4 font-medium text-gray-900">{row.name}</td>
                    <td className="p-4">{row.stock}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${row.score >= 85 ? 'bg-green-50 text-green-700' : row.score >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{row.score}%</span>
                    </td>
                    <td className="p-4 text-xs text-gray-500">{Object.entries(row.checks || {}).filter(([, v]) => Boolean(v)).map(([k]) => k).join(' · ') || 'Sin checks'}</td>
                  </tr>
                ))}
                {readinessRows.length === 0 && <tr><td className="p-8 text-center text-gray-400" colSpan={4}>No hay productos para evaluar.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-5">
          <div>
            <h3 className="font-bold text-gray-900">Crear campaña rápida</h3>
            <p className="text-xs text-gray-500 mt-1">Genera un borrador para una campaña comercial.</p>
          </div>
          <form onSubmit={createQuickCampaign} className="flex gap-2">
            <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Ej. Lanzamiento skincare" className="min-w-0 flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
            <button disabled={createCampaign.isPending} className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-bold disabled:opacity-50"><Plus size={16} /></button>
          </form>
          <div className="space-y-2">
            {campaignRows.slice(0, 6).map((campaign: any) => (
              <div key={campaign.id} className="border border-gray-100 rounded-xl p-3">
                <p className="text-sm font-bold text-gray-900">{campaign.name}</p>
                <p className="text-xs text-gray-500">{campaign.status} · {campaign.channel || 'sin canal'}</p>
              </div>
            ))}
            {campaignRows.length === 0 && <p className="text-sm text-gray-400">Sin campañas configuradas.</p>}
          </div>
        </aside>
      </div>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <MessageSquare size={18} className="text-[var(--color-primary)]" />
          <h3 className="font-bold text-gray-900">Reviews pendientes</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {pendingReviews.slice(0, 8).map((review: any) => (
            <div key={review.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-gray-900">{review.products?.name || 'Producto'} · {review.rating}★</p>
                <p className="text-sm text-gray-500 mt-1">{review.comment || 'Sin comentario'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => moderateReview.mutate({ id: review.id, moderation_status: 'approved' })} className="px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-bold">Aprobar</button>
                <button onClick={() => moderateReview.mutate({ id: review.id, moderation_status: 'rejected' })} className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold">Rechazar</button>
              </div>
            </div>
          ))}
          {pendingReviews.length === 0 && <div className="p-8 text-center text-gray-400">No hay reviews pendientes.</div>}
        </div>
      </section>
    </div>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthSafe } from '../../hooks/useAuthSafe';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../api/useApiClient';
import { toast } from 'react-hot-toast';
import { Bell, CreditCard, Gift, Heart, MapPin, Package, Plus, RotateCcw, ShieldCheck, Ticket, Trash2, Truck, UserRound } from 'lucide-react';
import { UixPageShell } from '../../components/uix/UixPageShell';
import { UixStatePanel } from '../../components/uix/UixStatePanel';
import { UixStatusBadge } from '../../components/uix/UixStatusBadge';
import { useWishlist } from '../../hooks/useWishlist';

type ProfileAddress = {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

const defaultAddress: ProfileAddress = { name: 'Casa', street: '', city: '', state: '', zip: '', country: 'México' };

function normalizeAddresses(profile: any): ProfileAddress[] {
  try {
    if (profile?.addresses) {
      const parsed = typeof profile.addresses === 'string' ? JSON.parse(profile.addresses) : profile.addresses;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    if (profile?.shipping_address) {
      const parsed = typeof profile.shipping_address === 'string' ? JSON.parse(profile.shipping_address) : profile.shipping_address;
      if (parsed && typeof parsed === 'object') return [{ ...defaultAddress, ...parsed }];
    }
  } catch (_) {
    return [{ ...defaultAddress }];
  }
  return [{ ...defaultAddress }];
}

function formatMoney(value: any) {
  const amount = Number(value || 0);
  return `MXN $${amount.toFixed(2)}`;
}

export function ProfilePage() {
  const { isSignedIn, role } = useAuthSafe();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { data: wishlistItems = [] } = useWishlist();

  const { data: profile, isLoading: loadingProfile, error: profileError } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.get('/profile'),
    enabled: isSignedIn
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => apiClient.get('/orders/my'),
    enabled: isSignedIn
  });

  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    addresses: [{ ...defaultAddress }] as ProfileAddress[]
  });

  React.useEffect(() => {
    if (!profile) return;
    setFormData({
      email: profile.email || '',
      fullName: profile.full_name || profile.fullName || '',
      phone: profile.phone || '',
      addresses: normalizeAddresses(profile)
    });
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: (data: any) => apiClient.put('/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Perfil actualizado correctamente');
    },
    onError: () => toast.error('Error al actualizar el perfil')
  });

  if (loadingProfile) {
    return <UixPageShell mainClassName="uix-customer-page"><UixStatePanel tone="loading" title="Cargando perfil" description="Estamos recuperando tus datos reales de cuenta." /></UixPageShell>;
  }

  if (profileError) {
    return <UixPageShell mainClassName="uix-customer-page"><UixStatePanel tone="error" title="No pudimos cargar tu perfil" description="Intenta de nuevo o contacta soporte." actionText="Ir a soporte" actionTo="/contact" /></UixPageShell>;
  }

  const displayName = formData.fullName || profile?.full_name || profile?.email?.split('@')[0] || 'Cliente';
  const initials = displayName.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase() || 'SS';
  const orderCount = Array.isArray(orders) ? orders.length : 0;
  const shippingCount = Array.isArray(orders) ? orders.filter((order: any) => ['enviado', 'shipped', 'in_transit'].includes(String(order.status || '').toLowerCase()) || order.tracking_number).length : 0;
  const wishlistCount = Array.isArray(wishlistItems) ? wishlistItems.length : 0;
  const recentOrders = Array.isArray(orders) ? orders.slice(0, 3) : [];
  const recentWishlist = Array.isArray(wishlistItems) ? wishlistItems.slice(0, 3) : [];

  const addAddress = () => setFormData(f => ({ ...f, addresses: [...f.addresses, { ...defaultAddress, name: 'Nueva dirección' }] }));
  const removeAddress = (index: number) => setFormData(f => ({ ...f, addresses: f.addresses.length <= 1 ? f.addresses : f.addresses.filter((_, i) => i !== index) }));
  const updateAddress = (index: number, field: keyof ProfileAddress, value: string) => {
    setFormData(f => {
      const next = [...f.addresses];
      next[index] = { ...next[index], [field]: value };
      return { ...f, addresses: next };
    });
  };

  const submitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      email: formData.email,
      fullName: formData.fullName,
      phone: formData.phone,
      shippingAddress: JSON.stringify(formData.addresses[0] || defaultAddress),
      addresses: formData.addresses
    });
  };

  return (
    <UixPageShell mainClassName="uix-customer-page" data-account-flow-a="profile-real-data">
      <section className="uix-customer-hero">
        <div className="uix-profile-identity">
          <span className="uix-profile-avatar" aria-hidden="true">{initials}</span>
          <div>
            <p className="uix-eyebrow">Mi cuenta</p>
            <h1>Bienvenida de vuelta, {displayName.split(' ')[0]}.</h1>
            <p>{formData.email || 'Completa tu correo para recibir seguimiento de pedidos.'}</p>
          </div>
        </div>
        <div className="uix-role-card" data-role={role}>
          <span>Rol actual</span>
          <strong>{role === 'admin' ? 'Administrador' : 'Cliente'}</strong>
          <p>{role === 'admin' ? 'Puedes entrar al panel de operación.' : 'Tienes acceso a perfil, pedidos, wishlist y soporte.'}</p>
          {role === 'admin' && <Link to="/admin" className="uix-action-primary">Abrir admin</Link>}
        </div>
      </section>

      <section className="uix-account-metrics" data-account-flow-a="real-customer-metrics">
        <article><Package size={19} /><span>Pedidos reales</span><strong>{loadingOrders ? '...' : orderCount}</strong></article>
        <article><Truck size={19} /><span>Envíos con rastreo</span><strong>{loadingOrders ? '...' : shippingCount}</strong></article>
        <article><Heart size={19} /><span>Favoritos reales</span><strong>{wishlistCount}</strong></article>
        <article><MapPin size={19} /><span>Direcciones guardadas</span><strong>{formData.addresses.filter(a => a.street || a.city || a.zip).length}</strong></article>
      </section>

      <section className="uix-profile-grid">
        <article className="uix-profile-panel uix-profile-panel--wide" id="pedidos">
          <header><h2>Pedidos recientes</h2><Link to="/my-orders" className="uix-action-secondary">Ver todos</Link></header>
          {loadingOrders ? (
            <UixStatePanel tone="loading" title="Cargando pedidos" description="Consultando tu historial real." />
          ) : recentOrders.length === 0 ? (
            <UixStatePanel tone="empty" title="Aún no tienes pedidos" description="Cuando compres, verás aquí tus pedidos reales y su seguimiento." actionText="Comprar ahora" actionTo="/" />
          ) : (
            <div className="uix-profile-list">
              {recentOrders.map((order: any) => (
                <div className="uix-profile-row" key={order.id}>
                  <div><strong>Pedido #{String(order.id).split('-')[0]}</strong><span>{new Date(order.created_at).toLocaleDateString()}</span></div>
                  <UixStatusBadge status={order.status} />
                  <strong>{formatMoney(order.total)}</strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="uix-profile-panel" id="wishlist">
          <header><h2>Favoritos</h2><Link to="/wishlist" className="uix-action-secondary">Ver wishlist</Link></header>
          {recentWishlist.length === 0 ? (
            <UixStatePanel tone="empty" title="Sin favoritos" description="Guarda productos desde el catálogo para verlos aquí." />
          ) : (
            <div className="uix-profile-list">
              {recentWishlist.map((product: any) => (
                <div className="uix-profile-row" key={product.id}>
                  <div><strong>{product.name}</strong><span>{product.brand || 'Producto guardado'}</span></div>
                  <strong>{formatMoney(product.price)}</strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="uix-profile-panel" id="beneficios">
          <header><h2>Beneficios</h2><Gift size={18} /></header>
          <UixStatePanel tone="empty" title="Beneficios próximamente" description="No mostramos puntos ni cupones estáticos. Esta sección se activará cuando exista data real." />
        </article>

        <article className="uix-profile-panel uix-profile-panel--wide" id="direcciones">
          <header><h2>Direcciones y datos</h2><button type="button" onClick={addAddress} className="uix-action-secondary"><Plus size={15} /> Agregar</button></header>
          <form onSubmit={submitProfile} className="uix-profile-form">
            <div className="uix-profile-form-grid">
              <label><span>Correo electrónico</span><input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} /></label>
              <label><span>Nombre completo</span><input type="text" value={formData.fullName} onChange={e => setFormData(f => ({ ...f, fullName: e.target.value }))} placeholder="Tu nombre" /></label>
              <label><span>Teléfono</span><input type="tel" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} placeholder="+52" /></label>
            </div>
            {formData.addresses.map((address, index) => (
              <div className="uix-profile-address" key={`${address.name}-${index}`}>
                <div className="uix-profile-address-head"><strong>{address.name || 'Dirección'}</strong><button type="button" onClick={() => removeAddress(index)} className="uix-icon-action" aria-label="Eliminar dirección"><Trash2 size={15} /></button></div>
                <div className="uix-profile-form-grid">
                  <label><span>Tipo</span><select value={address.name} onChange={e => updateAddress(index, 'name', e.target.value)}><option>Casa</option><option>Trabajo</option><option>Departamento</option><option>Otra</option></select></label>
                  <label><span>Calle y número</span><input value={address.street} onChange={e => updateAddress(index, 'street', e.target.value)} /></label>
                  <label><span>Ciudad</span><input value={address.city} onChange={e => updateAddress(index, 'city', e.target.value)} /></label>
                  <label><span>Estado</span><input value={address.state} onChange={e => updateAddress(index, 'state', e.target.value)} /></label>
                  <label><span>Código postal</span><input value={address.zip} onChange={e => updateAddress(index, 'zip', e.target.value)} /></label>
                  <label><span>País</span><input value={address.country} onChange={e => updateAddress(index, 'country', e.target.value)} /></label>
                </div>
              </div>
            ))}
            <button type="submit" disabled={updateProfile.isPending} className="uix-action-primary">{updateProfile.isPending ? 'Guardando...' : 'Guardar cambios'}</button>
          </form>
        </article>

        <article className="uix-profile-panel" id="pagos">
          <header><h2>Pagos</h2><CreditCard size={18} /></header>
          <UixStatePanel tone="empty" title="Sin tarjetas guardadas" description="Los pagos se procesan en Stripe. No mostraremos tarjetas ficticias al usuario." />
        </article>

        <article className="uix-profile-panel" id="soporte">
          <header><h2>Soporte</h2><RotateCcw size={18} /></header>
          <p className="uix-muted-copy">Para cambios de envío, devoluciones o dudas de producto, abre un mensaje de soporte. No mezclamos tickets estáticos con datos reales.</p>
          <Link to="/contact" className="uix-action-secondary">Contactar soporte</Link>
        </article>

        <article className="uix-profile-panel" id="notificaciones">
          <header><h2>Notificaciones</h2><Bell size={18} /></header>
          <UixStatePanel tone="empty" title="Sin notificaciones reales" description="Aquí aparecerán avisos reales cuando el sistema los genere." />
        </article>

        <article className="uix-profile-panel" id="seguridad">
          <header><h2>Seguridad y privacidad</h2><ShieldCheck size={18} /></header>
          <p className="uix-muted-copy">Tu cuenta usa sesión protegida por token. Mantendremos esta sección ligada a datos reales, no a placeholders.</p>
        </article>
      </section>
    </UixPageShell>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthSafe } from '../../hooks/useAuthSafe';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../api/useApiClient';
import { toast } from 'react-hot-toast';
import { Bell, CreditCard, Gift, Heart, Home, MapPin, Package, Plus, RotateCcw, ShieldCheck, Sparkles, Ticket, Trash2, Truck, UserRound } from 'lucide-react';
import { EditorialHeader } from '../../components/editorial/EditorialHeader';
import { MobileEditorialNav } from '../../components/editorial/MobileEditorialNav';
import { useCart, CartDrawer } from '../../App';

type ProfileAddress = {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

const defaultAddress: ProfileAddress = { name: 'Casa', street: '', city: '', state: '', zip: '', country: 'México' };

const demoProducts = [
  { name: 'Glow Drops', meta: 'Suero iluminador', price: '$890' },
  { name: 'Daily Oasis', meta: 'Crema hidratante', price: '$790' },
  { name: 'Silk Veil SPF 50', meta: 'Protector solar', price: '$670' },
];

function ProductMiniature({ label }: { label?: string }) {
  return <div className="ss-row-thumb" aria-label={label || 'Producto'} />;
}

export function ProfilePage() {
  const { isSignedIn } = useAuthSafe();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { items, setIsCartOpen } = useCart();
  const cartItemCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.get('/profile'),
    enabled: isSignedIn
  });

  const updateProfile = useMutation({
    mutationFn: (data: any) => apiClient.put('/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Perfil actualizado correctamente');
    },
    onError: () => toast.error('Error al actualizar el perfil')
  });

  const [formData, setFormData] = useState({
    email: '',
    fullNombre: '',
    phone: '',
    addresses: [defaultAddress] as ProfileAddress[]
  });

  React.useEffect(() => {
    if (!profile) return;
    let loadedAddresses: ProfileAddress[] = [];
    try {
      if (profile.addresses) {
        loadedAddresses = typeof profile.addresses === 'string' ? JSON.parse(profile.addresses) : profile.addresses;
      } else if (profile.shipping_address) {
        loadedAddresses = [{ ...defaultAddress, ...JSON.parse(profile.shipping_address) }];
      }
    } catch (_) {
      loadedAddresses = [];
    }
    if (!Array.isArray(loadedAddresses) || loadedAddresses.length === 0) loadedAddresses = [defaultAddress];
    setFormData({
      email: profile.email || '',
      fullNombre: profile.full_name || profile.fullNombre || '',
      phone: profile.phone || '',
      addresses: loadedAddresses
    });
  }, [profile]);

  if (isLoading) {
    return <div className="ss-account-theme flex items-center justify-center">Cargando tu cuenta...</div>;
  }

  const displayName = formData.fullNombre || profile?.full_name || profile?.email?.split('@')[0] || 'Sofía Martínez';
  const initials = displayName.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase() || 'SS';

  const addAddress = () => setFormData(f => ({ ...f, addresses: [...f.addresses, { ...defaultAddress, name: 'Nueva dirección' }] }));
  const removeAddress = (index: number) => setFormData(f => ({ ...f, addresses: f.addresses.filter((_, i) => i !== index) }));
  const updateAddress = (index: number, field: keyof ProfileAddress, value: string) => {
    setFormData(f => {
      const newAddresses = [...f.addresses];
      newAddresses[index] = { ...newAddresses[index], [field]: value };
      return { ...f, addresses: newAddresses };
    });
  };

  const submitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      email: formData.email,
      fullNombre: formData.fullNombre,
      phone: formData.phone,
      addresses: formData.addresses
    });
  };

  return (
    <div className="ss-account-theme">
      <EditorialHeader cartCount={cartItemCount} onCartOpen={() => setIsCartOpen(true)} />

      <main className="ss-account-wrap">
        <div className="ss-account-board">
          <aside className="ss-account-sidebar">
            <div className="ss-account-user">
              <div className="ss-account-avatar">{initials}</div>
              <div>
                <p className="ss-topline">Mi cuenta</p>
                <h1 className="ss-soft-serif text-xl">{displayName}</h1>
                <p className="text-sm text-[var(--ss-soft-muted)]">{formData.email || 'cliente@selfcaresinners.com'}</p>
              </div>
            </div>
            <div className="ss-sinner-card" style={{ minHeight: 118, margin: '.7rem 0 1rem' }}>
              <p className="ss-topline" style={{ color: '#fffaf4' }}>Sinner Club</p>
              <strong style={{ fontSize: '2rem', fontFamily: 'Georgia,serif', fontWeight: 500 }}>1,250 pts</strong>
              <p style={{ fontSize: '.82rem', opacity: .86 }}>750 pts para Sinner Icon</p>
            </div>
            <nav className="ss-account-nav" aria-label="Navegación de cuenta">
              <a className="is-active" href="#resumen"><span><UserRound size={16} /> Resumen</span></a>
              <a href="#pedidos"><span><Package size={16} /> Pedidos</span><span>3</span></a>
              <a href="#direcciones"><span><MapPin size={16} /> Direcciones</span></a>
              <a href="#wishlist"><span><Heart size={16} /> Favoritos</span><span>6</span></a>
              <a href="#rewards"><span><Gift size={16} /> Rewards</span></a>
              <a href="#cupones"><span><Ticket size={16} /> Cupones</span><span>2</span></a>
              <a href="#pagos"><span><CreditCard size={16} /> Métodos de pago</span></a>
              <a href="#soporte"><span><RotateCcw size={16} /> Soporte y devoluciones</span></a>
              <a href="#notificaciones"><span><Bell size={16} /> Notificaciones</span></a>
            </nav>
            <div className="ss-account-promo" style={{ padding: '1rem', marginTop: '1rem' }}>
              <p className="ss-topline">The ritual collection</p>
              <h2 className="ss-soft-serif text-2xl leading-none mt-2">Rutinas que se sienten tan bien como se ven.</h2>
              <Link to="/" className="ss-mini-btn mt-4 inline-flex">Comprar ahora</Link>
            </div>
          </aside>

          <section className="ss-account-main" id="resumen">
            <div className="ss-account-hero">
              <div>
                <p className="ss-topline">Resumen de cuenta</p>
                <h2 className="ss-account-title">Bienvenida de vuelta, {displayName.split(' ')[0]}.</h2>
                <p className="ss-section-note mt-3 max-w-2xl">Aquí se desglosa toda tu experiencia: pedidos, rutinas, recompensas, direcciones, pagos, soporte y preferencias.</p>
              </div>
              <div className="ss-sinner-card">
                <p className="ss-topline" style={{ color: '#fffaf4' }}>Nivel actual</p>
                <strong style={{ fontSize: '2.4rem', fontFamily: 'Georgia,serif', fontWeight: 500 }}>Sinner Glow</strong>
                <p style={{ opacity: .86 }}>Beneficios activos y recompensas disponibles.</p>
              </div>
            </div>

            <div className="ss-account-metrics">
              <div className="ss-account-metric"><Package size={20} /><span>Pedidos</span><strong>3</strong><small>este año</small></div>
              <div className="ss-account-metric"><Truck size={20} /><span>Envíos</span><strong>1</strong><small>en camino</small></div>
              <div className="ss-account-metric"><Sparkles size={20} /><span>Rutina activa</span><strong>Sinner Glow</strong><small>actualizada hoy</small></div>
              <div className="ss-account-metric"><Ticket size={20} /><span>Cupones</span><strong>2</strong><small>disponibles</small></div>
            </div>

            <div className="ss-account-grid">
              <section className="ss-account-panel wide" id="pedidos">
                <div className="ss-account-panel-head"><h2>Pedidos recientes</h2><Link to="/my-orders" className="ss-mini-btn">Ver todos</Link></div>
                <div className="ss-row-list">
                  {['#SS10458', '#SS10392', '#SS10287'].map((order, index) => (
                    <div className="ss-row-item" key={order}>
                      <div className="flex items-center gap-3"><ProductMiniature /><div><strong>{order}</strong><p className="text-sm text-[var(--ss-soft-muted)]">{index === 0 ? '12 Mayo 2025' : index === 1 ? '28 Abril 2025' : '10 Abril 2025'}</p></div></div>
                      <span className={`ss-pill ${index === 0 ? '' : 'warn'}`}>{index === 0 ? 'Entregado' : 'En camino'}</span>
                      <strong>{index === 0 ? '$1,580' : index === 1 ? '$2,340' : '$990'}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="ss-account-panel" id="wishlist">
                <div className="ss-account-panel-head"><h2>Reordenar sugerencias</h2><Link to="/wishlist" className="ss-mini-btn">Ver wishlist</Link></div>
                <div className="ss-row-list">
                  {demoProducts.map(product => <div className="ss-row-item" key={product.name}><div className="flex items-center gap-3"><ProductMiniature /><div><strong>{product.name}</strong><p className="text-sm text-[var(--ss-soft-muted)]">{product.meta}</p></div></div><strong>{product.price}</strong></div>)}
                </div>
              </section>

              <section className="ss-account-panel" id="rewards">
                <div className="ss-account-panel-head"><h2>Rewards</h2><span className="ss-pill">Activo</span></div>
                <p className="ss-topline">Puntos disponibles</p>
                <strong className="ss-soft-serif text-4xl">1,250 pts</strong>
                <div className="h-2 rounded-full bg-[#eadfd5] mt-4 overflow-hidden"><div className="h-full w-[64%] bg-[var(--ss-soft-sage)]" /></div>
                <p className="text-sm text-[var(--ss-soft-muted)] mt-3">Gana puntos por cada compra, reseña y recompra.</p>
              </section>

              <section className="ss-account-panel" id="cupones">
                <div className="ss-account-panel-head"><h2>Cupones</h2><Link to="/" className="ss-mini-btn">Usar</Link></div>
                <div className="ss-row-list">
                  <div className="ss-row-item"><strong>SINNER10</strong><span>10% OFF</span><span className="ss-pill">vigente</span></div>
                  <div className="ss-row-item"><strong>FREESHIP</strong><span>Envío gratis</span><span className="ss-pill">nuevo</span></div>
                </div>
              </section>

              <section className="ss-account-panel wide" id="direcciones">
                <div className="ss-account-panel-head"><h2>Direcciones guardadas</h2><button type="button" onClick={addAddress} className="ss-account-secondary"><Plus size={15} /> Agregar</button></div>
                <form onSubmit={submitProfile} className="grid gap-4">
                  <div className="ss-account-form-grid">
                    <div className="ss-account-field"><label>Correo electrónico</label><input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} /></div>
                    <div className="ss-account-field"><label>Nombre completo</label><input type="text" value={formData.fullNombre} onChange={e => setFormData(f => ({ ...f, fullNombre: e.target.value }))} placeholder="Sofía Martínez" /></div>
                    <div className="ss-account-field"><label>Teléfono</label><input type="tel" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} placeholder="+52 55 1234 5678" /></div>
                  </div>
                  {formData.addresses.map((address, index) => (
                    <div className="ss-account-address" key={`${address.name}-${index}`}>
                      <div className="flex items-center justify-between mb-3"><strong>{address.name || 'Dirección'}</strong><button type="button" onClick={() => removeAddress(index)} className="ss-account-secondary" title="Eliminar dirección"><Trash2 size={15} /></button></div>
                      <div className="ss-account-form-grid">
                        <div className="ss-account-field"><label>Tipo</label><select value={address.name} onChange={e => updateAddress(index, 'name', e.target.value)}><option>Casa</option><option>Trabajo</option><option>Departamento</option><option>Otra</option></select></div>
                        <div className="ss-account-field"><label>Calle y número</label><input value={address.street} onChange={e => updateAddress(index, 'street', e.target.value)} placeholder="Av. Presidente Masaryk 123" /></div>
                        <div className="ss-account-field"><label>Ciudad</label><input value={address.city} onChange={e => updateAddress(index, 'city', e.target.value)} placeholder="Ciudad de México" /></div>
                        <div className="ss-account-field"><label>Estado</label><input value={address.state} onChange={e => updateAddress(index, 'state', e.target.value)} placeholder="CDMX" /></div>
                        <div className="ss-account-field"><label>Código postal</label><input value={address.zip} onChange={e => updateAddress(index, 'zip', e.target.value)} placeholder="11560" /></div>
                        <div className="ss-account-field"><label>País</label><input value={address.country} onChange={e => updateAddress(index, 'country', e.target.value)} placeholder="México" /></div>
                      </div>
                    </div>
                  ))}
                  <button type="submit" disabled={updateProfile.isPending} className="ss-account-action">{updateProfile.isPending ? 'Guardando...' : 'Guardar cambios de cuenta'}</button>
                </form>
              </section>

              <section className="ss-account-panel" id="pagos">
                <div className="ss-account-panel-head"><h2>Métodos de pago</h2><button className="ss-mini-btn">Ver todos</button></div>
                <div className="ss-row-list"><div className="ss-row-item"><CreditCard size={18} /><span>Visa terminada en 4242</span><span className="ss-pill">Principal</span></div><div className="ss-row-item"><CreditCard size={18} /><span>Mastercard terminada en 1111</span></div></div>
              </section>

              <section className="ss-account-panel" id="soporte">
                <div className="ss-account-panel-head"><h2>Soporte</h2><Link to="/contact" className="ss-mini-btn">Nuevo ticket</Link></div>
                <div className="ss-row-list"><div className="ss-row-item"><span>Consulta de ingredientes</span><span className="ss-pill">Respondido</span></div><div className="ss-row-item"><span>Cambio de dirección</span><span className="ss-pill warn">En curso</span></div></div>
              </section>

              <section className="ss-account-panel" id="notificaciones">
                <div className="ss-account-panel-head"><h2>Notificaciones</h2><Bell size={18} /></div>
                <div className="ss-row-list"><div className="ss-row-item"><span>Tu pedido fue entregado.</span><small>Hace 2 días</small></div><div className="ss-row-item"><span>Glow Drops vuelve a estar en stock.</span><small>Hace 1 semana</small></div></div>
              </section>

              <section className="ss-account-panel full">
                <div className="ss-account-panel-head"><h2>Preferencias y seguridad</h2><ShieldCheck size={18} /></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {['Información personal', 'Seguridad y contraseña', 'Preferencias de comunicación', 'Privacidad y datos'].map(item => <div key={item} className="ss-row-item"><span>{item}</span><span>→</span></div>)}
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>

      <MobileEditorialNav cartCount={cartItemCount} onCartOpen={() => setIsCartOpen(true)} />
      <CartDrawer storeId={undefined} themeColor="#2b1d17" buttonColor="#2b1d17" />
    </div>
  );
}

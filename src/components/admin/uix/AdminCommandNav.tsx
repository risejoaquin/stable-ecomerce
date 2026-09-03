import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Package, ShoppingBag, Users, Tag, Settings, Mail, Layers, Sparkles } from 'lucide-react';

const adminNav = [
  { to: '/admin', label: 'Command center', icon: BarChart3, group: 'Operación' },
  { to: '/admin/orders', label: 'Órdenes', icon: ShoppingBag, group: 'Operación' },
  { to: '/admin/customers', label: 'Clientes', icon: Users, group: 'Comercial' },
  { to: '/admin/products', label: 'Productos', icon: Package, group: 'Catálogo' },
  { to: '/admin/categories', label: 'Categorías', icon: Layers, group: 'Catálogo' },
  { to: '/admin/coupons', label: 'Cupones', icon: Tag, group: 'Comercial' },
  { to: '/admin/commercial', label: 'Growth', icon: Sparkles, group: 'Comercial' },
  { to: '/admin/email', label: 'Email Center', icon: Mail, group: 'Sistema' },
  { to: '/admin/settings', label: 'Configuración', icon: Settings, group: 'Sistema' },
];

export function AdminCommandNav() {
  const location = useLocation();
  const groups = adminNav.reduce<Record<string, typeof adminNav>>((acc, item) => {
    acc[item.group] = acc[item.group] || [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <aside className="uix-admin-command-nav" aria-label="Navegación de administración">
      <div className="uix-admin-command-nav__brand">
        <span>SS</span>
        <div>
          <strong>Admin</strong>
          <small>Selfcare Sinners</small>
        </div>
      </div>
      {Object.entries(groups).map(([group, items]) => (
        <nav key={group}>
          <p>{group}</p>
          {items.map(({ to, label, icon: Icon }) => {
            const active = to === '/admin' ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <Link key={to} to={to} className={active ? 'is-active' : ''}>
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      ))}
    </aside>
  );
}

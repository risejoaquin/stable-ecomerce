import { Bell, CreditCard, Heart, LayoutDashboard, MapPin, Package, Settings, TicketPercent, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AccountNavigationLink = {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const accountNavigationLinks: AccountNavigationLink[] = [
  { to: '/profile', label: 'Mi perfil', description: 'Resumen de cuenta', icon: UserRound },
  { to: '/my-orders', label: 'Mis pedidos', description: 'Historial y seguimiento', icon: Package },
  { to: '/wishlist', label: 'Wishlist', description: 'Productos guardados', icon: Heart },
  { to: '/profile#direcciones', label: 'Direcciones', description: 'Envío y facturación', icon: MapPin },
  { to: '/profile#pagos', label: 'Métodos de pago', description: 'Tarjetas guardadas', icon: CreditCard },
  { to: '/profile#rewards', label: 'Rewards / cupones', description: 'Beneficios disponibles', icon: TicketPercent },
  { to: '/profile#notificaciones', label: 'Notificaciones', description: 'Alertas y preferencias', icon: Bell },
  { to: '/profile#configuracion', label: 'Configuración', description: 'Seguridad y privacidad', icon: Settings },
];

export const adminAccountNavigationLink: AccountNavigationLink = {
  to: '/admin',
  label: 'Panel administrador',
  description: 'Operación y catálogo',
  icon: LayoutDashboard,
  adminOnly: true,
};

export function getAccountNavigationLinks(role?: string | null) {
  return role === 'admin'
    ? [adminAccountNavigationLink, ...accountNavigationLinks]
    : accountNavigationLinks;
}

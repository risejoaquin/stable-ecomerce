# URGENT-FLOW-01 — Logout + Account Navigation Discoverability

Cambio urgente previo a continuar el roadmap por macrofases.

## Corrige

- Botón visible de cerrar sesión en desktop.
- Botón visible de cerrar sesión en mobile.
- Menú desplegable de perfil desde el header desktop.
- Bottom sheet de cuenta desde navegación mobile.
- Accesos a perfil, pedidos, wishlist, rewards/cupones, direcciones, pagos, notificaciones y configuración.
- Acceso admin condicionado por `role === 'admin'`.
- Cierre por click fuera, overlay y Escape.

## Validación rápida

```powershell
Unblock-File .\scripts\qa\smoke-urgent-logout-account-navigation.ps1
.\scripts\qa\smoke-urgent-logout-account-navigation.ps1
npm install
npm run build
npm run dev
```

## Commit

```powershell
git add .
git commit -m "Urgent add logout and account navigation menu"
git push origin main
```

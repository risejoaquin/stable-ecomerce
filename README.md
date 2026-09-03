# EMERGENCY-DRY-01 — Route Collision + Centralized Logout

Corrige duplicación crítica antes de continuar roadmap:

- elimina ruta duplicada `POST /api/admin/catalog/validate-import`
- centraliza logout en `src/lib/auth-session.ts`
- hace que Header, MobileNav y AuthMock usen una sola función `logoutUser()`

Validación rápida:

```powershell
Unblock-File .\scripts\qa\smoke-emergency-dry-01.ps1
.\scripts\qa\smoke-emergency-dry-01.ps1
npm install
npm run build
```

---

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

# UIX04.1 — Profile / Account Entrypoint Hotfix

## Problema
El storefront ya usaba el tema Soft Premium Skincare, pero el acceso visual al panel de usuario no era suficientemente claro. El usuario no encontraba el perfil/cuenta desde la navegación principal.

## Corrección
Se agregó un acceso explícito a `Cuenta` en el header desktop/tablet y en la navegación mobile.

## Archivos modificados

- `src/components/editorial/EditorialHeader.tsx`
- `src/components/editorial/MobileEditorialNav.tsx`
- `src/styles/soft-beauty-theme.css`

## Resultado esperado

- En desktop se ve un botón/icono `Cuenta` en el header.
- En mobile se ve `Cuenta` en la navegación inferior.
- El acceso apunta a `/profile`.
- El carrito y wishlist se mantienen visibles.
- No se toca Stripe, Supabase, órdenes, auth ni backend crítico.

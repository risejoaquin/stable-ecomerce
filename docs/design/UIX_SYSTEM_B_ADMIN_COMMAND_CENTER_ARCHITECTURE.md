# UIX SYSTEM B — Admin Command Center Architecture

## Objetivo

Reorganizar el panel de administración para que funcione como un centro operativo real, no como una colección de cards sueltas.

## Jerarquía aplicada

1. Prioridad crítica: alertas, pedidos pendientes, stock bajo y webhooks con error.
2. Indicadores comerciales: ingresos, órdenes, ticket promedio y clientes.
3. Operación diaria: fulfillment, pagos y catálogo.
4. Crecimiento: productos top, cupones y clientes.
5. Sistema: auditoría, email center, configuración y salud operativa.

## Componentes agregados

- `AdminCommandNav`
- `AdminCommandAlert`
- `AdminCommandSection`
- `AdminCommandPanel`
- `AdminCommandMetric`
- `AdminCommandList`
- `AdminCommandListRow`

## Pantallas tocadas

- `src/pages/admin/AdminDashboard.tsx`
- `src/App.tsx`
- `src/styles/uix-soft-premium-system.css`

## Resultado esperado

El admin debe verse como command center premium: lo urgente arriba, métricas agrupadas, navegación clara por operación/catálogo/comercial/sistema y cards legibles en desktop y mobile.

## No toca

- Stripe
- Webhooks existentes
- Supabase contract
- Órdenes críticas
- Auth backend
- Email queue

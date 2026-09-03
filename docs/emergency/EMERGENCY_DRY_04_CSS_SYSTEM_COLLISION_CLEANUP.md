# EMERGENCY-DRY-04 — CSS/System Collision Cleanup

## Objetivo

Reducir colisiones visuales provocadas por múltiples hojas CSS globales activas al mismo tiempo.

## Problema detectado

Antes de este cambio `src/main.tsx` importaba varios sistemas visuales globales:

```txt
premium-storefront.css
checkout-conversion.css
final-visual-polish.css
skoot-editorial-redesign.css
soft-beauty-theme.css
```

Esto hacía que el resultado visual dependiera demasiado del orden de imports y aumentaba el riesgo de:

```txt
CSS collision
visual drift
componentes duplicados
botones con estados inconsistentes
carrito con contraste incorrecto
admin con estilos mezclados
storefront con apariencia parchada
```

## Corrección aplicada

Se creó una única entrada global:

```txt
src/styles/uix-soft-premium-system.css
```

Y `src/main.tsx` ahora importa solo:

```ts
import './styles/uix-soft-premium-system.css';
```

## Decisión técnica

No se eliminaron físicamente los CSS legacy todavía para evitar romper referencias visuales. En su lugar:

1. Se consolidaron en un solo archivo con orden explícito.
2. Se dejó `soft-beauty-theme.css` como última capa base, porque es el tema elegido.
3. Se agregaron overrides canónicos para carrito, account menu, mobile nav, admin y overflow.
4. Se agregó smoke estático para impedir que vuelvan imports globales múltiples.

## Qué no toca

```txt
Stripe
webhooks
órdenes
Supabase
auth
email queue
carrito abandonado
backend crítico
```

## Resultado esperado

```txt
un solo entrypoint CSS global
cascada visual auditable
menos colisiones entre temas
carrito con contraste estable
account/menu con superficies consistentes
admin y storefront con base visual común
```

## Siguiente paso recomendado

Después de DRY-04, continuar con:

```txt
EMERGENCY-DRY-05 — consolidar menú de cuenta y tipos
```
